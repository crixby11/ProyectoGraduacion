<?php

namespace Tests\Feature;

use App\Models\Quote;
use App\Services\InvoiceService;
use App\Services\QuoteService;
use App\Services\WorkOrderService;

class PricingAndTaxTest extends ApiTestCase
{
    public function test_work_order_service_price_is_not_multiplied_by_hours(): void
    {
        $wo = $this->workOrder();

        $line = app(WorkOrderService::class)->addService($wo, ['service_name' => 'Cambio de aceite', 'hours' => 3, 'hourly_rate' => 500]);

        $this->assertEquals(500, $line->subtotal);
        $this->assertEquals(500, $wo->fresh()->subtotal_services);
        $this->assertEquals(3, $line->hours);
    }

    public function test_updating_a_work_order_service_keeps_price_as_the_subtotal(): void
    {
        $wo = $this->workOrder();
        $service = app(WorkOrderService::class);
        $line = $service->addService($wo, ['service_name' => 'X', 'hours' => 2, 'hourly_rate' => 100]);

        $updated = $service->updateService($wo->fresh(), $line->id, ['service_name' => 'X', 'hours' => 8, 'hourly_rate' => 250]);

        $this->assertEquals(250, $updated->subtotal);
    }

    private function quoteWithSubtotal(float $service = 1000, float $parts = 1000): Quote
    {
        $service_ = app(QuoteService::class);
        $quote = $service_->create(['customer_id' => $this->customer()->id, 'issued_at' => now()]);
        $service_->addService($quote, ['service_name' => 'S', 'hours' => 2, 'hourly_rate' => $service]);
        $service_->addPart($quote, ['part_name' => 'P', 'quantity' => 1, 'unit_price' => $parts]);

        return $quote->fresh();
    }

    public function test_new_quote_defaults_to_standard_15_percent_isv(): void
    {
        $quote = $this->quoteWithSubtotal(1000, 1000);

        $this->assertSame('estandar', $quote->tax_mode);
        $this->assertEquals(2000, $quote->subtotal);
        $this->assertEquals(2000, $quote->taxed_15_amount);
        $this->assertEquals(300, $quote->tax_15_amount);
        $this->assertEquals(2300, $quote->total);
    }

    public function test_quote_tax_modes_and_discount_apply_before_tax(): void
    {
        $quote = $this->quoteWithSubtotal(1000, 1000);
        $service = app(QuoteService::class);

        $q = $service->update($quote, ['discount_percent' => 10, 'tax_mode' => 'exonerado']);
        $this->assertEquals(200, $q->discount_amount);
        $this->assertEquals(1800, $q->exempt_amount);
        $this->assertEquals(0, $q->tax_amount);
        $this->assertEquals(1800, $q->total);

        $q = $service->update($quote->fresh(), ['discount_percent' => 0, 'tax_mode' => 'gravado_18']);
        $this->assertEquals(360, $q->tax_18_amount);
        $this->assertEquals(2360, $q->total);

        $q = $service->update($quote->fresh(), ['discount_percent' => 10, 'tax_mode' => 'estandar']);
        $this->assertEquals(270, $q->tax_15_amount); // 15% de (2000 - 200)
        $this->assertEquals(2070, $q->total);
    }

    public function test_quote_totals_follow_when_lines_change(): void
    {
        $quote = $this->quoteWithSubtotal(1000, 1000);
        $service = app(QuoteService::class);
        $service->update($quote, ['tax_mode' => 'exonerado']);

        $service->addPart($quote->fresh(), ['part_name' => 'Otro', 'quantity' => 2, 'unit_price' => 500]);

        $this->assertEquals(3000, $quote->fresh()->exempt_amount);
        $this->assertEquals(3000, $quote->fresh()->total);
    }

    public function test_converted_quote_cannot_be_edited(): void
    {
        $quote = $this->quoteWithSubtotal();
        app(QuoteService::class)->changeStatus($quote, 'convertida');

        $this->putJson("/api/v1/quotes/{$quote->id}", ['tax_mode' => 'exonerado'])->assertStatus(422);
    }

    public function test_invoice_applies_isv_and_becomes_immutable_for_its_work_order(): void
    {
        $this->invoiceSettings();
        $wo = $this->workOrder();
        app(WorkOrderService::class)->addService($wo, ['service_name' => 'S', 'hours' => 1, 'hourly_rate' => 1000]);

        $invoice = app(InvoiceService::class)->generateFromWorkOrder($wo->fresh());

        $this->assertEquals(1000, $invoice->taxed_15_amount);
        $this->assertEquals(150, $invoice->tax_15_amount);
        $this->assertEquals(1150, $invoice->total);

        $this->postJson("/api/v1/work-orders/{$wo->id}/services", ['service_name' => 'Tarde', 'hours' => 1, 'hourly_rate' => 10])
            ->assertStatus(422);
    }

    public function test_quote_pdf_always_shows_the_full_tax_breakdown(): void
    {
        $quote = $this->quoteWithSubtotal(1000, 1000);
        $render = fn (Quote $q) => view('pdfs.quote', [
            'quote' => $q->fresh()->load(['services', 'parts', 'customer', 'employee']),
            'settings' => \App\Models\Setting::all_map(),
        ])->render();
        // Monto de una fila de totales: "<td class="lbl">ETIQUETA</td>...<td class="amt">MONTO</td>"
        $amount = function (string $html, string $label) {
            preg_match('/' . preg_quote($label, '/') . '<\/td><td class="cur">L\.<\/td><td class="amt">([^<]+)</', $html, $m);

            return $m[1] ?? null;
        };

        $fmt = fn ($v) => number_format((float) $v, 2);
        $sub = $quote->fresh()->subtotal;
        $this->assertGreaterThan(0, $sub);

        $standard = $render($quote);
        $this->assertSame($fmt($sub), $amount($standard, 'SUB-TOTAL GRAVADO 15%'));
        $this->assertSame($fmt($sub * 0.15), $amount($standard, '15% I.S.V.'));
        $this->assertSame('0.00', $amount($standard, 'SUB-TOTAL EXONERADO'));
        $this->assertSame($fmt($sub * 1.15), $amount($standard, 'TOTAL ESTIMADO'));

        app(QuoteService::class)->update($quote, ['tax_mode' => 'exonerado']);
        $exempt = $render($quote);
        $this->assertSame($fmt($sub), $amount($exempt, 'SUB-TOTAL EXONERADO'));
        $this->assertSame('0.00', $amount($exempt, '15% I.S.V.'));
        $this->assertSame($fmt($sub), $amount($exempt, 'TOTAL ESTIMADO'));
    }
}
