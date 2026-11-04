<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>OT {{ $wo->number }}</title>
    @include('pdfs.partials.doc_style')
    <style>
        .log-item { padding: 2pt 6pt; border-bottom: 0.5pt dashed #bbb; }
        .log-item:last-child { border-bottom: none; }
        .log-meta { font-size: 6pt; color: #555; }
    </style>
</head>
<body>
@php
    $s = $settings;
    $received = $wo->received_at ?? $wo->created_at ?? now();
    $statusLabel = [
        'recibido' => 'Recibido', 'diagnostico' => 'En diagnóstico', 'en_progreso' => 'En progreso',
        'listo' => 'Listo para entregar', 'entregado' => 'Entregado', 'cancelado' => 'Cancelado',
    ][$wo->status] ?? $wo->status;
    $vehicle = trim(collect([$wo->vehicle_plate, $wo->vehicle_brand, $wo->vehicle_model, $wo->vehicle_year])->filter()->implode(' '));
    $vehicleExtra = collect([
        $wo->vehicle_color ? 'Color: ' . $wo->vehicle_color : null,
        $wo->vehicle_vin ? 'VIN: ' . $wo->vehicle_vin : null,
    ])->filter()->implode(' · ');
    $L = fn ($v) => number_format((float) $v, 2);
    $emptyRows = max(0, 5 - $wo->services->count() - $wo->parts->count());

    $meta = ['Recibido: <b>' . e($received->format('h:i A')) . '</b> · Estado: <b>' . e($statusLabel) . '</b>'];
    $meta[] = $wo->delivered_at
        ? 'Entregado: <b>' . e($wo->delivered_at->format('d/m/Y h:i A')) . '</b>'
        : 'Entrega prometida: <b>' . e($wo->promised_at?->format('d/m/Y') ?? '—') . '</b>';
@endphp

@include('pdfs.partials.doc_header', [
    'title' => 'ORDEN DE TRABAJO',
    'date' => $received,
    'dateLabel' => 'FECHA DE RECEPCIÓN',
    'meta' => $meta,
])

{{-- Cliente y vehículo --}}
<table class="client">
    <tr><td class="lbl">CLIENTE:</td><td class="line">{{ $wo->customer_name }}</td></tr>
    <tr><td class="lbl">TELÉFONO:</td><td class="line">{{ $wo->customer_phone }}</td></tr>
    <tr><td class="lbl">VEHÍCULO:</td><td class="line">{{ $vehicle }}</td></tr>
    @if($vehicleExtra)<tr><td></td><td class="extra">{{ $vehicleExtra }}</td></tr>@endif
    <tr><td class="lbl">TÉCNICO:</td><td class="line">{{ $wo->employee?->name ?? 'Sin asignar' }}</td></tr>
</table>

@php
    $sections = array_filter([
        'Problema reportado' => $wo->problem,
        'Diagnóstico' => $wo->inspection,
        'Solución aplicada' => $wo->solution,
        'Pendientes' => $wo->comments,
    ]);
@endphp
@if($sections)
<table class="client">
    @foreach($sections as $title => $text)
    <tr>
        <td class="lbl" style="width:70pt">{{ mb_strtoupper($title, 'UTF-8') }}:</td>
        <td class="line" style="white-space:pre-wrap">{{ $text }}</td>
    </tr>
    @endforeach
</table>
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
        @if($wo->services->isNotEmpty())
        <tr class="group"><td colspan="4">SERVICIOS / MANO DE OBRA (horas)</td></tr>
        @foreach($wo->services as $svc)
        <tr>
            <td class="c">{{ rtrim(rtrim(number_format($svc->hours, 2), '0'), '.') }}</td>
            <td>{{ $svc->service_name }}@if($svc->employee)<br><span class="sub">Técnico: {{ $svc->employee->name }}</span>@endif</td>
            <td class="r">{{ $L($svc->hourly_rate) }}</td>
            <td class="r">{{ $L($svc->subtotal) }}</td>
        </tr>
        @endforeach
        @endif
        @if($wo->parts->isNotEmpty())
        <tr class="group"><td colspan="4">REPUESTOS Y MATERIALES</td></tr>
        @foreach($wo->parts as $part)
        <tr>
            <td class="c">{{ $part->quantity }}</td>
            <td>{{ $part->part_name }}@if($part->part_sku)<br><span class="sub">SKU: {{ $part->part_sku }}</span>@endif</td>
            <td class="r">{{ $L($part->unit_price) }}</td>
            <td class="r">{{ $L($part->subtotal) }}</td>
        </tr>
        @endforeach
        @endif
        @for($i = 0; $i < $emptyRows; $i++)
        <tr><td></td><td></td><td></td><td></td></tr>
        @endfor
    </tbody>
</table>

{{-- Firmas | totales --}}
<table class="foot">
    <tr>
        <td class="left-col" style="width:52%">
            <div class="sig" style="margin-top:14pt"></div>
            <div class="sig-lbl">TÉCNICO RESPONSABLE</div>
            <div class="sig" style="margin-top:14pt"></div>
            <div class="sig-lbl">RECIBIDO CONFORME (CLIENTE)</div>
        </td>
        <td>
            <table class="totals">
                <tr><td class="lbl">SERVICIOS</td><td class="cur">L.</td><td class="amt">{{ $L($wo->subtotal_services) }}</td></tr>
                <tr><td class="lbl">REPUESTOS</td><td class="cur">L.</td><td class="amt">{{ $L($wo->subtotal_parts) }}</td></tr>
                <tr class="grand"><td class="lbl">TOTAL</td><td class="cur">L.</td><td class="amt">{{ $L($wo->total) }}</td></tr>
            </table>
            <div class="note" style="padding:0 4pt">Total sin impuestos. El I.S.V. se aplica en la factura.</div>
        </td>
    </tr>
</table>

@if($wo->notes->isNotEmpty())
<div class="box">
    <div class="ttl">BITÁCORA INTERNA</div>
    @foreach($wo->notes as $note)
    <div class="log-item">
        <div class="log-meta">{{ $note->user?->name ?? 'Sistema' }} · {{ $note->created_at->format('d/m/Y h:i A') }}</div>
        <div class="txt" style="padding:0">{{ $note->body }}</div>
    </div>
    @endforeach
</div>
@endif

<div class="note">Documento interno del taller. No válido como factura.</div>
</body>
</html>
