<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización {{ $quote->number }}</title>
    @include('pdfs.partials.doc_style')
</head>
<body>
@php
    $s = $settings;
    $issued = $quote->issued_at ?? $quote->created_at ?? now();
    $name = $quote->customer?->name ?? $quote->customer_name ?? '';
    $phone = $quote->customer?->phone ?? $quote->customer_phone;
    $rtn = $quote->customer?->id_number;
    $vehicle = trim(collect([$quote->vehicle_plate, $quote->vehicle_brand, $quote->vehicle_model, $quote->vehicle_year])->filter()->implode(' '));
    $status = ['pendiente' => 'Pendiente', 'aprobada' => 'Aprobada', 'rechazada' => 'Rechazada', 'convertida' => 'Convertida en OT'][$quote->status] ?? ucfirst($quote->status);
    $L = fn ($v) => number_format((float) $v, 2);
    $emptyRows = max(0, 6 - $quote->services->count() - $quote->parts->count());
    $taxMode = ['estandar' => 'ISV 15%', 'exonerado' => 'Exonerado', 'gravado_18' => 'ISV 18%'][$quote->tax_mode] ?? null;
@endphp

@include('pdfs.partials.doc_header', [
    'title' => 'COTIZACIÓN',
    'date' => $issued,
    'meta' => ['Estado: <b>' . e($status) . '</b>' . ($taxMode ? ' · Impuesto: <b>' . e($taxMode) . '</b>' : '')],
])

@if(!empty($s['shop_rtn']))
<table class="fiscal">
    <tr><td><span class="rtn">RTN.: {{ $s['shop_rtn'] }}</span></td></tr>
</table>
@endif

{{-- Cliente --}}
<table class="client">
    <tr><td class="lbl">CLIENTE:</td><td class="line">{{ $name }}</td></tr>
    <tr><td class="lbl">R.T.N.:</td><td class="line mono">{{ $rtn }}</td></tr>
    <tr><td class="lbl">TELÉFONO:</td><td class="line">{{ $phone }}</td></tr>
    <tr><td class="lbl">VEHÍCULO:</td><td class="line">{{ $vehicle }}</td></tr>
</table>

@if($quote->description)
<div class="box">
    <div class="ttl">TRABAJO A COTIZAR</div>
    <div class="txt">{{ $quote->description }}</div>
</div>
@endif

{{-- Detalle --}}
<table class="items">
    <thead>
        <tr>
            <th style="width:30pt">CANT.</th>
            <th>DESCRIPCIÓN</th>
            <th style="width:58pt">PRECIO<br>UNITARIO</th>
            <th style="width:64pt">TOTAL</th>
        </tr>
    </thead>
    <tbody>
        @if($quote->services->isNotEmpty())
        <tr class="group"><td colspan="4">SERVICIOS / MANO DE OBRA (horas)</td></tr>
        @foreach($quote->services as $svc)
        <tr>
            <td class="c">{{ rtrim(rtrim(number_format($svc->hours, 2), '0'), '.') }}</td>
            <td>{{ $svc->service_name }}</td>
            <td class="r">{{ $L($svc->hourly_rate) }}</td>
            <td class="r">{{ $L($svc->subtotal) }}</td>
        </tr>
        @endforeach
        @endif
        @if($quote->parts->isNotEmpty())
        <tr class="group"><td colspan="4">REPUESTOS Y MATERIALES</td></tr>
        @foreach($quote->parts as $part)
        <tr>
            <td class="c">{{ $part->quantity }}</td>
            <td>{{ $part->part_name }}</td>
            <td class="r">{{ $L($part->unit_price) }}</td>
            <td class="r">{{ $L($part->subtotal) }}</td>
        </tr>
        @endforeach
        @endif
        @for($i = 0; $i < $emptyRows; $i++)
        <tr><td></td><td></td><td></td><td></td></tr>
        @endfor
        <tr class="sum">
            <td colspan="2" style="border-left:none"></td>
            <td class="r">SUBTOTAL L.</td>
            <td class="r">{{ $L($quote->subtotal) }}</td>
        </tr>
    </tbody>
</table>

{{-- Firmas | totales con impuestos --}}
<table class="foot">
    <tr>
        <td class="left-col" style="width:52%">
            <div class="sig" style="margin-top:22pt"></div>
            <div class="sig-lbl">ELABORADO POR (TALLER)</div>
            @if($quote->employee)<div class="issued">{{ $quote->employee->name }}</div>@endif
            <div class="sig" style="margin-top:22pt"></div>
            <div class="sig-lbl">ACEPTADO POR (CLIENTE)</div>
        </td>
        <td>
            <table class="totals">
                <tr><td class="lbl">SERVICIOS</td><td class="cur">L.</td><td class="amt">{{ $L($quote->subtotal_services) }}</td></tr>
                <tr><td class="lbl">REPUESTOS</td><td class="cur">L.</td><td class="amt">{{ $L($quote->subtotal_parts) }}</td></tr>
                @if($quote->discount_amount > 0)
                <tr><td class="lbl">DESCUENTO ({{ rtrim(rtrim(number_format($quote->discount_percent, 2), '0'), '.') }}%)</td><td class="cur">L.</td><td class="amt">-{{ $L($quote->discount_amount) }}</td></tr>
                @endif
                <tr><td class="lbl">SUB-TOTAL EXONERADO</td><td class="cur">L.</td><td class="amt">{{ $L($quote->exempt_amount) }}</td></tr>
                <tr><td class="lbl">SUB-TOTAL GRAVADO 15%</td><td class="cur">L.</td><td class="amt">{{ $L($quote->taxed_15_amount) }}</td></tr>
                <tr><td class="lbl">SUB-TOTAL GRAVADO 18%</td><td class="cur">L.</td><td class="amt">{{ $L($quote->taxed_18_amount) }}</td></tr>
                <tr><td class="lbl">15% I.S.V.</td><td class="cur">L.</td><td class="amt">{{ $L($quote->tax_15_amount) }}</td></tr>
                <tr><td class="lbl">18% I.S.V.</td><td class="cur">L.</td><td class="amt">{{ $L($quote->tax_18_amount) }}</td></tr>
                <tr class="grand"><td class="lbl">TOTAL ESTIMADO</td><td class="cur">L.</td><td class="amt">{{ $L($quote->total) }}</td></tr>
            </table>
        </td>
    </tr>
</table>

<div class="letters">
    <span class="lbl">Total (Letras):</span>
    {{ \App\Support\NumberToWords::convertLempiras((float) $quote->total) }}
</div>

@if($quote->notes)
<div class="box">
    <div class="ttl">NOTAS</div>
    <div class="txt">{{ $quote->notes }}</div>
</div>
@endif

<div class="note">
    Cotización sin validez fiscal. Los montos son estimados y pueden variar según el diagnóstico real del vehículo.
</div>
</body>
</html>
