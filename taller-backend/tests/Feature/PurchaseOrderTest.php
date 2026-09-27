<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\PurchaseOrder;

class PurchaseOrderTest extends ApiTestCase
{
    private function payload(int $supplierId, array $items, array $extra = []): array
    {
        return $extra + ['supplier_id' => $supplierId, 'payment_terms' => 'Contado', 'items' => $items];
    }

    private function newProductLine(array $overrides = []): array
    {
        return $overrides + [
            'item_name' => 'Pastillas nuevas',
            'unit' => 'caja',
            'units_per_pack' => 10,
            'brand' => 'Brembo',
            'category' => 'Frenos',
            'sale_price' => 50,
            'quantity' => 2,
            'unit_cost' => 300,
            'tax_type' => 'gravado_15',
        ];
    }

    public function test_payment_terms_is_required_and_must_be_one_of_the_list(): void
    {
        $s = $this->supplier();
        $line = $this->newProductLine();

        $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [$line], ['payment_terms' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('payment_terms');
        $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [$line], ['payment_terms' => 'Cuando pueda']))
            ->assertStatus(422)->assertJsonValidationErrors('payment_terms');
    }

    public function test_only_products_of_the_orders_supplier_can_be_ordered(): void
    {
        $a = $this->supplier('Proveedor A');
        $b = $this->supplier('Proveedor B');
        $ofB = $this->inventoryItem($b, ['name' => 'Repuesto de B']);

        $this->postJson('/api/v1/purchase-orders', $this->payload($a->id, [
            ['inventory_id' => $ofB->id, 'quantity' => 1, 'unit_cost' => 10, 'tax_type' => 'exento'],
        ]))->assertStatus(422)->assertJsonValidationErrors('items');

        $this->assertSame(0, PurchaseOrder::count());
    }

    public function test_a_products_of_the_same_supplier_is_accepted(): void
    {
        $a = $this->supplier('Proveedor A');
        $item = $this->inventoryItem($a);

        $this->postJson('/api/v1/purchase-orders', $this->payload($a->id, [
            ['inventory_id' => $item->id, 'quantity' => 3, 'unit_cost' => 100, 'tax_type' => 'gravado_15'],
        ]))->assertCreated();
    }

    public function test_new_product_requires_brand_category_and_a_positive_sale_price(): void
    {
        $s = $this->supplier();

        $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [
            $this->newProductLine(['brand' => null, 'category' => null, 'sale_price' => null]),
        ]))->assertStatus(422)->assertJsonValidationErrors(['items.0.brand', 'items.0.category', 'items.0.sale_price']);

        $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [$this->newProductLine(['sale_price' => 0])]))
            ->assertStatus(422)->assertJsonValidationErrors('items.0.sale_price');
    }

    public function test_receiving_converts_packs_to_loose_units_and_updates_cost(): void
    {
        $s = $this->supplier();
        $item = $this->inventoryItem($s, ['unit' => 'caja', 'units_per_pack' => 24, 'stock' => 10, 'cost' => 1]);

        $id = $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [
            ['inventory_id' => $item->id, 'quantity' => 2, 'unit_cost' => 1200, 'tax_type' => 'exento'],
        ]))->assertCreated()->json('id');

        $this->postJson("/api/v1/purchase-orders/{$id}/receive")->assertOk();

        $item->refresh();
        $this->assertSame(58, $item->stock);              // 10 + 2 cajas x 24
        $this->assertEquals(50, $item->cost);              // 1200 / 24 por unidad
        $movement = InventoryMovement::where('inventory_id', $item->id)->first();
        $this->assertSame(48, $movement->quantity);
        $this->assertSame(10, $movement->stock_before);
        $this->assertSame(58, $movement->stock_after);
    }

    public function test_receiving_a_new_product_creates_a_complete_inventory_item(): void
    {
        $s = $this->supplier();

        $id = $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [$this->newProductLine(['min_stock' => 4])]))
            ->assertCreated()->json('id');
        $this->postJson("/api/v1/purchase-orders/{$id}/receive")->assertOk();

        $created = Inventory::where('name', 'Pastillas nuevas')->firstOrFail();
        $this->assertSame('Brembo', $created->brand);
        $this->assertSame('Frenos', $created->category);
        $this->assertSame($s->id, $created->supplier_id);
        $this->assertSame('caja', $created->unit);
        $this->assertSame(10, $created->units_per_pack);
        $this->assertSame(20, $created->stock);            // 2 cajas x 10
        $this->assertSame(4, $created->min_stock);
        $this->assertEquals(30, $created->cost);            // 300 / 10
        $this->assertEquals(50, $created->sale_price);
    }

    public function test_a_received_order_cannot_be_received_twice(): void
    {
        $s = $this->supplier();
        $id = $this->postJson('/api/v1/purchase-orders', $this->payload($s->id, [$this->newProductLine()]))->json('id');

        $this->postJson("/api/v1/purchase-orders/{$id}/receive")->assertOk();
        $this->postJson("/api/v1/purchase-orders/{$id}/receive")->assertStatus(422);
        $this->assertSame(20, Inventory::where('name', 'Pastillas nuevas')->value('stock'));
    }
}
