<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehicle::query()->with('customer');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('plate', 'like', "%$s%")
                  ->orWhere('brand', 'like', "%$s%")
                  ->orWhere('model', 'like', "%$s%")
                  ->orWhere('vin', 'like', "%$s%")
                  ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%$s%"));
            });
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('brand')) {
            $query->where('brand', 'like', '%' . $request->brand . '%');
        }

        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }

        if ($request->filled('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->orderBy('plate')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'plate' => 'required|string|max:20|unique:vehicles,plate',
            'brand' => 'required|string|max:60',
            'model' => 'required|string|max:60',
            'year' => 'nullable|integer|min:1900|max:2099',
            'color' => 'nullable|string|max:40',
            'engine_type' => 'nullable|string|max:60',
            'vin' => 'nullable|string|max:30|unique:vehicles,vin',
            'displacement' => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ]);

        $vehicle = Vehicle::create($data);

        return response()->json($vehicle->load('customer'), 201);
    }

    public function show(Vehicle $vehicle)
    {
        return response()->json($vehicle->load(['customer', 'workOrders']));
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate([
            'customer_id' => 'sometimes|required|exists:customers,id',
            'plate' => 'sometimes|required|string|max:20|unique:vehicles,plate,' . $vehicle->id,
            'brand' => 'sometimes|required|string|max:60',
            'model' => 'sometimes|required|string|max:60',
            'year' => 'nullable|integer|min:1900|max:2099',
            'color' => 'nullable|string|max:40',
            'engine_type' => 'nullable|string|max:60',
            'vin' => 'nullable|string|max:30|unique:vehicles,vin,' . $vehicle->id,
            'displacement' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'active' => 'nullable|boolean',
        ]);

        $vehicle->update($data);

        return response()->json($vehicle->load('customer'));
    }

    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();

        return response()->json(['message' => 'Vehículo eliminado']);
    }
}
