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
    public function generateFromWorkOrder(WorkOrder $workOrder, array $overrides = []): Invoice
    {
        return DB::transaction(function () use ($workOrder, $overrides) {
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
                'discount_percent' => $overrides['discount_percent'] ?? 0,
                'discount_amount' => 0,
                // Por defecto todo el subtotal cae en gravado 15% (tasa
                // estándar) — exonerado y gravado 18% empiezan en cero y son
                // los únicos montos que el usuario asigna explícitamente.
                'exempt_amount' => $overrides['exempt_amount'] ?? 0,
                'taxed_15_amount' => 0,
                'tax_15_amount' => 0,
                'taxed_18_amount' => $overrides['taxed_18_amount'] ?? 0,
                'tax_18_amount' => 0,
                'tax_percent' => 0,
                'tax_amount' => 0,
                'total' => $workOrder->total,
                'amount_paid' => 0,
                'balance' => $workOrder->total,
                'issued_at' => now(),
            ]);

            // recalculate() aplica descuento/ISV sobre el subtotal y ajusta
            // total/balance en consecuencia — es el único camino que calcula
            // estos montos, nunca se aceptan ya calculados del cliente.
            $invoice->recalculate();

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

    /**
     * Genera el correlativo oficial de facturación autorizado por la SAR
     * (formato Establecimiento-PuntoEmisión-TipoDocumento-Correlativo, ej.
     * 000-001-01-00004540), respetando el rango y la fecha límite configurados
     * en Ajustes. No hay un formato interno alterno: este es el número real
     * de la factura, el mismo que se usaba en el talonario físico.
     */
    private function generateNumber(): string
    {
        $rangeStart = Setting::get('invoice_range_start');
        $rangeEnd = Setting::get('invoice_range_end');

        abort_if(
            ! $rangeStart || ! $rangeEnd,
            422,
            'Debes configurar el rango de facturación autorizado (CAI) en Ajustes antes de generar facturas.'
        );

        $deadline = Setting::get('invoice_deadline');
        if ($deadline && now()->toDateString() > $deadline) {
            abort(422, 'El rango de facturación autorizado venció el ' . \Carbon\Carbon::parse($deadline)->format('d/m/Y') . '. Actualiza el CAI en Ajustes.');
        }

        $startParts = explode('-', $rangeStart);
        $correlativoLength = strlen(end($startParts));
        $prefix = implode('-', array_slice($startParts, 0, -1));
        $startCorrelativo = (int) end($startParts);

        $endParts = explode('-', $rangeEnd);
        $endCorrelativo = (int) end($endParts);

        $nextSetting = Setting::get('invoice_next_correlativo');
        $next = $nextSetting !== '' ? (int) $nextSetting : $startCorrelativo;

        abort_if(
            $next > $endCorrelativo,
            422,
            "Se alcanzó el límite del rango autorizado ({$rangeEnd}). Solicita un nuevo CAI y actualízalo en Ajustes."
        );

        Setting::updateOrCreate(['key' => 'invoice_next_correlativo'], ['value' => (string) ($next + 1)]);

        return $prefix . '-' . str_pad((string) $next, $correlativoLength, '0', STR_PAD_LEFT);
    }
}
