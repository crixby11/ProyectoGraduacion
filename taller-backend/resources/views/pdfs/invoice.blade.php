<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $invoice->number }}</title>
    @include('pdfs.partials.doc_style')
    <style>
        .exempt-title { font-size: 6.5pt; font-weight: bold; margin-bottom: 2pt; }
        .exempt-row td { font-size: 5.6pt; padding: 1pt 0; line-height: 1.15; }
        .exempt-row .line { border-bottom: 0.6pt solid #555; width: 42%; }
    </style>
</head>
<body>
@php
    $s = $settings;

    // Solo se imprime el número fiscal (formato SAR 000-001-01-00000000). Los números
    // internos antiguos (FAC-2026-001) no son correlativos autorizados.
    $fiscalNumber = preg_match('/^\d{3}-\d{3}-\d{2}-\d{8}$/', (string) $invoice->number) ? $invoice->number : null;

    $issued = $invoice->issued_at ?? now();
    $wo = $invoice->workOrder;
    $name = $invoice->customer?->name ?? $wo?->customer_name ?? '';
    $rtn = $invoice->customer?->id_number;
    $vehicle = trim(collect([$wo?->vehicle_plate, $wo?->vehicle_brand, $wo?->vehicle_model, $wo?->vehicle_year])->filter()->implode(' '));

    $lines = collect();
    foreach ($wo?->services ?? [] as $svc) {
        $lines->push(['qty' => rtrim(rtrim(number_format($svc->hours, 2), '0'), '.'), 'desc' => $svc->service_name, 'price' => $svc->hourly_rate, 'total' => $svc->subtotal]);
    }
    foreach ($wo?->parts ?? [] as $part) {
        $lines->push(['qty' => $part->quantity, 'desc' => $part->part_name, 'price' => $part->unit_price, 'total' => $part->subtotal]);
    }
    // Filas vacías para completar el cuadro como en el talonario, sin pasar a otra hoja.
    $emptyRows = max(0, 8 - $lines->count());
    $L = fn ($v) => number_format((float) $v, 2);
    $deadline = !empty($s['invoice_deadline']) ? \Carbon\Carbon::parse($s['invoice_deadline'])->format('d/m/Y') : '—';
@endphp

@include('pdfs.partials.doc_header', ['title' => 'FACTURA CONTADO', 'number' => $fiscalNumber, 'date' => $issued])

{{-- Datos fiscales (CAI) --}}
<table class="fiscal">
    <tr>
        <td style="width:46%"><span class="rtn">RTN.: {{ $s['shop_rtn'] ?? '—' }}</span></td>
        <td class="r">FECHA LÍMITE DE EMISIÓN: <b>{{ $deadline }}</b></td>
    </tr>
    <tr>
        <td colspan="2">CAI: <b class="mono">{{ $s['invoice_cai'] ?? '—' }}</b></td>
    </tr>
    <tr>
        <td colspan="2">RANGO AUTORIZADO: <b class="mono">{{ $s['invoice_range_start'] ?? '—' }}</b> / <b class="mono">{{ $s['invoice_range_end'] ?? '—' }}</b></td>
    </tr>
</table>

{{-- Cliente --}}
<table class="client">
    <tr><td class="lbl">CLIENTE:</td><td class="line">{{ $name }}</td></tr>
    <tr><td class="lbl">R.T.N.:</td><td class="line mono">{{ $rtn }}</td></tr>
    @if($vehicle)
    <tr><td></td><td class="extra">Vehículo: {{ $vehicle }}</td></tr>
    @endif
</table>

{{-- Detalle --}}
<table class="items">
    <thead>
        <tr>
            <th style="width:30pt">CANT.</th>
            <th>DESCRIPCIÓN</th>
            <th style="width:54pt">PRECIO<br>UNITARIO</th>
            <th style="width:54pt">DESCUENTOS<br>Y REBAJAS<br>OTORGADOS</th>
            <th style="width:62pt">TOTAL</th>
        </tr>
    </thead>
    <tbody>
        @foreach($lines as $line)
        <tr>
            <td class="c">{{ $line['qty'] }}</td>
            <td>{{ $line['desc'] }}</td>
            <td class="r">{{ $L($line['price']) }}</td>
            <td class="r"></td>
            <td class="r">{{ $L($line['total']) }}</td>
        </tr>
        @endforeach
        @for($i = 0; $i < $emptyRows; $i++)
        <tr><td></td><td></td><td></td><td></td><td></td></tr>
        @endfor
        <tr class="sum">
            <td colspan="2" style="border-left:none"></td>
            <td colspan="2" class="r">TOTAL L.</td>
            <td class="r">{{ $L($invoice->subtotal) }}</td>
        </tr>
    </tbody>
</table>

{{-- Adquirente exonerado y firma | totales --}}
<table class="foot">
    <tr>
        <td class="left-col" style="width:56%">
            <div class="exempt-title">DATOS DEL ADQUIRENTE EXONERADO:</div>
            <table>
                <tr class="exempt-row"><td>Número Correlativo de Orden de Compra Exenta:</td><td class="line"></td></tr>
                <tr class="exempt-row"><td>Número Correlativo Constancia de Registro Exonerado:</td><td class="line"></td></tr>
                <tr class="exempt-row"><td>Número Identificativo del Registro de la Secretaría de Estado en el Despacho de Agricultura y Ganadería:</td><td class="line"></td></tr>
            </table>
            <div class="sig"></div>
            <div class="sig-lbl">FIRMA AUTORIZADA</div>
            <div class="issued">Emitida por: <b>{{ $invoice->issuer?->name ?? '—' }}</b> · {{ $issued->format('d/m/Y h:i A') }}</div>
            <div class="copies">ORIGINAL: CLIENTE / COPIA: OBLIGADO TRIBUTARIO EMISOR</div>
        </td>
        <td>
            <table class="totals">
                @if($invoice->discount_amount > 0)
                <tr><td class="lbl">DESCUENTOS Y REBAJAS</td><td class="cur">L.</td><td class="amt">-{{ $L($invoice->discount_amount) }}</td></tr>
                @endif
                <tr><td class="lbl">SUB-TOTAL EXONERADOS</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->exempt_amount) }}</td></tr>
                <tr><td class="lbl">SUB-TOTAL IMPORTE EXENTO</td><td class="cur">L.</td><td class="amt">{{ $L(0) }}</td></tr>
                <tr><td class="lbl">SUB-TOTAL IMPORTE GRAVADO 15%</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->taxed_15_amount) }}</td></tr>
                <tr><td class="lbl">SUB-TOTAL IMPORTE GRAVADO 18%</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->taxed_18_amount) }}</td></tr>
                <tr><td class="lbl">15% I.S.V.</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->tax_15_amount) }}</td></tr>
                <tr><td class="lbl">18% I.S.V.</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->tax_18_amount) }}</td></tr>
                <tr class="grand"><td class="lbl">TOTAL</td><td class="cur">L.</td><td class="amt">{{ $L($invoice->total) }}</td></tr>
            </table>
        </td>
    </tr>
</table>

{{-- Total en letras --}}
<div class="letters">
    <span class="lbl">Total (Letras):</span>
    {{ \App\Support\NumberToWords::convertLempiras((float) $invoice->total) }}
    @if($invoice->amount_paid > 0 && $invoice->balance > 0)
        <div class="paid">Pagado: <b>L {{ $L($invoice->amount_paid) }}</b> · Saldo pendiente: <b style="color:#b91c1c">L {{ $L($invoice->balance) }}</b></div>
    @endif
</div>

<div class="tagline">LA FACTURA ES BENEFICIO DE TODOS "EXÍJALA"</div>
</body>
</html>
