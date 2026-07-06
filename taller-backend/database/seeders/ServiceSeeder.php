<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['name' => 'Cambio de aceite y filtro', 'description' => 'Aceite motor y filtro de aceite', 'estimated_hours' => 0.5, 'base_price' => 12000],
            ['name' => 'Alineación y balanceo', 'description' => 'Alineación de dirección y balanceo de ruedas', 'estimated_hours' => 1.0, 'base_price' => 15000],
            ['name' => 'Revisión de frenos', 'description' => 'Inspección y ajuste del sistema de frenos', 'estimated_hours' => 1.5, 'base_price' => 20000],
            ['name' => 'Cambio de pastillas de freno', 'description' => 'Cambio de pastillas delanteras o traseras', 'estimated_hours' => 2.0, 'base_price' => 25000],
            ['name' => 'Diagnóstico computarizado', 'description' => 'Diagnóstico con escáner OBD2', 'estimated_hours' => 1.0, 'base_price' => 10000],
            ['name' => 'Cambio de banda de distribución', 'description' => 'Kit completo de distribución', 'estimated_hours' => 4.0, 'base_price' => 60000],
            ['name' => 'Revisión general', 'description' => 'Inspección completa del vehículo: motor, frenos, suspensión, eléctrica', 'estimated_hours' => 2.0, 'base_price' => 30000],
            ['name' => 'Cambio de bujías', 'description' => 'Juego de bujías según cilindraje', 'estimated_hours' => 1.0, 'base_price' => 18000],
            ['name' => 'Reparación de suspensión', 'description' => 'Rótulas, amortiguadores, muelles', 'estimated_hours' => 3.0, 'base_price' => 45000],
            ['name' => 'Servicio de aire acondicionado', 'description' => 'Limpieza y carga de gas refrigerante', 'estimated_hours' => 1.5, 'base_price' => 35000],
        ];

        foreach ($services as $data) {
            Service::updateOrCreate(['name' => $data['name']], array_merge($data, ['active' => true]));
        }
    }
}
