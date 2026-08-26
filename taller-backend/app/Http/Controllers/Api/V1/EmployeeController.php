<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%$s%")
                  ->orWhere('second_name', 'like', "%$s%")
                  ->orWhere('last_name', 'like', "%$s%")
                  ->orWhere('second_last_name', 'like', "%$s%")
                  ->orWhere('specialty', 'like', "%$s%");
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
            'specialty'        => 'nullable|string|max:100',
            'phone'            => 'nullable|string|max:20',
            'email'            => 'nullable|email|max:150',
            'biweekly_salary'  => 'required|numeric|min:0',
            'notes'            => 'nullable|string',
            'hired_at'         => 'nullable|date',
            'terminated_at'    => 'nullable|date',
        ]);

        if (! empty($data['terminated_at']) && ! empty($data['hired_at']) && Carbon::parse($data['terminated_at'])->lt(Carbon::parse($data['hired_at']))) {
            return response()->json(['message' => 'La fecha de terminación no puede ser anterior a la fecha de contrato'], 422);
        }

        return response()->json(Employee::create($data), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load(['workOrders', 'bonuses.workOrder']));
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'first_name'       => 'sometimes|required|string|max:100',
            'second_name'      => 'nullable|string|max:100',
            'last_name'        => 'sometimes|required|string|max:100',
            'second_last_name' => 'nullable|string|max:100',
            'specialty'        => 'nullable|string|max:100',
            'phone'            => 'nullable|string|max:20',
            'email'            => 'nullable|email|max:150',
            'biweekly_salary'  => 'sometimes|required|numeric|min:0',
            'active'           => 'nullable|boolean',
            'notes'            => 'nullable|string',
            'hired_at'         => 'nullable|date',
            'terminated_at'    => 'nullable|date',
        ]);

        $hiredAt = array_key_exists('hired_at', $data) ? $data['hired_at'] : $employee->hired_at;
        $terminatedAt = array_key_exists('terminated_at', $data) ? $data['terminated_at'] : $employee->terminated_at;

        if ($terminatedAt && $hiredAt && Carbon::parse($terminatedAt)->lt(Carbon::parse($hiredAt))) {
            return response()->json(['message' => 'La fecha de terminación no puede ser anterior a la fecha de contrato'], 422);
        }

        $employee->update($data);

        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return response()->json(['message' => 'Empleado eliminado']);
    }
}
