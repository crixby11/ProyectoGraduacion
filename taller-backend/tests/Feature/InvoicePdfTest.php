<?php

namespace Tests\Feature;

use App\Services\InvoiceService;
use App\Services\QuoteService;
use App\Services\WorkOrderService;

class InvoicePdfTest extends ApiTestCase
{
    public function test_invoice_records_who_issued_it_and_prints_on_a_half_letter_page(): void
    {
        $this->invoiceSettings();
        $wo = $this->workOrder();
        app(WorkOrderService::class)->addService($wo, ['service_name' => 'Servicio', 'hours' => 1, 'hourly_rate' => 1000]);

        $invoice = app(InvoiceService::class)->generateFromWorkOrder($wo->fresh());

        $this->assertSame($this->user->id, $invoice->issued_by);
        $this->getJson("/api/v1/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('issuer.name', $this->user->name);

        $pdf = $this->get("/api/v1/invoices/{$invoice->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->getContent();

        $this->assertHalfLetter($pdf);
    }

    public function test_quote_includes_the_tax_and_prints_on_half_letter(): void
    {
        $quote = app(QuoteService::class)->create(['customer_name' => 'Cliente', 'description' => 'Revisión']);
        app(QuoteService::class)->addService($quote, ['service_name' => 'Alineación', 'hours' => 1, 'hourly_rate' => 1000]);
        $quote = $quote->fresh();

        $this->assertEquals(150, $quote->tax_15_amount);
        $this->assertEquals(1150, $quote->total);

        $this->assertHalfLetter(
            $this->get("/api/v1/quotes/{$quote->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf')->getContent()
        );

        $html = view('pdfs.quote', ['quote' => $quote->load(['services', 'parts', 'customer', 'employee']), 'settings' => []])->render();
        $this->assertStringContainsString('15% I.S.V.', $html);
        $this->assertStringContainsString('150.00', $html);
        $this->assertStringContainsString('1,150.00', $html);
    }

    public function test_work_order_prints_on_half_letter(): void
    {
        $wo = $this->workOrder();

        $this->assertHalfLetter(
            $this->get("/api/v1/work-orders/{$wo->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf')->getContent()
        );
    }

    public function test_printed_documents_do_not_show_internal_system_numbers(): void
    {
        $this->invoiceSettings();
        $wo = $this->workOrder();
        app(WorkOrderService::class)->addService($wo, ['service_name' => 'Servicio', 'hours' => 1, 'hourly_rate' => 1000]);
        $invoice = app(InvoiceService::class)->generateFromWorkOrder($wo->fresh());
        $quote = app(QuoteService::class)->create(['customer_name' => 'Cliente']);

        // El <title> es metadato del archivo, no se imprime: se revisa solo el cuerpo.
        $body = fn (string $html) => \Illuminate\Support\Str::after($html, '<body>');

        $quoteHtml = $body(view('pdfs.quote', ['quote' => $quote->fresh()->load(['services', 'parts', 'customer', 'employee']), 'settings' => []])->render());
        $woHtml = $body(view('pdfs.work_order', ['wo' => $wo->fresh()->load(['services.employee', 'parts', 'notes.user', 'employee']), 'settings' => []])->render());
        $invoiceHtml = $body(view('pdfs.invoice', ['invoice' => $invoice->load(['workOrder.services', 'workOrder.parts', 'customer', 'payments', 'issuer']), 'settings' => []])->render());

        $this->assertStringNotContainsString($quote->number, $quoteHtml);
        $this->assertStringNotContainsString($wo->number, $woHtml);
        $this->assertStringNotContainsString($wo->number, $invoiceHtml);
        // La factura sí imprime su número fiscal oficial.
        $this->assertStringContainsString($invoice->number, $invoiceHtml);
    }

    /** Media carta: 396 × 612 puntos. */
    private function assertHalfLetter(string $pdf): void
    {
        $this->assertMatchesRegularExpression('/MediaBox\s*\[\s*0(\.0+)?\s+0(\.0+)?\s+396(\.0+)?\s+612(\.0+)?\s*\]/', $pdf);
    }
}
