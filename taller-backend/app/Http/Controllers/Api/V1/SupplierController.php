<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()->withCount('inventory');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('contact_name', 'like', "%$s%")
                  ->orWhere('phone', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%");
            });
        }

        if ($request->filled('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->orderBy('name')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:150',
            'contact_name' => 'nullable|string|max:150',
            'phone'        => 'required|string|max:20',
            'email'        => 'nullable|email|max:150',
            'address'      => 'nullable|string|max:255',
            'rtn'          => 'nullable|string|max:30',
            'notes'        => 'nullable|string',
        ]);

        return response()->json(Supplier::create($data), 201);
    }

    public function show(Supplier $supplier)
    {
        $supplier->loadCount('inventory')->load([
            'inventory' => fn ($q) => $q->select('id', 'name', 'sku', 'category', 'supplier_id', 'stock', 'min_stock', 'active')->orderBy('name'),
            'payments'  => fn ($q) => $q->with('inventoryMovement.inventoryItem:id,name')->latest(),
        ]);

        $supplier->setAttribute('total_paid', (float) $supplier->payments->where('status', 'pagado')->sum('amount'));
        $supplier->setAttribute('total_pending', (float) $supplier->payments->where('status', 'pendiente')->sum('amount'));

        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name'         => 'sometimes|required|string|max:150',
            'contact_name' => 'nullable|string|max:150',
            'phone'        => 'sometimes|required|string|max:20',
            'email'        => 'nullable|email|max:150',
            'address'      => 'nullable|string|max:255',
            'rtn'          => 'nullable|string|max:30',
            'notes'        => 'nullable|string',
            'active'       => 'nullable|boolean',
        ]);

        $supplier->update($data);

        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return response()->json(['message' => 'Proveedor eliminado']);
    }
}
