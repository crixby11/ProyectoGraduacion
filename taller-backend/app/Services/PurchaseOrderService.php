<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\PurchaseOrder;
use App\Models\SupplierPurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderService
{
    /**
     * Crea la orden y todos sus productos en una sola operación atómica.
     * Una vez creada, la orden no admite modificaciones: es un registro
     * permanente de lo que se pidió, con montos e impuestos calculados
     * únicamente a partir de los productos — nunca aceptados como entrada directa.
     *
     * La deuda con el proveedor (SupplierPurchase) se crea aquí mismo, no al
     * recibir — así se puede abonar o pagar por adelantado antes de que llegue
     * la mercadería, sin necesidad de esperar a marcar la orden como recibida.
     */
    public function create(array $data, array $items): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $items) {
            $data['number'] = $this->generateNumber();
            $data['order_date'] ??= now()->toDateString();

            $po = PurchaseOrder::create($data);

            foreach ($items as $item) {
                if (isset($item['inventory_id'])) {
                    $inv = Inventory::find($item['inventory_id']);
                    $item['item_name'] ??= $inv?->name;
                    $item['item_sku'] ??= $inv?->sku;
                    // El empaque de un repuesto existente lo dicta su configuración
                    // en Inventario, no lo que mande el cliente.
                    $item['unit'] = $inv?->unit ?? 'unidad';
                    $item['units_per_pack'] = $inv?->units_per_pack ?? 1;
                } else {
                    $item['unit'] = $item['unit'] ?? 'unidad';
                    $item['units_per_pack'] = Inventory::resolvePackSize($item['unit'], $item['units_per_pack'] ?? null);
                }

                $item['subtotal'] = round(($item['quantity'] * $item['unit_cost']) - ($item['discount'] ?? 0), 2);
                $po->items()->create($item);
            }

            $po->recalculateTotals();

            SupplierPurchase::create([
                'supplier_id' => $po->supplier_id,
                'purchase_order_id' => $po->id,
                'total' => $po->total,
            ])->recalculate();

            return $po->fresh(['items', 'supplierPurchase']);
        });
    }

    public function cancel(PurchaseOrder $po): PurchaseOrder
    {
        abort_if($po->status !== 'pendiente', 422, 'Esta orden ya fue procesada');

        $purchase = $po->supplierPurchase;
        if ($purchase) {
            abort_if($purchase->amount_paid > 0, 422, 'No se puede cancelar una orden con pagos ya registrados');
            $purchase->delete();
        }

        $po->status = 'cancelada';
        $po->save();

        return $po;
    }

    public function receive(PurchaseOrder $purchaseOrder, $user): PurchaseOrder
    {
        return DB::transaction(function () use ($purchaseOrder, $user) {
            $po = PurchaseOrder::lockForUpdate()->findOrFail($purchaseOrder->id);

            abort_if($po->status !== 'pendiente', 422, 'Esta orden ya fue procesada');
            abort_if($po->items()->count() === 0, 422, 'La orden no tiene productos agregados');

            foreach ($po->items as $item) {
                // La orden se compra en empaques (cajas, docenas...); el stock
                // se lleva en unidades sueltas, así que se convierte aquí.
                $packSize = max(1, (int) $item->units_per_pack);
                $looseUnits = $item->quantity * $packSize;
                $costPerUnit = round($item->unit_cost / $packSize, 2);

                if ($item->inventory_id) {
                    $inv = Inventory::lockForUpdate()->findOrFail($item->inventory_id);
                    $stockBefore = $inv->stock;
                    $inv->stock += $looseUnits;
                    $inv->cost = $costPerUnit;
                    $inv->save();
                } else {
                    $inv = Inventory::create([
                        'name' => $item->item_name,
                        'sku' => $item->item_sku,
                        'supplier_id' => $po->supplier_id,
                        'unit' => $item->unit ?: 'unidad',
                        'units_per_pack' => $packSize,
                        'stock' => 0,
                        'min_stock' => 0,
                        'cost' => $costPerUnit,
                        'sale_price' => $costPerUnit,
                        'active' => true,
                    ]);
                    $item->update(['inventory_id' => $inv->id]);
                    $stockBefore = 0;
                    $inv->stock = $looseUnits;
                    $inv->save();
                }

                InventoryMovement::create([
                    'inventory_id' => $inv->id,
                    'purchase_order_id' => $po->id,
                    'user_id' => $user->id,
                    'type' => 'entrada',
                    'quantity' => $looseUnits,
                    'stock_before' => $stockBefore,
                    'stock_after' => $inv->stock,
                    'unit_cost' => $costPerUnit,
                    'reason' => "OC {$po->number}" . ($packSize > 1 ? " ({$item->quantity} × {$packSize})" : ''),
                ]);
            }

            $po->status = 'recibida';
            $po->received_at = now();
            $po->save();

            return $po->fresh(['items', 'supplierPurchase']);
        });
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $last = PurchaseOrder::withTrashed()
            ->where('number', 'like', "OC-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = $last ? ((int) Str::afterLast($last->number, '-')) + 1 : 1;

        return sprintf('OC-%s-%04d', $year, $seq);
    }
}
