<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query()->with('vehicles');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%$s%")
                  ->orWhere('second_name', 'like', "%$s%")
                  ->orWhere('last_name', 'like', "%$s%")
                  ->orWhere('second_last_name', 'like', "%$s%")
                  ->orWhere('phone', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%");
            });
        }

        if ($request->filled('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->orderBy('first_name')->orderBy('last_name')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name'       => 'required|string|max:100',
            'second_name'      => 'nullable|string|max:100',
            'last_name'        => 'required|string|max:100',
            'second_last_name' => 'nullable|string|max:100',
            'phone'            => ['required', 'string', 'max:20', Rule::unique('customers', 'phone')->whereNull('deleted_at')],
            'email'            => 'nullable|email|max:150',
            'address'          => 'nullable|string|max:255',
            'id_number'        => 'nullable|string|max:30',
            'notes'            => 'nullable|string',
        ], [
            'phone.required' => 'El teléfono es obligatorio.',
            'phone.unique'   => 'Ya existe un cliente registrado con este teléfono.',
        ]);

        $customer = Customer::create($data);

        return response()->json($customer->load('vehicles'), 201);
    }

    public function show(Customer $customer)
    {
        return response()->json($customer->load(['vehicles', 'workOrders.invoice']));
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'first_name'       => 'sometimes|required|string|max:100',
            'second_name'      => 'nullable|string|max:100',
            'last_name'        => 'sometimes|required|string|max:100',
            'second_last_name' => 'nullable|string|max:100',
            'phone'            => ['sometimes', 'required', 'string', 'max:20', Rule::unique('customers', 'phone')->ignore($customer->id)->whereNull('deleted_at')],
            'email'            => 'nullable|email|max:150',
            'address'          => 'nullable|string|max:255',
            'id_number'        => 'nullable|string|max:30',
            'active'           => 'nullable|boolean',
            'notes'            => 'nullable|string',
        ], [
            'phone.required' => 'El teléfono es obligatorio.',
            'phone.unique'   => 'Ya existe un cliente registrado con este teléfono.',
        ]);

        $customer->update($data);

        return response()->json($customer->load('vehicles'));
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json(['message' => 'Cliente eliminado']);
    }
}
