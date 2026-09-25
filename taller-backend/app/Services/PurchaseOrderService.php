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
                    $item['unit'] ??= $inv?->unit;
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
                if ($item->inventory_id) {
                    $inv = Inventory::lockForUpdate()->findOrFail($item->inventory_id);
                    $stockBefore = $inv->stock;
                    $inv->stock += $item->quantity;
                    $inv->cost = $item->unit_cost;
                    $inv->save();
                } else {
                    $inv = Inventory::create([
                        'name' => $item->item_name,
                        'sku' => $item->item_sku,
                        'supplier_id' => $po->supplier_id,
                        'unit' => $item->unit ?: 'unidad',
                        'stock' => 0,
                        'min_stock' => 0,
                        'cost' => $item->unit_cost,
                        'sale_price' => $item->unit_cost,
                        'active' => true,
                    ]);
                    $item->update(['inventory_id' => $inv->id]);
                    $stockBefore = 0;
                    $inv->stock = $item->quantity;
                    $inv->save();
                }

                InventoryMovement::create([
                    'inventory_id' => $inv->id,
                    'purchase_order_id' => $po->id,
                    'user_id' => $user->id,
                    'type' => 'entrada',
                    'quantity' => $item->quantity,
                    'stock_before' => $stockBefore,
                    'stock_after' => $inv->stock,
                    'unit_cost' => $item->unit_cost,
                    'reason' => "OC {$po->number}",
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
