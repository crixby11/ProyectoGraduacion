<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::query()->with(['invoice', 'workOrder', 'customer']);

        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        if ($request->filled('work_order_id')) {
            $query->where('work_order_id', $request->work_order_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', $request->date_to);
        }

        if ($request->filled('method')) {
            $query->where('method', $request->method);
        }

        // Totales del período (aplica los mismos filtros, sin paginar)
        $totalsQuery = clone $query;
        $byMethod = $totalsQuery->select('method', DB::raw('SUM(amount) as total'))
            ->groupBy('method')
            ->pluck('total', 'method');

        $grandTotal = $byMethod->sum();

        $paginated = $query->latest('payment_date')->paginate($request->per_page ?? 15);

        return response()->json(array_merge($paginated->toArray(), [
            'summary' => [
                'by_method' => $byMethod,
                'total'     => $grandTotal,
            ],
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'method' => 'required|in:efectivo,transferencia,tarjeta,otro',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $invoice = Invoice::with('workOrder')->findOrFail($data['invoice_id']);

            if ($data['amount'] > $invoice->balance) {
                return response()->json(['message' => 'El monto supera el saldo pendiente'], 422);
            }

            $payment = Payment::create(array_merge($data, [
                'work_order_id' => $invoice->work_order_id,
                'customer_id' => $invoice->customer_id,
                'user_id' => $request->user()->id,
            ]));

            $invoice->recalculate();

            return response()->json($payment->load(['invoice', 'workOrder']), 201);
        });
    }

    public function show(Payment $payment)
    {
        return response()->json($payment->load(['invoice', 'workOrder', 'customer']));
    }

    public function destroy(Payment $payment)
    {
        $invoice = $payment->invoice;
        $payment->delete();
        $invoice->recalculate();

        return response()->json(['message' => 'Pago eliminado']);
    }
}
