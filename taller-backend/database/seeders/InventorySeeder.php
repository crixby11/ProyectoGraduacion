<?php

namespace Database\Seeders;

use App\Models\Inventory;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $parts = [
            ['name' => 'Aceite motor 5W-30 1L', 'sku' => 'ACE-5W30-1L', 'brand' => 'Castrol', 'category' => 'Lubricantes', 'stock' => 40, 'min_stock' => 10, 'cost' => 2500, 'sale_price' => 3500],
            ['name' => 'Filtro de aceite Toyota', 'sku' => 'FIL-TOY-001', 'brand' => 'Toyota Genuine', 'category' => 'Filtros', 'stock' => 15, 'min_stock' => 5, 'cost' => 1800, 'sale_price' => 2800],
            ['name' => 'Pastillas de freno delantera Honda', 'sku' => 'PAS-HON-D01', 'brand' => 'Brembo', 'category' => 'Frenos', 'stock' => 8, 'min_stock' => 3, 'cost' => 12000, 'sale_price' => 18000],
            ['name' => 'Banda de distribución Hyundai', 'sku' => 'BAN-HYU-001', 'brand' => 'Gates', 'category' => 'Motor', 'stock' => 4, 'min_stock' => 2, 'cost' => 8000, 'sale_price' => 13000],
            ['name' => 'Bujía NGK iridium', 'sku' => 'BUJ-NGK-IR1', 'brand' => 'NGK', 'category' => 'Encendido', 'stock' => 30, 'min_stock' => 10, 'cost' => 3500, 'sale_price' => 5500],
            ['name' => 'Líquido de frenos DOT4 500ml', 'sku' => 'LIQ-DOT4-500', 'brand' => 'Bosch', 'category' => 'Líquidos', 'stock' => 20, 'min_stock' => 5, 'cost' => 2200, 'sale_price' => 3800],
            ['name' => 'Filtro de aire universal', 'sku' => 'FIL-AIR-UNI', 'brand' => 'K&N', 'category' => 'Filtros', 'stock' => 3, 'min_stock' => 4, 'cost' => 15000, 'sale_price' => 22000],
            ['name' => 'Amortiguador trasero KYB', 'sku' => 'AMO-KYB-T01', 'brand' => 'KYB', 'category' => 'Suspensión', 'stock' => 2, 'min_stock' => 2, 'cost' => 35000, 'sale_price' => 52000],
            ['name' => 'Gas refrigerante R134a 750g', 'sku' => 'GAS-R134-750', 'brand' => 'Dupont', 'category' => 'Aire acondicionado', 'stock' => 10, 'min_stock' => 3, 'cost' => 9000, 'sale_price' => 15000],
            ['name' => 'Rótula inferior Toyota Corolla', 'sku' => 'ROT-TOY-C01', 'brand' => 'Moog', 'category' => 'Suspensión', 'stock' => 6, 'min_stock' => 2, 'cost' => 14000, 'sale_price' => 22000],
        ];

        foreach ($parts as $data) {
            Inventory::updateOrCreate(['sku' => $data['sku']], array_merge($data, ['active' => true]));
        }
    }
}
