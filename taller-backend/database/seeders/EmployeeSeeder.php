<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['first_name' => 'Carlos', 'last_name' => 'Méndez', 'specialty' => 'Motor y transmisión', 'phone' => '88001122', 'hourly_rate' => 15.00],
            ['first_name' => 'Luis', 'last_name' => 'Rojas', 'specialty' => 'Electricidad automotriz', 'phone' => '88003344', 'hourly_rate' => 14.00],
            ['first_name' => 'Andrés', 'last_name' => 'Vargas', 'specialty' => 'Frenos y suspensión', 'phone' => '88005566', 'hourly_rate' => 13.00],
            ['first_name' => 'Mario', 'last_name' => 'Quesada', 'specialty' => 'Diagnóstico general', 'phone' => '88007788', 'hourly_rate' => 16.00],
            ['first_name' => 'Sofía', 'last_name' => 'Torres', 'specialty' => 'Carrocería y pintura', 'phone' => '88009900', 'hourly_rate' => 12.00],
        ];

        foreach ($employees as $data) {
            Employee::updateOrCreate(['phone' => $data['phone']], array_merge($data, ['active' => true]));
        }
    }
}
