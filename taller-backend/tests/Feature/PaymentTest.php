<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Payment;
use App\Services\InvoiceService;
use App\Services\WorkOrderService;

class PaymentTest extends ApiTestCase
{
    private function invoiceWithBalance(float $servicePrice = 1000): Invoice
    {
        $this->invoiceSettings();
        $wo = $this->workOrder();
        app(WorkOrderService::class)->addService($wo, ['service_name' => 'Servicio', 'hours' => 1, 'hourly_rate' => $servicePrice]);

        // 15% de ISV sobre el subtotal: balance = precio * 1.15
        return app(InvoiceService::class)->generateFromWorkOrder($wo->fresh());
    }

    private function pay(Invoice $invoice, array $data)
    {
        return $this->postJson('/api/v1/payments', $data + [
            'invoice_id' => $invoice->id,
            'method' => 'efectivo',
            'payment_date' => now()->toDateString(),
        ]);
    }

    public function test_cash_payment_stores_received_amount_and_change_calculated_by_the_server(): void
    {
        $invoice = $this->invoiceWithBalance(1000); // total 1150

        $this->pay($invoice, ['amount' => 500, 'amount_received' => 600])
            ->assertCreated()
            ->assertJsonPath('amount', '500.00')
            ->assertJsonPath('amount_received', '600.00')
            ->assertJsonPath('change_given', '100.00');
    }

    public function test_change_sent_by_the_client_is_ignored(): void
    {
        $invoice = $this->invoiceWithBalance(1000);

        $this->pay($invoice, ['amount' => 500, 'amount_received' => 600, 'change_given' => 9999])
            ->assertCreated()
            ->assertJsonPath('change_given', '100.00');
    }

    public function test_non_cash_payment_does_not_store_received_or_change(): void
    {
        $invoice = $this->invoiceWithBalance(1000);

        $this->pay($invoice, ['method' => 'transferencia', 'amount' => 500, 'amount_received' => 99999])
            ->assertCreated()
            ->assertJsonPath('amount_received', null)
            ->assertJsonPath('change_given', '0.00');
    }

    public function test_cash_received_cannot_be_less_than_the_amount_paid(): void
    {
        $invoice = $this->invoiceWithBalance(1000);

        $this->pay($invoice, ['amount' => 500, 'amount_received' => 400])
            ->assertStatus(422)
            ->assertJsonValidationErrors('amount_received');
        $this->assertSame(0, Payment::count());
    }

    public function test_payment_cannot_exceed_the_invoice_balance(): void
    {
        $invoice = $this->invoiceWithBalance(1000); // saldo 1150

        $this->pay($invoice, ['amount' => 5000])->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_partial_and_full_payments_update_the_invoice_status(): void
    {
        $invoice = $this->invoiceWithBalance(1000);

        $this->pay($invoice, ['amount' => 150])->assertCreated();
        $this->assertSame('parcial', $invoice->fresh()->status);

        $this->pay($invoice, ['amount' => 1000])->assertCreated();
        $this->assertSame('pagada', $invoice->fresh()->status);
        $this->assertEquals(0, $invoice->fresh()->balance);
    }

    public function test_payments_cannot_be_deleted_or_edited_through_the_api(): void
    {
        $invoice = $this->invoiceWithBalance(1000);
        $id = $this->pay($invoice, ['amount' => 100])->json('id');

        $this->deleteJson("/api/v1/payments/{$id}")->assertStatus(405);
        $this->putJson("/api/v1/payments/{$id}", ['amount' => 1])->assertStatus(405);
        $this->assertSame(1, Payment::count());
    }

    public function test_payment_detail_includes_who_registered_it(): void
    {
        $invoice = $this->invoiceWithBalance(1000);
        $id = $this->pay($invoice, ['amount' => 100])->json('id');

        $this->getJson("/api/v1/payments/{$id}")
            ->assertOk()
            ->assertJsonPath('user.id', $this->user->id)
            ->assertJsonPath('invoice.id', $invoice->id);
    }
}
