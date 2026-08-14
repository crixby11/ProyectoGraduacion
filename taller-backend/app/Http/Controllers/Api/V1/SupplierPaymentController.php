<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SupplierPayment;
use Illuminate\Http\Request;

class SupplierPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = SupplierPayment::query()
            ->with(['supplier:id,name', 'inventoryMovement:id,inventory_id,quantity', 'inventoryMovement.inventoryItem:id,name', 'user:id,name'])
            ->latest();

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    public function update(Request $request, SupplierPayment $supplierPayment)
    {
        $data = $request->validate([
            'status'       => 'sometimes|required|in:pagado,pendiente',
            'method'       => 'nullable|in:efectivo,transferencia,tarjeta,cheque,otro',
            'payment_date' => 'nullable|date',
            'reference'    => 'nullable|string|max:100',
            'notes'        => 'nullable|string',
        ]);

        $supplierPayment->update($data);

        return response()->json($supplierPayment->load(['supplier:id,name', 'user:id,name']));
    }
}
