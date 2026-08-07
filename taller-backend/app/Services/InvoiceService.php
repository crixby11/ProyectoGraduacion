<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Setting;
use App\Models\WorkOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function generateFromWorkOrder(WorkOrder $workOrder): Invoice
    {
        return DB::transaction(function () use ($workOrder) {
            if ($workOrder->invoice) {
                $invoice = $workOrder->invoice;
                $invoice->subtotal_services = $workOrder->subtotal_services;
                $invoice->subtotal_parts = $workOrder->subtotal_parts;
                $invoice->recalculate();

                return $invoice;
            }

            $invoice = Invoice::create([
                'work_order_id' => $workOrder->id,
                'customer_id' => $workOrder->customer_id,
                'number' => $this->generateNumber(),
                'status' => 'pendiente',
                'subtotal_services' => $workOrder->subtotal_services,
                'subtotal_parts' => $workOrder->subtotal_parts,
                'subtotal' => $workOrder->total,
                'discount_percent' => 0,
                'discount_amount' => 0,
                'tax_percent' => 0,
                'tax_amount' => 0,
                'total' => $workOrder->total,
                'amount_paid' => 0,
                'balance' => $workOrder->total,
                'issued_at' => now(),
            ]);

            return $invoice;
        });
    }

    public function generatePdf(Invoice $invoice): Response
    {
        $invoice->load(['workOrder.services', 'workOrder.parts', 'customer', 'payments']);

        $pdf = Pdf::loadView('pdfs.invoice', [
            'invoice' => $invoice,
            'settings' => Setting::all_map(),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("factura-{$invoice->number}.pdf");
    }

    public function whatsappLink(Invoice $invoice): string
    {
        $invoice->load(['workOrder', 'customer']);

        $phone = $invoice->customer?->phone ?? $invoice->workOrder?->customer_phone;
        $phone = preg_replace('/\D/', '', $phone ?? '');

        $message = urlencode(
            "Estimado/a {$invoice->workOrder?->customer_name},\n" .
            "Le informamos que su factura #{$invoice->number} está lista.\n" .
            "Total: L " . number_format($invoice->total, 2) . "\n" .
            "Saldo pendiente: L " . number_format($invoice->balance, 2) . "\n" .
            "Taller Mecánico - Gracias por su preferencia."
        );

        return "https://wa.me/{$phone}?text={$message}";
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $last = Invoice::withTrashed()
            ->where('number', 'like', "FAC-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = $last ? (int) substr($last->number, -4) + 1 : 1;

        return sprintf('FAC-%s-%04d', $year, $seq);
    }
}
