<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json(Setting::all()->pluck('value', 'key'));
    }

    public function update(Request $request)
    {
        $allowed = [
            'shop_name', 'shop_address', 'shop_phone', 'shop_email', 'shop_rtn', 'shop_city', 'invoice_notes',
            'shop_owner', 'invoice_cai', 'invoice_range_start', 'invoice_range_end',
            'invoice_deadline', 'invoice_next_correlativo',
        ];

        $data = $request->validate([
            'shop_name'     => 'nullable|string|max:150',
            'shop_address'  => 'nullable|string|max:250',
            'shop_phone'    => 'nullable|string|max:30',
            'shop_email'    => 'nullable|email|max:100',
            'shop_rtn'      => 'nullable|string|max:30',
            'shop_city'     => 'nullable|string|max:80',
            'invoice_notes' => 'nullable|string|max:500',
            'shop_owner'    => 'nullable|string|max:150',
            'invoice_cai'   => 'nullable|string|max:60',
            'invoice_range_start' => 'nullable|string|max:20',
            'invoice_range_end'   => 'nullable|string|max:20',
            'invoice_deadline'    => 'nullable|date',
            'invoice_next_correlativo' => 'nullable|integer|min:1',
        ]);

        // El próximo correlativo no puede ser un número ya emitido (causaba facturas duplicadas).
        if (! empty($data['invoice_next_correlativo'])) {
            $rangeStart = $data['invoice_range_start'] ?? Setting::get('invoice_range_start');
            if ($rangeStart) {
                $lastUsed = InvoiceService::lastUsedCorrelativo($rangeStart);
                if ((int) $data['invoice_next_correlativo'] <= $lastUsed) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'invoice_next_correlativo' => ["El próximo correlativo debe ser mayor a {$lastUsed}: ya hay facturas emitidas hasta ese número."],
                    ]);
                }
            }
        }

        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value ?? '']);
            }
        }

        return response()->json(Setting::all()->pluck('value', 'key'));
    }
}