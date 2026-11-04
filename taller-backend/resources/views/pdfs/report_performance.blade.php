<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte del taller</title>
    @include('pdfs.partials.report_style')
    <style>
        .up { color: #047857; }
        .down { color: #b91c1c; }
        .note { font-size: 7.5px; color: #64748b; margin-top: 3px; }
        ul.insights { margin: 0 0 0 12px; }
        ul.insights li { margin: 2px 0; font-size: 8.5px; }
        ul.insights li.bad { color: #b91c1c; }
        ul.insights li.good { color: #047857; }
        table.two { width: 100%; border-collapse: collapse; }
        table.two > tbody > tr > td { width: 50%; vertical-align: top; padding: 0; }
        table.two > tbody > tr > td:first-child { padding-right: 8px; }
    </style>
</head>
<body>
@php
    $k = $report['kpis'];
    $p = $report['previous'];
    $s = $report['snapshot'];
    $b = $report['breakdowns'];
    $L = fn ($v) => 'L ' . number_format((float) $v, 2);
    $pct = fn ($v) => $v === null ? '—' : number_format($v, 1) . '%';
    // Indicadores donde subir es malo (se pintan en rojo al aumentar).
    $lowerIsBetter = ['receivable', 'ots_cancelled', 'avg_turnaround_days', 'no_show_rate', 'supplier_payments'];
@endphp
<div class="wrap">
    @include('pdfs.partials.report_header', ['title' => 'REPORTE DEL TALLER'])

    <table class="kpi">
        <tr>
            <td><div class="lbl">Cobrado</div><div class="val">{{ $L($k['collected']) }}</div></td>
            <td><div class="lbl">Facturado</div><div class="val">{{ $L($k['invoiced']) }}</div></td>
            <td><div class="lbl">Ticket promedio</div><div class="val">{{ $L($k['avg_ticket']) }}</div></td>
            <td><div class="lbl">Flujo neto</div><div class="val">{{ $L($k['net_cash']) }}</div></td>
        </tr>
    </table>
    <table class="kpi" style="margin-top:6px">
        <tr>
            <td><div class="lbl">OTs entregadas</div><div class="val">{{ $k['ots_delivered'] }}</div></td>
            <td><div class="lbl">Días promedio de entrega</div><div class="val">{{ $k['avg_turnaround_days'] ?? '—' }}</div></td>
            <td><div class="lbl">Cotizaciones aprobadas</div><div class="val">{{ $pct($k['conversion_rate']) }}</div></td>
            <td><div class="lbl">Por cobrar (total)</div><div class="val">{{ $L($s['receivables']['total']) }}</div></td>
        </tr>
    </table>

    @if(count($report['insights']))
        <h2>Observaciones</h2>
        <ul class="insights">
            @foreach($report['insights'] as $i)
                <li class="{{ $i['type'] }}">{{ $i['text'] }}</li>
            @endforeach
        </ul>
    @endif

    <h2>Comparación con el período anterior</h2>
    <table class="grid">
        <thead><tr><th>Indicador</th><th class="r">Actual</th><th class="r">Anterior ({{ $rangeObj->previousText() }})</th><th class="r">Variación</th></tr></thead>
        <tbody>
        @foreach($comparison as $r)
            @php
                $fmt = fn ($v) => $v === null ? '—' : number_format($v, $r['decimals']);
                $good = $r['change'] !== null && $r['change'] != 0 && (($r['change'] > 0) xor in_array($r['key'], $lowerIsBetter));
            @endphp
            <tr>
                <td>{{ $r['label'] }}</td>
                <td class="r">{{ $fmt($r['current']) }}</td>
                <td class="r muted">{{ $fmt($r['previous']) }}</td>
                <td class="r {{ $r['change'] === null || $r['change'] == 0 ? 'muted' : ($good ? 'up' : 'down') }}">
                    {{ $r['change'] === null ? '—' : ($r['change'] > 0 ? '+' : '') . number_format($r['change'], 1) . '%' }}
                </td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <h2>Por {{ $rangeObj->groupLabel() }}</h2>
    <table class="grid">
        <thead><tr><th>Período</th><th class="r">Cobrado</th><th class="r">Facturado</th><th class="r">OTs recibidas</th><th class="r">OTs entregadas</th></tr></thead>
        <tbody>
        @foreach($report['series'] as $r)
            <tr><td>{{ $r['label'] }}</td><td class="r">{{ $L($r['collected']) }}</td><td class="r">{{ $L($r['invoiced']) }}</td><td class="r">{{ $r['ots_received'] }}</td><td class="r">{{ $r['ots_delivered'] }}</td></tr>
        @endforeach
            <tr class="total"><td>Total</td><td class="r">{{ $L($k['collected']) }}</td><td class="r">{{ $L($k['invoiced']) }}</td><td class="r">{{ $k['ots_received'] }}</td><td class="r">{{ $k['ots_delivered'] }}</td></tr>
        </tbody>
    </table>

    <table class="two"><tr>
        <td>
            <h2>Origen de la facturación</h2>
            <table class="grid">
                <tbody>
                    <tr><td>Servicios (mano de obra)</td><td class="r">{{ $L($k['services_revenue']) }}</td></tr>
                    <tr><td>Repuestos</td><td class="r">{{ $L($k['parts_revenue']) }}</td></tr>
                    <tr><td>Margen de repuestos de inventario</td><td class="r">{{ $L($k['parts_margin']) }} ({{ $pct($k['parts_margin_pct']) }})</td></tr>
                </tbody>
            </table>
            <div class="note">El margen compara el precio de venta con el costo registrado al sacar el repuesto del inventario, en OTs entregadas.</div>
        </td>
        <td>
            <h2>Cobros por método de pago</h2>
            @if($b['payment_methods']->isEmpty())
                <div class="empty">Sin cobros en el período.</div>
            @else
            <table class="grid">
                <thead><tr><th>Método</th><th class="r">Pagos</th><th class="r">Total</th></tr></thead>
                <tbody>
                @foreach($b['payment_methods'] as $r)
                    <tr><td>{{ ucfirst($r['method']) }}</td><td class="r">{{ $r['count'] }}</td><td class="r">{{ $L($r['total']) }}</td></tr>
                @endforeach
                </tbody>
            </table>
            @endif
        </td>
    </tr></table>

    <table class="two"><tr>
        <td>
            <h2>Operación</h2>
            <table class="grid">
                <tbody>
                    <tr><td>OTs recibidas / entregadas</td><td class="r">{{ $k['ots_received'] }} / {{ $k['ots_delivered'] }}</td></tr>
                    <tr><td>OTs canceladas</td><td class="r">{{ $k['ots_cancelled'] }}</td></tr>
                    <tr><td>Entregas a tiempo</td><td class="r">{{ $pct($k['on_time_rate']) }}</td></tr>
                    <tr><td>Cotizaciones emitidas / aprobadas</td><td class="r">{{ $k['quotes_issued'] }} / {{ $k['quotes_won'] }}</td></tr>
                    <tr><td>Monto cotizado / aprobado</td><td class="r">{{ $L($k['quotes_total']) }} / {{ $L($k['quotes_won_total']) }}</td></tr>
                    <tr><td>Citas / completadas / no se presentó</td><td class="r">{{ $k['appointments'] }} / {{ $k['appointments_completed'] }} / {{ $k['appointments_no_show'] }}</td></tr>
                    <tr><td>Compras recibidas de proveedores</td><td class="r">{{ $L($k['purchases']) }}</td></tr>
                    <tr><td>Pagos a proveedores</td><td class="r">{{ $L($k['supplier_payments']) }}</td></tr>
                </tbody>
            </table>
        </td>
        <td>
            <h2>Estado actual del taller</h2>
            <table class="grid">
                <tbody>
                    <tr><td>OTs abiertas</td><td class="r">{{ $s['open_total'] }}</td></tr>
                    <tr><td class="muted">&nbsp;&nbsp;Recibidas / diagnóstico</td><td class="r">{{ $s['open_ots']['recibido'] }} / {{ $s['open_ots']['diagnostico'] }}</td></tr>
                    <tr><td class="muted">&nbsp;&nbsp;En progreso / listas</td><td class="r">{{ $s['open_ots']['en_progreso'] }} / {{ $s['open_ots']['listo'] }}</td></tr>
                    <tr><td>OTs atrasadas</td><td class="r {{ $s['overdue_ots'] ? 'down' : '' }}">{{ $s['overdue_ots'] }}</td></tr>
                    <tr><td>Por cobrar 0-30 días</td><td class="r">{{ $L($s['receivables']['d0_30']) }}</td></tr>
                    <tr><td>Por cobrar 31-60 días</td><td class="r">{{ $L($s['receivables']['d31_60']) }}</td></tr>
                    <tr><td>Por cobrar 61-90 días</td><td class="r">{{ $L($s['receivables']['d61_90']) }}</td></tr>
                    <tr><td>Por cobrar más de 90 días</td><td class="r {{ $s['receivables']['d90plus'] > 0 ? 'down' : '' }}">{{ $L($s['receivables']['d90plus']) }}</td></tr>
                    <tr><td>Repuestos con stock bajo</td><td class="r">{{ $s['low_stock'] }}</td></tr>
                </tbody>
            </table>
        </td>
    </tr></table>

    <h2>Servicios más vendidos</h2>
    @if($b['top_services']->isEmpty())
        <div class="empty">Sin servicios en OTs entregadas.</div>
    @else
    <table class="grid">
        <thead><tr><th>Servicio</th><th class="r">Veces</th><th class="r">Horas</th><th class="r">Total</th></tr></thead>
        <tbody>
        @foreach($b['top_services'] as $r)
            <tr><td>{{ $r['name'] }}</td><td class="r">{{ $r['count'] }}</td><td class="r">{{ number_format($r['hours'], 1) }}</td><td class="r">{{ $L($r['total']) }}</td></tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <table class="two"><tr>
        <td>
            <h2>Repuestos más vendidos</h2>
            @if($b['top_parts']->isEmpty())
                <div class="empty">Sin repuestos en OTs entregadas.</div>
            @else
            <table class="grid">
                <thead><tr><th>Repuesto</th><th class="r">Cant.</th><th class="r">Total</th></tr></thead>
                <tbody>
                @foreach($b['top_parts'] as $r)
                    <tr><td>{{ $r['name'] }}</td><td class="r">{{ $r['quantity'] }}</td><td class="r">{{ $L($r['total']) }}</td></tr>
                @endforeach
                </tbody>
            </table>
            @endif
        </td>
        <td>
            <h2>Mejores clientes</h2>
            @if($b['top_customers']->isEmpty())
                <div class="empty">Sin facturas en el período.</div>
            @else
            <table class="grid">
                <thead><tr><th>Cliente</th><th class="r">Fact.</th><th class="r">Total</th><th class="r">Saldo</th></tr></thead>
                <tbody>
                @foreach($b['top_customers'] as $r)
                    <tr><td>{{ $r['name'] }}</td><td class="r">{{ $r['count'] }}</td><td class="r">{{ $L($r['total']) }}</td><td class="r">{{ $L($r['balance']) }}</td></tr>
                @endforeach
                </tbody>
            </table>
            @endif
        </td>
    </tr></table>

    <h2>Pagos cobrados ({{ $detail['payments']->count() }})</h2>
    @if($detail['payments']->isEmpty())
        <div class="empty">Sin pagos en el período.</div>
    @else
    <table class="grid">
        <thead><tr><th>Fecha</th><th>Factura</th><th>Cliente</th><th>Método</th><th class="r">Monto</th><th>Referencia</th></tr></thead>
        <tbody>
        @foreach($detail['payments'] as $pay)
            <tr>
                <td>{{ $pay->payment_date?->format('d/m/Y') }}</td>
                <td class="mono">{{ $pay->invoice?->number }}</td>
                <td>{{ $pay->customer?->name }}</td>
                <td>{{ ucfirst($pay->method) }}</td>
                <td class="r">{{ $L($pay->amount) }}</td>
                <td class="mono">{{ $pay->reference }}</td>
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
        <thead><tr><th>OT</th><th>Recibida</th><th>Entrega</th><th>Cliente</th><th>Vehículo</th><th class="r">Total</th></tr></thead>
        <tbody>
        @foreach($detail['delivered'] as $w)
            <tr>
                <td class="mono">{{ $w->number }}</td>
                <td>{{ $w->received_at?->format('d/m/Y') }}</td>
                <td>{{ $w->delivered_at?->format('d/m/Y') }}</td>
                <td>{{ $w->customer_name }}</td>
                <td>{{ trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}") }}</td>
                <td class="r">{{ $L($w->total) }}</td>
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
                <td class="r">{{ $L($i->total) }}</td>
                <td class="r">{{ $L($i->amount_paid) }}</td>
                <td class="r">{{ $L($i->balance) }}</td>
                <td>{{ ucfirst($i->status) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    <h2>Facturas con saldo pendiente ({{ $detail['receivables']->count() }})</h2>
    @if($detail['receivables']->isEmpty())
        <div class="empty">No hay facturas con saldo pendiente.</div>
    @else
    <table class="grid">
        <thead><tr><th>Factura</th><th>Fecha</th><th class="r">Días</th><th>Cliente</th><th>OT</th><th class="r">Total</th><th class="r">Saldo</th></tr></thead>
        <tbody>
        @foreach($detail['receivables'] as $i)
            <tr>
                <td class="mono">{{ $i->number }}</td>
                <td>{{ $i->issued_at?->format('d/m/Y') }}</td>
                <td class="r">{{ $i->issued_at ? (int) $i->issued_at->diffInDays(now()) : '' }}</td>
                <td>{{ $i->customer?->name }}</td>
                <td class="mono">{{ $i->workOrder?->number }}</td>
                <td class="r">{{ $L($i->total) }}</td>
                <td class="r">{{ $L($i->balance) }}</td>
            </tr>
        @endforeach
            <tr class="total"><td colspan="6">Total por cobrar</td><td class="r">{{ $L($detail['receivables']->sum('balance')) }}</td></tr>
        </tbody>
    </table>
    @endif
</div>
</body>
</html>
