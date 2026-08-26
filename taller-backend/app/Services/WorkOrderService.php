<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\WorkOrder;
use App\Models\WoPart;
use App\Models\WoService;
use Illuminate\Support\Facades\DB;

class WorkOrderService
{
    public function create(array $data): WorkOrder
    {
        return DB::transaction(function () use ($data) {
            $data['number'] = $this->generateNumber();
            $data['received_at'] ??= now();

            if (isset($data['customer_id']) && ! isset($data['customer_name'])) {
                $customer = \App\Models\Customer::find($data['customer_id']);
                $data['customer_name'] = $customer?->name;
                $data['customer_phone'] = $customer?->phone;
            }

            if (isset($data['vehicle_id']) && ! isset($data['vehicle_plate'])) {
                $vehicle = \App\Models\Vehicle::find($data['vehicle_id']);
                $data['vehicle_plate'] = $vehicle?->plate;
                $data['vehicle_brand'] = $vehicle?->brand;
                $data['vehicle_model'] = $vehicle?->model;
                $data['vehicle_year'] = $vehicle?->year;
                $data['vehicle_color'] = $vehicle?->color;
                $data['vehicle_engine'] = $vehicle?->engine_type;
                $data['vehicle_vin'] = $vehicle?->vin;
                $data['vehicle_displacement'] = $vehicle?->displacement;
                $data['vehicle_description'] = $vehicle?->description;
            }

            return WorkOrder::create($data);
        });
    }

    public function update(WorkOrder $workOrder, array $data): WorkOrder
    {
        $this->assertEditable($workOrder);

        $workOrder->update($data);

        return $workOrder->fresh();
    }

    public function changeStatus(WorkOrder $workOrder, string $status): WorkOrder
    {
        $workOrder->status = $status;

        if ($status === 'entregado') {
            $workOrder->delivered_at = now();
        }

        $workOrder->save();

        return $workOrder;
    }

    public function addService(WorkOrder $workOrder, array $data): WoService
    {
        $this->assertEditable($workOrder);

        return DB::transaction(function () use ($workOrder, $data) {
            $data['subtotal'] = round($data['hours'] * $data['hourly_rate'], 2);
            $woService = $workOrder->services()->create($data);
            $workOrder->recalculateTotals();

            return $woService;
        });
    }

    public function updateService(WorkOrder $workOrder, int $woServiceId, array $data): WoService
    {
        $this->assertEditable($workOrder);

        return DB::transaction(function () use ($workOrder, $woServiceId, $data) {
            $woService = $workOrder->services()->findOrFail($woServiceId);
            $data['subtotal'] = round($data['hours'] * $data['hourly_rate'], 2);
            $woService->update($data);
            $workOrder->recalculateTotals();

            return $woService->fresh();
        });
    }

    public function removeService(WorkOrder $workOrder, int $woServiceId): void
    {
        $this->assertEditable($workOrder);

        DB::transaction(function () use ($workOrder, $woServiceId) {
            $workOrder->services()->findOrFail($woServiceId)->delete();
            $workOrder->recalculateTotals();
        });
    }

    public function addPart(WorkOrder $workOrder, array $data, $user): WoPart
    {
        $this->assertEditable($workOrder);

        return DB::transaction(function () use ($workOrder, $data, $user) {
            $data['subtotal'] = round($data['quantity'] * $data['unit_price'], 2);

            if (isset($data['inventory_id'])) {
                $item = Inventory::lockForUpdate()->findOrFail($data['inventory_id']);

                if ($item->stock < $data['quantity']) {
                    abort(422, "Stock insuficiente para «{$item->name}». Disponible: {$item->stock}");
                }

                $stockBefore = $item->stock;
                $item->stock -= $data['quantity'];
                $item->save();

                InventoryMovement::create([
                    'inventory_id' => $item->id,
                    'work_order_id' => $workOrder->id,
                    'user_id' => $user->id,
                    'type' => 'salida',
                    'quantity' => $data['quantity'],
                    'stock_before' => $stockBefore,
                    'stock_after' => $item->stock,
                    'unit_cost' => $item->cost,
                    'reason' => "OT {$workOrder->number}",
                ]);

                $data['part_name'] ??= $item->name;
                $data['part_sku'] ??= $item->sku;
            }

            $woPart = $workOrder->parts()->create($data);
            $workOrder->recalculateTotals();

            return $woPart;
        });
    }

    public function updatePart(WorkOrder $workOrder, int $woPartId, array $data, $user): WoPart
    {
        $this->assertEditable($workOrder);

        return DB::transaction(function () use ($workOrder, $woPartId, $data, $user) {
            $woPart = $workOrder->parts()->findOrFail($woPartId);
            $newQty = $data['quantity'];
            $oldQty = $woPart->quantity;

            // Ajustar stock si está vinculado a inventario y la cantidad cambia
            if ($woPart->inventory_id && $newQty !== $oldQty) {
                $item = Inventory::lockForUpdate()->findOrFail($woPart->inventory_id);
                $diff = $newQty - $oldQty;

                if ($diff > 0 && $item->stock < $diff) {
                    abort(422, "Stock insuficiente para «{$item->name}». Disponible: {$item->stock}");
                }

                $stockBefore = $item->stock;
                $item->stock -= $diff;
                $item->save();

                InventoryMovement::create([
                    'inventory_id' => $item->id,
                    'work_order_id' => $workOrder->id,
                    'user_id' => $user->id,
                    'type' => $diff > 0 ? 'salida' : 'entrada',
                    'quantity' => abs($diff),
                    'stock_before' => $stockBefore,
                    'stock_after' => $item->stock,
                    'unit_cost' => $item->cost,
                    'reason' => "Ajuste OT {$workOrder->number}",
                ]);
            }

            $data['subtotal'] = round($newQty * $data['unit_price'], 2);
            $woPart->update($data);
            $workOrder->recalculateTotals();

            return $woPart->fresh();
        });
    }

    public function removePart(WorkOrder $workOrder, int $woPartId): void
    {
        $this->assertEditable($workOrder);

        DB::transaction(function () use ($workOrder, $woPartId) {
            $part = $workOrder->parts()->findOrFail($woPartId);

            // Revertir stock si estaba vinculado a inventario
            if ($part->inventory_id) {
                $item = Inventory::find($part->inventory_id);
                if ($item) {
                    $stockBefore = $item->stock;
                    $item->stock += $part->quantity;
                    $item->save();

                    InventoryMovement::create([
                        'inventory_id' => $item->id,
                        'work_order_id' => $workOrder->id,
                        'type' => 'entrada',
                        'quantity' => $part->quantity,
                        'stock_before' => $stockBefore,
                        'stock_after' => $item->stock,
                        'reason' => "Reversión OT {$workOrder->number}",
                    ]);
                }
            }

            $part->delete();
            $workOrder->recalculateTotals();
        });
    }

    /**
     * Una vez se genera la factura, la OT queda como registro fiscal fijo —
     * ya no se pueden alterar sus servicios, repuestos ni datos, para que
     * coincida siempre con lo facturado. El estado (recibido/en_progreso/
     * entregado/etc.) sigue pudiendo avanzar normalmente.
     */
    private function assertEditable(WorkOrder $workOrder): void
    {
        abort_if(
            $workOrder->invoice()->exists(),
            422,
            'No se puede modificar la orden de trabajo porque ya se generó su factura'
        );
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $last = WorkOrder::withTrashed()
            ->where('number', 'like', "OT-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = $last ? (int) substr($last->number, -4) + 1 : 1;

        return sprintf('OT-%s-%04d', $year, $seq);
    }
}
