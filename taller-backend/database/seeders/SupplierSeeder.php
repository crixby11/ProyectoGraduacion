<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['name' => 'Distribuidora de Lubricantes del Norte', 'contact_name' => 'Marta Reyes', 'phone' => '9999-0001', 'email' => 'ventas@lubricantes.example.com', 'rtn' => '08011990000011', 'address' => 'Col. Kennedy, Tegucigalpa'],
            ['name' => 'Repuestos y Frenos Central', 'contact_name' => 'Luis Mendoza', 'phone' => '9999-0002', 'email' => 'pedidos@frenoscentral.example.com', 'rtn' => '08011990000022', 'address' => 'Blvd. Suyapa, Tegucigalpa'],
            ['name' => 'Autopartes Eléctricas y Motor', 'contact_name' => 'Ana Paz', 'phone' => '9999-0003', 'email' => 'contacto@autopartes.example.com', 'rtn' => '08011990000033', 'address' => 'Col. Palmira, Tegucigalpa'],
        ];

        foreach ($suppliers as $data) {
            Supplier::updateOrCreate(['name' => $data['name']], $data + ['active' => true]);
        }
    }
}
