<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Base de las pruebas de API: base de datos limpia en cada prueba (siempre la de pruebas,
 * ver CreatesApplication) y un usuario autenticado con Sanctum.
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    protected function customer(): Customer
    {
        return Customer::create(['first_name' => 'Juan', 'last_name' => 'Pérez', 'phone' => '9999-9999']);
    }

    protected function vehicle(?Customer $customer = null): Vehicle
    {
        return Vehicle::create([
            'customer_id' => ($customer ?? $this->customer())->id,
            'plate' => 'ABC' . random_int(100, 999),
            'brand' => 'Toyota',
            'model' => 'Corolla',
        ]);
    }

    protected function supplier(string $name = 'Repuestos García'): Supplier
    {
        return Supplier::create(['name' => $name, 'contact_name' => 'Contacto', 'phone' => '9999-0000']);
    }

    protected function inventoryItem(Supplier $supplier, array $overrides = []): Inventory
    {
        return Inventory::create($overrides + [
            'name' => 'Filtro de aceite',
            'brand' => 'Bosch',
            'category' => 'Filtros',
            'supplier_id' => $supplier->id,
            'unit' => 'unidad',
            'units_per_pack' => 1,
            'stock' => 10,
            'min_stock' => 2,
            'cost' => 100,
            'sale_price' => 150,
        ]);
    }

    protected function workOrder(): WorkOrder
    {
        $customer = $this->customer();

        return app(WorkOrderService::class)->create([
            'customer_id' => $customer->id,
            'vehicle_id' => $this->vehicle($customer)->id,
            'service_type' => 'Mantenimiento',
            'problem' => 'Prueba',
            'received_at' => now(),
        ])->fresh();
    }

    /** Configuración mínima de facturación (rango CAI autorizado). */
    protected function invoiceSettings(string $next = '1'): void
    {
        foreach ([
            'invoice_range_start' => '000-001-01-00000001',
            'invoice_range_end' => '000-001-01-00001000',
            'invoice_deadline' => now()->addYear()->toDateString(),
            'invoice_next_correlativo' => $next,
        ] as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
