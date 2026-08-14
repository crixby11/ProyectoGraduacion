<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SupplierPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierPaymentController extends Controller
{
    public function store(Request $request, SupplierPurchase $supplierPurchase)
    {
        $data = $request->validate([
            'amount'       => 'required|numeric|min:0.01',
            'method'       => 'nullable|in:efectivo,transferencia,tarjeta,cheque,otro',
            'payment_date' => 'required|date',
            'reference'    => 'nullable|string|max:100',
            'notes'        => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data, $supplierPurchase, $request) {
            $purchase = SupplierPurchase::lockForUpdate()->findOrFail($supplierPurchase->id);

            if ($data['amount'] > $purchase->balance) {
                throw ValidationException::withMessages([
                    'amount' => ['El monto supera el saldo pendiente de L ' . number_format($purchase->balance, 2)],
                ]);
            }

            $payment = $purchase->payments()->create(array_merge($data, [
                'user_id' => $request->user()->id,
            ]));

            $purchase->recalculate();

            return response()->json($payment->load('user:id,name'), 201);
        });
    }
}
