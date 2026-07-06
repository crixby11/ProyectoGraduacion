<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class CustomerVehicleSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'customer' => ['first_name' => 'Juan', 'last_name' => 'Pérez', 'phone' => '70001111', 'email' => 'juan@example.com', 'address' => 'San José, Honduras'],
                'vehicles' => [
                    ['plate' => 'ABC123', 'brand' => 'Toyota', 'model' => 'Corolla', 'year' => 2018, 'color' => 'Blanco', 'engine_type' => '1.8L DOHC', 'displacement' => '1800cc'],
                ],
            ],
            [
                'customer' => ['first_name' => 'María', 'last_name' => 'González', 'phone' => '70002222', 'email' => 'maria@example.com', 'address' => 'Tegucigalpa, Honduras'],
                'vehicles' => [
                    ['plate' => 'DEF456', 'brand' => 'Honda', 'model' => 'Civic', 'year' => 2020, 'color' => 'Gris', 'engine_type' => '1.5L Turbo', 'displacement' => '1500cc'],
                    ['plate' => 'GHI789', 'brand' => 'Hyundai', 'model' => 'Tucson', 'year' => 2019, 'color' => 'Negro', 'engine_type' => '2.0L GDI', 'displacement' => '2000cc'],
                ],
            ],
            [
                'customer' => ['first_name' => 'Roberto', 'last_name' => 'Jiménez', 'phone' => '70003333', 'email' => 'roberto@example.com', 'address' => 'San Pedro Sula, Honduras'],
                'vehicles' => [
                    ['plate' => 'JKL012', 'brand' => 'Suzuki', 'model' => 'Grand Vitara', 'year' => 2016, 'color' => 'Plata', 'engine_type' => '2.4L', 'displacement' => '2400cc'],
                ],
            ],
            [
                'customer' => ['first_name' => 'Ana', 'last_name' => 'Rodríguez', 'phone' => '70004444', 'email' => 'ana@example.com', 'address' => 'La Ceiba, Honduras'],
                'vehicles' => [
                    ['plate' => 'MNO345', 'brand' => 'Kia', 'model' => 'Sportage', 'year' => 2021, 'color' => 'Rojo', 'engine_type' => '2.0L MPI', 'displacement' => '2000cc'],
                ],
            ],
            [
                'customer' => ['first_name' => 'Carlos', 'last_name' => 'Mora', 'phone' => '70005555', 'email' => 'carlos@example.com', 'address' => 'Choluteca, Honduras'],
                'vehicles' => [
                    ['plate' => 'PQR678', 'brand' => 'Nissan', 'model' => 'Frontier', 'year' => 2017, 'color' => 'Azul', 'engine_type' => '2.5L Turbo Diesel', 'displacement' => '2500cc'],
                ],
            ],
        ];

        foreach ($data as $entry) {
            $customer = Customer::updateOrCreate(
                ['phone' => $entry['customer']['phone']],
                $entry['customer']
            );

            foreach ($entry['vehicles'] as $vehicleData) {
                Vehicle::updateOrCreate(
                    ['plate' => $vehicleData['plate']],
                    array_merge($vehicleData, ['customer_id' => $customer->id])
                );
            }
        }
    }
}
