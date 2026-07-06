<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\WorkOrder;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceService $invoiceService) {}

    public function index(Request $request)
    {
        $query = Invoice::query()->with(['workOrder', 'customer']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('number', 'like', "%$s%")
                  ->orWhereHas('customer', fn($q2) => $q2->where('name', 'like', "%$s%"))
                  ->orWhereHas('workOrder', fn($q2) => $q2->where('number', 'like', "%$s%")
                      ->orWhere('customer_name', 'like', "%$s%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issued_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issued_at', '<=', $request->date_to);
        }

        // Resumen global (sin filtros de paginación, sí con filtros de búsqueda/estado/fecha)
        $summaryQuery = clone $query;
        $summary = $summaryQuery->select(
            DB::raw('COUNT(*) as total_count'),
            DB::raw('SUM(total) as total_amount'),
            DB::raw('SUM(balance) as total_balance'),
            DB::raw('SUM(CASE WHEN status = "pendiente" THEN balance ELSE 0 END) as pending_balance'),
            DB::raw('SUM(CASE WHEN status = "parcial"   THEN balance ELSE 0 END) as partial_balance'),
            DB::raw('SUM(CASE WHEN status IN ("pendiente","parcial") THEN 1 ELSE 0 END) as uncollected_count')
        )->first();

        $paginated = $query->latest('issued_at')->paginate($request->per_page ?? 15);

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => $summary,
        ]));
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['workOrder.services', 'workOrder.parts', 'customer', 'payments']));
    }

    public function generate(WorkOrder $workOrder)
    {
        $invoice = $this->invoiceService->generateFromWorkOrder($workOrder);

        return response()->json($invoice->load(['workOrder', 'customer', 'payments']), 201);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'discount_percent' => 'nullable|numeric|min:0|max:100',
            'tax_percent' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:pendiente,pagada,parcial,anulada',
        ]);

        $invoice->update($data);
        $invoice->recalculate();

        return response()->json($invoice->fresh(['workOrder', 'customer', 'payments']));
    }

    public function pdf(Invoice $invoice)
    {
        return $this->invoiceService->generatePdf($invoice);
    }

    public function whatsappLink(Invoice $invoice)
    {
        $link = $this->invoiceService->whatsappLink($invoice);

        return response()->json(['url' => $link]);
    }
}
