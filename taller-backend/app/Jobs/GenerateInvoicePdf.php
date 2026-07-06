<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class GenerateInvoicePdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Invoice $invoice) {}

    public function handle(InvoiceService $invoiceService): void
    {
        $this->invoice->load(['workOrder.services', 'workOrder.parts', 'customer', 'payments']);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdfs.invoice', ['invoice' => $this->invoice]);

        $path = "invoices/factura-{$this->invoice->number}.pdf";
        Storage::put($path, $pdf->output());

        $this->invoice->update(['pdf_path' => $path]);
    }
}
