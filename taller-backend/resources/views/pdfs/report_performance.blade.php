<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de rendimiento del taller</title>
    @include('pdfs.partials.report_style')
</head>
<body>
<div class="wrap">
    @include('pdfs.partials.report_header', ['title' => 'REPORTE DE RENDIMIENTO DEL TALLER'])

    <table class="kpi">
        <tr>
            <td><div class="lbl">Ingresos cobrados</div><div class="val">L {{ number_format($summary['revenue'], 2) }}</div></td>
            <td><div class="lbl">Autos entregados</div><div class="val">{{ $summary['ots'] }}</div></td>
            <td><div class="lbl">Ticket promedio</div><div class="val">L {{ number_format($summary['avg_ticket'], 2) }}</div></td>
        </tr>
    </table>

    <h2>Por {{ str_contains($periodLabel, 'trimestres') ? 'trimestre' : 'mes' }}</h2>
    <table class="grid">
        <thead><tr><th>Período</th><th class="r">Ingresos cobrados</th><th class="r">Autos entregados</th></tr></thead>
        <tbody>
        @foreach($rows as $r)
            <tr><td>{{ $r['label'] }}</td><td class="r">L {{ number_format($r['revenue'], 2) }}</td><td class="r">{{ $r['ot_count'] }}</td></tr>
        @endforeach
            <tr class="total"><td>Total</td><td class="r">L {{ number_format($summary['revenue'], 2) }}</td><td class="r">{{ $summary['ots'] }}</td></tr>
        </tbody>
    </table>

    <h2>Pagos cobrados ({{ $detail['payments']->count() }})</h2>
    @if($detail['payments']->isEmpty())
        <div class="empty">Sin pagos en el período.</div>
    @else
    <table class="grid">
        <thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th>Método</th><th class="r">Monto</th><th>Referencia</th></tr></thead>
        <tbody>
        @foreach($detail['payments'] as $p)
            <tr>
                <td>{{ $p->payment_date?->format('d/m/Y') }}</td>
                <td class="mono">{{ $p->invoice?->number }}</td>
                <td>{{ $p->customer?->name }}</td>
                <td>{{ ucfirst($p->method) }}</td>
                <td class="r">L {{ number_format($p->amount, 2) }}</td>
                <td class="mono">{{ $p->reference }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <h2>OTs entregadas ({{ $detail['delivered']->count() }})</h2>
    @if($detail['delivered']->isEmpty())
        <div class="empty">Sin OTs entregadas en el período.</div>
    @else
    <table class="grid">
        <thead><tr><th>OT</th><th>Entrega</th><th>Cliente</th><th>Vehículo</th><th class="r">Total</th></tr></thead>
        <tbody>
        @foreach($detail['delivered'] as $w)
            <tr>
                <td class="mono">{{ $w->number }}</td>
                <td>{{ $w->delivered_at?->format('d/m/Y') }}</td>
                <td>{{ $w->customer_name }}</td>
                <td>{{ trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}") }}</td>
                <td class="r">L {{ number_format($w->total, 2) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <h2>Facturas emitidas ({{ $detail['invoices']->count() }})</h2>
    @if($detail['invoices']->isEmpty())
        <div class="empty">Sin facturas en el período.</div>
    @else
    <table class="grid">
        <thead><tr><th>Factura</th><th>Fecha</th><th>Cliente</th><th>OT</th><th class="r">Total</th><th class="r">Pagado</th><th class="r">Saldo</th><th>Estado</th></tr></thead>
        <tbody>
        @foreach($detail['invoices'] as $i)
            <tr>
                <td class="mono">{{ $i->number }}</td>
                <td>{{ $i->issued_at?->format('d/m/Y') }}</td>
                <td>{{ $i->customer?->name }}</td>
                <td class="mono">{{ $i->workOrder?->number }}</td>
                <td class="r">L {{ number_format($i->total, 2) }}</td>
                <td class="r">L {{ number_format($i->amount_paid, 2) }}</td>
                <td class="r">L {{ number_format($i->balance, 2) }}</td>
                <td>{{ ucfirst($i->status) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif
</div>
</body>
</html>
