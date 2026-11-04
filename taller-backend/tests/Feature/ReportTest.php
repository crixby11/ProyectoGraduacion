<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\WorkOrder;
use App\Services\InvoiceService;
use App\Services\WorkOrderService;
use App\Support\ReportRange;
use Carbon\Carbon;

class ReportTest extends ApiTestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** OT con un servicio de 1000 y 2 repuestos de inventario (costo 100, venta 150), facturada. */
    private function invoicedWorkOrder(): array
    {
        $this->invoiceSettings();
        $wo = $this->workOrder();
        $service = app(WorkOrderService::class);
        $service->addService($wo, ['service_name' => 'Cambio de aceite', 'hours' => 2, 'hourly_rate' => 500]);
        $item = $this->inventoryItem($this->supplier());
        $service->addPart($wo, ['inventory_id' => $item->id, 'quantity' => 2, 'unit_price' => 150], $this->user);

        $invoice = app(InvoiceService::class)->generateFromWorkOrder($wo->fresh());

        return [$wo->fresh(), $invoice];
    }

    private function pay(Invoice $invoice, float $amount, ?string $date = null): void
    {
        $this->postJson('/api/v1/payments', [
            'invoice_id' => $invoice->id,
            'method' => 'efectivo',
            'amount' => $amount,
            'payment_date' => $date ?? now()->toDateString(),
        ])->assertCreated();
    }

    public function test_this_month_is_compared_with_the_same_elapsed_days_of_last_month(): void
    {
        Carbon::setTestNow('2026-11-03 10:00:00');

        $range = ReportRange::fromInput(['preset' => 'this_month']);

        $this->assertSame('2026-11-01', $range->from->toDateString());
        $this->assertSame('2026-11-30', $range->to->toDateString());
        $this->assertSame('2026-10-01', $range->prevFrom->toDateString());
        $this->assertSame('2026-10-03', $range->prevTo->toDateString());
        $this->assertSame('day', $range->group);
    }

    public function test_this_week_starts_on_monday_and_custom_ranges_compare_with_the_previous_days(): void
    {
        Carbon::setTestNow('2026-11-04 10:00:00'); // miércoles

        $week = ReportRange::fromInput(['preset' => 'this_week']);
        $this->assertSame('2026-11-02', $week->from->toDateString());
        $this->assertSame('2026-10-26', $week->prevFrom->toDateString());
        $this->assertSame('2026-10-28', $week->prevTo->toDateString());

        $custom = ReportRange::fromInput(['preset' => 'custom', 'from' => '2026-10-11', 'to' => '2026-10-20']);
        $this->assertSame('2026-10-01', $custom->prevFrom->toDateString());
        $this->assertSame('2026-10-10', $custom->prevTo->toDateString());
        $this->assertCount(10, $custom->buckets());
    }

    public function test_long_ranges_are_grouped_by_week_or_month(): void
    {
        $this->assertSame('week', ReportRange::fromInput(['preset' => 'last_90'])->group);
        $this->assertSame('month', ReportRange::fromInput(['preset' => 'this_year'])->group);
        $this->assertSame('month', ReportRange::fromInput(['preset' => 'this_year', 'group' => 'month'])->group);
    }

    public function test_custom_range_requires_valid_dates(): void
    {
        $this->getJson('/api/v1/reports/performance?preset=custom')
            ->assertStatus(422)->assertJsonValidationErrors(['from', 'to']);

        $this->getJson('/api/v1/reports/performance?preset=custom&from=2026-10-10&to=2026-10-01')
            ->assertStatus(422)->assertJsonValidationErrors('to');
    }

    public function test_workshop_report_adds_up_payments_invoices_work_orders_and_parts_margin(): void
    {
        [$wo, $invoice] = $this->invoicedWorkOrder();
        $this->pay($invoice, 500);
        app(WorkOrderService::class)->changeStatus($wo, 'entregado');

        $res = $this->getJson('/api/v1/reports/performance?preset=today')->assertOk();

        $res->assertJsonPath('kpis.collected', 500)
            ->assertJsonPath('kpis.invoice_count', 1)
            ->assertJsonPath('kpis.ots_received', 1)
            ->assertJsonPath('kpis.ots_delivered', 1)
            ->assertJsonPath('kpis.parts_sold', 300)
            ->assertJsonPath('kpis.parts_cost', 200)
            ->assertJsonPath('kpis.parts_margin', 100)
            ->assertJsonPath('breakdowns.top_services.0.name', 'Cambio de aceite')
            ->assertJsonPath('breakdowns.payment_methods.0.method', 'efectivo')
            ->assertJsonPath('snapshot.receivables.count', 1);

        $total = (float) $invoice->fresh()->total;
        $this->assertEquals($total, $res->json('kpis.invoiced'));
        $this->assertEquals(round($total - 500, 2), $res->json('kpis.receivable'));
        $this->assertEquals(round($total - 500, 2), $res->json('snapshot.receivables.d0_30'));
        $this->assertCount(1, $res->json('series'));
        $this->assertEquals(500, $res->json('series.0.collected'));
    }

    public function test_payments_from_the_previous_period_are_reported_as_previous(): void
    {
        [, $invoice] = $this->invoicedWorkOrder();
        $this->pay($invoice, 200, now()->subDay()->toDateString());
        $this->pay($invoice, 300);

        $this->getJson('/api/v1/reports/performance?preset=today')
            ->assertOk()
            ->assertJsonPath('kpis.collected', 300)
            ->assertJsonPath('previous.collected', 200);
    }

    public function test_overdue_work_orders_generate_an_insight(): void
    {
        $wo = $this->workOrder();
        $wo->update(['promised_at' => now()->subDays(2)->toDateString()]);

        $res = $this->getJson('/api/v1/reports/performance?preset=this_month')->assertOk();

        $res->assertJsonPath('snapshot.overdue_ots', 1);
        $this->assertTrue(collect($res->json('insights'))->contains(fn ($i) => str_contains($i['text'], 'fecha de entrega prometida')));
    }

    public function test_workshop_report_exports_to_pdf_and_csv(): void
    {
        [$wo, $invoice] = $this->invoicedWorkOrder();
        $this->pay($invoice, 500);
        app(WorkOrderService::class)->changeStatus($wo, 'entregado');

        $this->get('/api/v1/reports/performance/export?preset=this_week&format=pdf')
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        $csv = $this->get('/api/v1/reports/performance/export?preset=custom&from=2026-01-01&to=' . now()->toDateString() . '&format=csv')
            ->assertOk()->streamedContent();
        $this->assertStringContainsString('Comparado con', $csv);
        $this->assertStringContainsString('Cambio de aceite', $csv);
        $this->assertStringContainsString('Facturas con saldo pendiente', $csv);
    }

    public function test_employee_stats_use_the_same_ranges(): void
    {
        $this->getJson('/api/v1/employees/stats?preset=last_7')
            ->assertOk()
            ->assertJsonPath('range.preset', 'last_7')
            ->assertJsonStructure(['range', 'ranking', 'trend']);

        $this->get('/api/v1/employees/stats/export?preset=yesterday&format=csv')->assertOk();
        $this->get('/api/v1/employees/stats/export?preset=yesterday&format=pdf')->assertOk();
    }

    public function test_work_orders_outside_the_range_are_ignored(): void
    {
        $wo = $this->workOrder();
        WorkOrder::whereKey($wo->id)->update(['received_at' => now()->subMonths(3)]);

        $this->getJson('/api/v1/reports/performance?preset=today')
            ->assertOk()
            ->assertJsonPath('kpis.ots_received', 0);
    }
}
