<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('name', 'like', "%$s%")
                  ->orWhere('description', 'like', "%$s%");
        }

        if ($request->filled('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->orderBy('name')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'estimated_hours' => 'nullable|numeric|min:0',
            'base_price' => 'nullable|numeric|min:0',
        ]);

        return response()->json(Service::create($data), 201);
    }

    public function show(Service $service)
    {
        return response()->json($service);
    }

    public function update(Request $request, Service $service)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'estimated_hours' => 'nullable|numeric|min:0',
            'base_price' => 'nullable|numeric|min:0',
            'active' => 'nullable|boolean',
        ]);

        $service->update($data);

        return response()->json($service);
    }

    public function destroy(Service $service)
    {
        $service->delete();

        return response()->json(['message' => 'Servicio eliminado']);
    }
}
