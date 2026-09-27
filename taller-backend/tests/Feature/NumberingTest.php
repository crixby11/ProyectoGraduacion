<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Quote;
use App\Models\WorkOrder;
use App\Services\InvoiceService;
use App\Services\PurchaseOrderService;
use App\Services\QuoteService;
use App\Services\WorkOrderService;

/**
 * Regresión del bug OT-2026--004: los correlativos se leían con substr(-4), y un número
 * viejo de 3 dígitos producía un correlativo negativo.
 */
class NumberingTest extends ApiTestCase
{
    public function test_ot_number_continues_after_a_legacy_three_digit_number(): void
    {
        $c = $this->customer();
        WorkOrder::create(['number' => 'OT-' . now()->year . '-006', 'customer_id' => $c->id]);

        $wo = app(WorkOrderService::class)->create(['customer_id' => $c->id, 'received_at' => now()]);

        $this->assertSame('OT-' . now()->year . '-0007', $wo->number);
    }

    public function test_ot_numbers_are_sequential_with_four_digits(): void
    {
        $first = $this->workOrder();
        $second = $this->workOrder();

        $this->assertSame('OT-' . now()->year . '-0001', $first->number);
        $this->assertSame('OT-' . now()->year . '-0002', $second->number);
    }

    public function test_quote_number_continues_after_a_legacy_three_digit_number(): void
    {
        Quote::create(['number' => 'COT-' . now()->year . '-009']);

        $q = app(QuoteService::class)->create(['issued_at' => now()]);

        $this->assertSame('COT-' . now()->year . '-0010', $q->number);
    }

    public function test_purchase_order_number_continues_after_a_legacy_three_digit_number(): void
    {
        $supplier = $this->supplier();
        PurchaseOrder::create(['number' => 'OC-' . now()->year . '-012', 'supplier_id' => $supplier->id]);

        $po = app(PurchaseOrderService::class)->create(
            ['supplier_id' => $supplier->id, 'payment_terms' => 'Contado'],
            []
        );

        $this->assertSame('OC-' . now()->year . '-0013', $po->number);
    }

    public function test_invoice_number_never_reuses_an_issued_number_even_if_the_counter_is_behind(): void
    {
        $this->invoiceSettings('1');
        $service = app(InvoiceService::class);

        $first = $service->generateFromWorkOrder($this->workOrder());
        $this->assertSame('000-001-01-00000001', $first->number);

        // Alguien deja el contador atrás en Ajustes: antes esto producía "Duplicate entry".
        \App\Models\Setting::updateOrCreate(['key' => 'invoice_next_correlativo'], ['value' => '1']);

        $second = $service->generateFromWorkOrder($this->workOrder());

        $this->assertSame('000-001-01-00000002', $second->number);
        $this->assertSame(2, Invoice::count());
    }

    public function test_settings_reject_a_next_correlative_that_was_already_issued(): void
    {
        $this->invoiceSettings('1');
        app(InvoiceService::class)->generateFromWorkOrder($this->workOrder());

        $this->putJson('/api/v1/settings', ['invoice_next_correlativo' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('invoice_next_correlativo');

        $this->putJson('/api/v1/settings', ['invoice_next_correlativo' => 50])->assertOk();
    }
}
