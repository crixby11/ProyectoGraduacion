<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // El único usuario garantizado en cualquier entorno es el admin —
        // en producción usa ADMIN_EMAIL/ADMIN_PASSWORD del .env, nunca datos de prueba.
        $this->call([AdminUserSeeder::class]);

        // El resto son datos de ejemplo (empleados, catálogo, clientes, OTs demo)
        // — solo tienen sentido en desarrollo local, nunca en producción real.
        if (app()->environment('local')) {
            $this->call([
                EmployeeSeeder::class,
                ServiceSeeder::class,
                InventorySeeder::class,
                CustomerVehicleSeeder::class,
                DemoDataSeeder::class,
            ]);
        }
    }
}
