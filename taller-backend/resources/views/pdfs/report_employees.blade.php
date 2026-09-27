<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de rendimiento de empleados</title>
    @include('pdfs.partials.report_style')
</head>
<body>
<div class="wrap">
    @include('pdfs.partials.report_header', ['title' => 'REPORTE DE RENDIMIENTO DE EMPLEADOS'])

    <table class="kpi">
        <tr>
            <td><div class="lbl">Ingresos generados</div><div class="val">L {{ number_format($totals['revenue'], 2) }}</div></td>
            <td><div class="lbl">Horas trabajadas</div><div class="val">{{ number_format($totals['hours'], 1) }} h</div></td>
            <td><div class="lbl">OTs atendidas</div><div class="val">{{ $totals['ots'] }}</div></td>
            <td><div class="lbl">Total bonos</div><div class="val">L {{ number_format($totals['bonuses'], 2) }}</div></td>
        </tr>
    </table>

    <h2>Ranking por ingresos</h2>
    @if($ranking->isEmpty())
        <div class="empty">No hay empleados activos.</div>
    @else
    <table class="grid">
        <thead><tr><th class="c" style="width:22px">#</th><th>Empleado</th><th>Especialidad</th><th class="r">OTs</th><th class="r">Horas</th><th class="r">Ingresos</th><th class="r">Bonos</th></tr></thead>
        <tbody>
        @foreach($ranking as $i => $r)
            <tr>
                <td class="c">{{ $i + 1 }}</td>
                <td>{{ $r->name }}</td>
                <td class="muted">{{ $r->specialty }}</td>
                <td class="r">{{ $r->ot_count }}</td>
                <td class="r">{{ number_format($r->total_hours, 1) }}</td>
                <td class="r">L {{ number_format($r->total_revenue, 2) }}</td>
                <td class="r">L {{ number_format($r->total_bonuses, 2) }}</td>
            </tr>
        @endforeach
        <tr class="total"><td></td><td colspan="2">Total</td><td class="r">{{ $totals['ots'] }}</td><td class="r">{{ number_format($totals['hours'], 1) }}</td><td class="r">L {{ number_format($totals['revenue'], 2) }}</td><td class="r">L {{ number_format($totals['bonuses'], 2) }}</td></tr>
        </tbody>
    </table>
    <div class="muted" style="font-size:7.5px; margin-top:4px;">Se cuentan las OTs recibidas en el período. Una OT con servicios de varios empleados cuenta para cada uno.</div>
    @endif

    <h2>Detalle de servicios por empleado</h2>
    @php $any = false; @endphp
    @foreach($ranking as $r)
        @php $rows = $work->get($r->id, collect()); @endphp
        @if($rows->isNotEmpty())
            @php $any = true; @endphp
            <h3>{{ $r->name }} <span class="muted">— {{ $rows->count() }} servicio(s) · L {{ number_format($rows->sum('subtotal'), 2) }}</span></h3>
            <table class="grid">
                <thead><tr><th>OT</th><th>Recibida</th><th>Cliente</th><th>Vehículo</th><th>Servicio</th><th class="r">Horas</th><th class="r">Precio</th></tr></thead>
                <tbody>
                @foreach($rows as $w)
                    <tr>
                        <td class="mono">{{ $w->number }}</td>
                        <td>{{ \Carbon\Carbon::parse($w->received_at)->format('d/m/Y') }}</td>
                        <td>{{ $w->customer_name }}</td>
                        <td>{{ trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}") }}</td>
                        <td>{{ $w->service_name }}</td>
                        <td class="r">{{ number_format($w->hours, 1) }}</td>
                        <td class="r">L {{ number_format($w->subtotal, 2) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        @endif
    @endforeach
    @unless($any)<div class="empty">Ningún empleado trabajó servicios en el período.</div>@endunless
</div>
</body>
</html>
