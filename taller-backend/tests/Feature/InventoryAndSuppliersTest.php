<?php

namespace Tests\Feature;

use App\Models\Inventory;

class InventoryAndSuppliersTest extends ApiTestCase
{
    private function itemData(int $supplierId, array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Bujía',
            'brand' => 'NGK',
            'category' => 'Encendido',
            'supplier_id' => $supplierId,
            'unit' => 'unidad',
            'stock' => 5,
            'min_stock' => 2,
            'cost' => 50,
            'sale_price' => 80,
        ];
    }

    public function test_required_fields_are_enforced_when_creating_an_item(): void
    {
        $this->postJson('/api/v1/inventory', ['name' => 'Solo nombre', 'stock' => 1, 'min_stock' => 1, 'cost' => 1, 'sale_price' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['brand', 'category', 'supplier_id', 'unit']);
    }

    public function test_box_and_ristra_need_units_per_pack_but_dozen_is_always_twelve(): void
    {
        $s = $this->supplier();

        $this->postJson('/api/v1/inventory', $this->itemData($s->id, ['unit' => 'caja']))
            ->assertStatus(422)->assertJsonValidationErrors('units_per_pack');

        $this->postJson('/api/v1/inventory', $this->itemData($s->id, ['name' => 'A', 'unit' => 'caja', 'units_per_pack' => 24]))
            ->assertCreated()->assertJsonPath('units_per_pack', 24);

        // El cliente no puede cambiar lo que es una docena
        $this->postJson('/api/v1/inventory', $this->itemData($s->id, ['name' => 'B', 'unit' => 'docena', 'units_per_pack' => 7]))
            ->assertCreated()->assertJsonPath('units_per_pack', 12);
    }

    public function test_unit_must_be_one_of_the_list(): void
    {
        $s = $this->supplier();

        $this->postJson('/api/v1/inventory', $this->itemData($s->id, ['unit' => 'cajón']))
            ->assertStatus(422)->assertJsonValidationErrors('unit');
    }

    public function test_updating_an_item_recalculates_its_pack_size(): void
    {
        $s = $this->supplier();
        $item = $this->inventoryItem($s);

        $this->putJson("/api/v1/inventory/{$item->id}", ['unit' => 'docena'])->assertOk();
        $this->assertSame(12, Inventory::find($item->id)->units_per_pack);
    }

    public function test_supplier_requires_a_name_and_phone(): void
    {
        $this->postJson('/api/v1/suppliers', ['name' => 'Sin teléfono'])
            ->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->postJson('/api/v1/suppliers', ['name' => 'Con teléfono', 'phone' => '9999-0000'])->assertCreated();
    }

    public function test_duplicate_supplier_names_and_rtn_are_rejected_ignoring_case_and_accents(): void
    {
        $this->postJson('/api/v1/suppliers', ['name' => 'Repuestos García', 'phone' => '9999-0000', 'rtn' => '08011999123456'])->assertCreated();

        $this->postJson('/api/v1/suppliers', ['name' => 'repuestos garcia', 'phone' => '9999-0001'])
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->postJson('/api/v1/suppliers', ['name' => 'Otro proveedor', 'phone' => '9999-0002', 'rtn' => '08011999123456'])
            ->assertStatus(422)->assertJsonValidationErrors('rtn');
        $this->postJson('/api/v1/suppliers', ['name' => 'Otro proveedor', 'phone' => '9999-0002'])->assertCreated();
    }

    public function test_editing_a_supplier_without_changing_its_name_is_allowed(): void
    {
        $s = $this->supplier('Autopartes Sur');

        $this->putJson("/api/v1/suppliers/{$s->id}", ['name' => 'Autopartes Sur', 'phone' => '9999-1111'])->assertOk();
        $this->putJson("/api/v1/suppliers/{$s->id}", ['active' => false])->assertOk();
    }
}
