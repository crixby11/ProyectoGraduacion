<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json(Setting::all()->pluck('value', 'key'));
    }

    public function update(Request $request)
    {
        $allowed = ['shop_name', 'shop_address', 'shop_phone', 'shop_email', 'shop_rtn', 'shop_city', 'invoice_notes'];

        $data = $request->validate([
            'shop_name'     => 'nullable|string|max:150',
            'shop_address'  => 'nullable|string|max:250',
            'shop_phone'    => 'nullable|string|max:30',
            'shop_email'    => 'nullable|email|max:100',
            'shop_rtn'      => 'nullable|string|max:30',
            'shop_city'     => 'nullable|string|max:80',
            'invoice_notes' => 'nullable|string|max:500',
        ]);

        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value ?? '']);
            }
        }

        return response()->json(Setting::all()->pluck('value', 'key'));
    }
}