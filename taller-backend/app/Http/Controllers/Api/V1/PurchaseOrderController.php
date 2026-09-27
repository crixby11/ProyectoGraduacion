<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseOrderService $purchaseOrderService) {}

    public function index(Request $request)
    {
        $query = PurchaseOrder::query()->with(['supplier']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('number', 'like', "%$s%")
                  ->orWhere('supplier_invoice_number', 'like', "%$s%")
                  ->orWhereHas('supplier', fn ($q2) => $q2->where('name', 'like', "%$s%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('order_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('order_date', '<=', $request->date_to);
        }

        return response()->json($query->latest('order_date')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'supplier_invoice_number' => 'nullable|string|max:60',
            'payment_terms' => 'required|in:Contado,Crédito 15 días,Crédito 30 días,Crédito 45 días,Crédito 60 días',
            'order_date' => 'nullable|date',
            'notes' => 'nullable|string',

            'items' => 'required|array|min:1',
            'items.*.inventory_id' => 'nullable|exists:inventory,id',
            'items.*.item_name' => 'required_without:items.*.inventory_id|string|max:150',
            'items.*.item_sku' => 'nullable|string|max:60',
            // Un producto nuevo (sin inventory_id) se crea en Inventario al recibir la
            // orden, así que debe traer los mismos datos obligatorios que Inventario.
            'items.*.brand' => 'required_without:items.*.inventory_id|nullable|string|max:60',
            'items.*.category' => 'required_without:items.*.inventory_id|nullable|string|max:80',
            'items.*.sale_price' => 'required_without:items.*.inventory_id|nullable|numeric|gt:0',
            'items.*.min_stock' => 'nullable|integer|min:0',
            'items.*.unit' => ['required_without:items.*.inventory_id', 'nullable', Rule::in(Inventory::unitKeys())],
            'items.*.units_per_pack' => 'nullable|integer|min:1|max:100000',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax_type' => 'required|in:exento,gravado_15,gravado_18',
        ]);

        $items = $data['items'];
        unset($data['items']);

        // Un proveedor tiene sus propios repuestos: solo se pueden comprar los de este proveedor
        // (un repuesto de otro proveedor se cambia desde su ficha en Inventario).
        $foreign = Inventory::whereIn('id', collect($items)->pluck('inventory_id')->filter())
            ->where(fn ($q) => $q->where('supplier_id', '!=', $data['supplier_id'])->orWhereNull('supplier_id'))
            ->pluck('name');
        if ($foreign->isNotEmpty()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'items' => ['Estos repuestos no pertenecen al proveedor de la orden: ' . $foreign->implode(', ')],
            ]);
        }

        $po = $this->purchaseOrderService->create($data, $items);

        return response()->json($po->load(['supplier', 'items', 'supplierPurchase']), 201);
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return response()->json(
            $purchaseOrder->load(['supplier', 'items.inventoryItem:id,name', 'supplierPurchase.payments.user:id,name', 'files'])
        );
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->delete();

        return response()->json(['message' => 'Orden de compra eliminada']);
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        $po = $this->purchaseOrderService->receive($purchaseOrder, $request->user());

        return response()->json($po);
    }

    public function cancel(PurchaseOrder $purchaseOrder)
    {
        $po = $this->purchaseOrderService->cancel($purchaseOrder);

        return response()->json($po);
    }
}
