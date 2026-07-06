<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeBonusController extends Controller
{
    public function store(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'work_order_id' => 'nullable|exists:work_orders,id',
            'amount'        => 'required|numeric|min:0.01',
            'description'   => 'nullable|string|max:255',
            'bonus_month'   => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        // Guardar siempre el primer día del mes
        $data['bonus_month'] = $data['bonus_month'] . '-01';

        $bonus = $employee->bonuses()->create($data);

        return response()->json($bonus->load('workOrder'), 201);
    }

    public function update(Request $request, Employee $employee, $bonusId)
    {
        $bonus = $employee->bonuses()->findOrFail($bonusId);

        $data = $request->validate([
            'work_order_id' => 'nullable|exists:work_orders,id',
            'amount'        => 'sometimes|required|numeric|min:0.01',
            'description'   => 'nullable|string|max:255',
            'bonus_month'   => ['sometimes', 'required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        if (isset($data['bonus_month'])) {
            $data['bonus_month'] = $data['bonus_month'] . '-01';
        }

        $bonus->update($data);

        return response()->json($bonus->load('workOrder'));
    }
}
