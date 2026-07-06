<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['first_name' => 'Carlos', 'last_name' => 'Méndez', 'specialty' => 'Motor y transmisión',  'phone' => '88001122', 'biweekly_salary' => 9000.00],
            ['first_name' => 'Luis',   'last_name' => 'Rojas',  'specialty' => 'Electricidad automotriz', 'phone' => '88003344', 'biweekly_salary' => 8500.00],
            ['first_name' => 'Andrés', 'last_name' => 'Vargas', 'specialty' => 'Frenos y suspensión',  'phone' => '88005566', 'biweekly_salary' => 8000.00],
            ['first_name' => 'Mario',  'last_name' => 'Quesada','specialty' => 'Diagnóstico general',   'phone' => '88007788', 'biweekly_salary' => 9500.00],
            ['first_name' => 'Sofía',  'last_name' => 'Torres', 'specialty' => 'Carrocería y pintura',  'phone' => '88009900', 'biweekly_salary' => 7500.00],
        ];

        foreach ($employees as $data) {
            Employee::updateOrCreate(['phone' => $data['phone']], array_merge($data, ['active' => true]));
        }
    }
}
