<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventory::query()->with('supplier:id,name');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('sku', 'like', "%$s%")
                  ->orWhere('brand', 'like', "%$s%")
                  ->orWhere('category', 'like', "%$s%");
            });
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock', '<=', 'min_stock');
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->has('active') && $request->input('active') !== '') {
            $query->where('active', $request->boolean('active'));
        }

        return response()->json($query->orderBy('name')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'sku' => 'nullable|string|max:60|unique:inventory,sku',
            'brand' => 'nullable|string|max:60',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'category' => 'nullable|string|max:80',
            'description' => 'nullable|string',
            'stock' => 'required|integer|min:0',
            'min_stock' => 'required|integer|min:0',
            'cost' => 'required|numeric|min:0',
            'sale_price' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        return response()->json(Inventory::create($data), 201);
    }

    public function show(Inventory $inventory)
    {
        return response()->json($inventory->load(['movements', 'supplier']));
    }

    public function update(Request $request, Inventory $inventory)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'sku' => 'nullable|string|max:60|unique:inventory,sku,' . $inventory->id,
            'brand' => 'nullable|string|max:60',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'category' => 'nullable|string|max:80',
            'description' => 'nullable|string',
            'min_stock' => 'nullable|integer|min:0',
            'cost' => 'nullable|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $inventory->update($data);

        return response()->json($inventory);
    }

    public function destroy(Inventory $inventory)
    {
        $inventory->delete();

        return response()->json(['message' => 'Repuesto eliminado']);
    }

    public function adjust(Request $request, Inventory $inventory)
    {
        $data = $request->validate([
            'type' => 'required|in:entrada,salida',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:150',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'record_payment'    => 'nullable|boolean',
            'purchase_total'    => 'required_if:record_payment,true|numeric|min:0.01',
            'payment_amount'    => 'nullable|numeric|min:0',
            'payment_method'    => 'nullable|in:efectivo,transferencia,tarjeta,cheque,otro',
            'payment_date'      => 'nullable|date',
            'payment_reference' => 'nullable|string|max:100',
        ]);

        if (($data['record_payment'] ?? false) && ! $inventory->supplier_id) {
            return response()->json(['message' => 'Este repuesto no tiene un proveedor asignado'], 422);
        }

        if (($data['payment_amount'] ?? 0) > ($data['purchase_total'] ?? 0)) {
            return response()->json(['message' => 'El monto a pagar no puede superar el total de la compra'], 422);
        }

        return DB::transaction(function () use ($data, $inventory, $request) {
            $stockBefore = $inventory->stock;

            if ($data['type'] === 'salida' && $inventory->stock < $data['quantity']) {
                return response()->json(['message' => 'Stock insuficiente'], 422);
            }

            $inventory->stock = $data['type'] === 'entrada'
                ? $inventory->stock + $data['quantity']
                : $inventory->stock - $data['quantity'];
            $inventory->save();

            $movement = InventoryMovement::create([
                'inventory_id' => $inventory->id,
                'user_id' => $request->user()->id,
                'type' => $data['type'],
                'quantity' => $data['quantity'],
                'stock_before' => $stockBefore,
                'stock_after' => $inventory->stock,
                'unit_cost' => $data['unit_cost'] ?? null,
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $purchase = null;
            if ($data['record_payment'] ?? false) {
                $purchase = \App\Models\SupplierPurchase::create([
                    'supplier_id'           => $inventory->supplier_id,
                    'inventory_movement_id' => $movement->id,
                    'total'                 => $data['purchase_total'],
                ]);

                if (($data['payment_amount'] ?? 0) > 0) {
                    $purchase->payments()->create([
                        'user_id'      => $request->user()->id,
                        'amount'       => $data['payment_amount'],
                        'method'       => $data['payment_method'] ?? null,
                        'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                        'reference'    => $data['payment_reference'] ?? null,
                    ]);
                }

                $purchase->recalculate();
            }

            return response()->json([
                'inventory' => $inventory,
                'movement' => $movement,
                'purchase' => $purchase,
            ]);
        });
    }

    public function movements(Request $request, Inventory $inventory)
    {
        return response()->json(
            $inventory->movements()->with('user')->latest()->paginate($request->per_page ?? 20)
        );
    }

    public function lowStock()
    {
        $items = Inventory::whereColumn('stock', '<=', 'min_stock')
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return response()->json($items);
    }

    public function categories()
    {
        $categories = Inventory::select('category')
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json($categories);
    }
}
