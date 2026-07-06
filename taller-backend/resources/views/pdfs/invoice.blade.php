<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; }

        .header { background: #1e40af; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header-left h1 { font-size: 20px; font-weight: bold; }
        .header-left p { font-size: 10px; margin-top: 2px; opacity: 0.85; }
        .header-right { text-align: right; }
        .header-right .inv-number { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
        .header-right .inv-label { font-size: 9px; opacity: 0.8; }

        .info-bar { padding: 8px 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; }
        .info-bar .col { font-size: 10px; }
        .info-bar .col p { margin-bottom: 3px; }
        .info-bar .col strong { color: #1e40af; }

        .section { padding: 10px 20px; border-bottom: 1px solid #e2e8f0; }
        .section h3 { font-size: 10px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 7px; }

        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .text-right { text-align: right; }

        .totals-wrap { display: flex; justify-content: flex-end; padding: 10px 20px; }
        .totals-table { width: 270px; }
        .totals-table td { border: none; padding: 3px 6px; font-size: 10px; }
        .totals-table .subtotal-row td { border-top: 1px solid #e2e8f0; }
        .totals-table .total-row td { font-weight: bold; font-size: 13px; border-top: 2px solid #1e40af; color: #1e40af; padding-top: 5px; }
        .totals-table .balance-row td { font-weight: bold; color: #dc2626; font-size: 12px; }
        .totals-table .paid-row td { color: #16a34a; }

        .sig-grid { display: flex; gap: 30px; padding: 20px 20px 12px; }
        .sig-box { flex: 1; }
        .sig-line { border-top: 1px solid #1e293b; margin-bottom: 4px; height: 32px; }
        .sig-label { font-size: 9px; color: #64748b; text-align: center; }

        .footer { background: #f8fafc; padding: 8px 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 10px; }

        .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 9px; font-weight: bold; }
        .badge-pendiente { background: #fee2e2; color: #991b1b; }
        .badge-parcial   { background: #fef3c7; color: #92400e; }
        .badge-pagada    { background: #dcfce7; color: #14532d; }
        .badge-anulada   { background: #e2e8f0; color: #475569; }
    </style>
</head>
<body>

    <div class="header">
        <div class="header-left">
            <h1>{{ strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO') }}</h1>
            <p>Comprobante de Facturación</p>
            @if(!empty($settings['shop_address']))<p>{{ $settings['shop_address'] }}</p>@endif
            @if(!empty($settings['shop_phone']))<p>Tel: {{ $settings['shop_phone'] }}@if(!empty($settings['shop_rtn'])) &nbsp;·&nbsp; RTN: {{ $settings['shop_rtn'] }}@endif</p>@endif
        </div>
        <div class="header-right">
            <div class="inv-label">FACTURA</div>
            <div class="inv-number">{{ $invoice->number }}</div>
        </div>
    </div>

    {{-- Barra de información principal --}}
    <div class="info-bar">
        <div class="col">
            <p><strong>Factura:</strong> {{ $invoice->number }}</p>
            @if($invoice->workOrder)
            <p><strong>OT relacionada:</strong> {{ $invoice->workOrder->number }}</p>
            @endif
            <p><strong>Fecha emisión:</strong> {{ $invoice->issued_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}</p>
            <p>
                <strong>Estado:</strong>
                <span class="badge badge-{{ $invoice->status }}">{{ strtoupper($invoice->status) }}</span>
            </p>
        </div>
        <div class="col" style="text-align:right">
            @php
                $name  = $invoice->customer?->name ?? $invoice->workOrder?->customer_name ?? '—';
                $phone = $invoice->customer?->phone ?? $invoice->workOrder?->customer_phone;
                $rtn   = $invoice->customer?->id_number;
            @endphp
            <p><strong>Cliente:</strong> {{ $name }}</p>
            @if($phone)<p><strong>Teléfono:</strong> {{ $phone }}</p>@endif
            @if($rtn)<p><strong>RTN / ID:</strong> {{ $rtn }}</p>@endif
            @if($invoice->workOrder?->vehicle_plate)
            <p><strong>Vehículo:</strong>
                {{ $invoice->workOrder->vehicle_plate }}
                {{ $invoice->workOrder->vehicle_brand }}
                {{ $invoice->workOrder->vehicle_model }}
                {{ $invoice->workOrder->vehicle_year }}
            </p>
            @endif
        </div>
    </div>

    {{-- Servicios --}}
    @if($invoice->workOrder?->services->isNotEmpty())
    <div class="section">
        <h3>Servicios / Mano de obra</h3>
        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th class="text-right" style="width:60px">Horas</th>
                    <th class="text-right" style="width:90px">Tarifa/hr</th>
                    <th class="text-right" style="width:90px">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->workOrder->services as $svc)
                <tr>
                    <td>{{ $svc->service_name }}</td>
                    <td class="text-right">{{ number_format($svc->hours, 1) }}</td>
                    <td class="text-right">Lps {{ number_format($svc->hourly_rate, 2) }}</td>
                    <td class="text-right">Lps {{ number_format($svc->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- Repuestos --}}
    @if($invoice->workOrder?->parts->isNotEmpty())
    <div class="section">
        <h3>Repuestos y materiales</h3>
        <table>
            <thead>
                <tr>
                    <th>Repuesto</th>
                    <th style="width:70px">SKU</th>
                    <th class="text-right" style="width:50px">Cant.</th>
                    <th class="text-right" style="width:90px">P. Unit.</th>
                    <th class="text-right" style="width:90px">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->workOrder->parts as $part)
                <tr>
                    <td>{{ $part->part_name }}</td>
                    <td style="font-size:9px;color:#64748b;">{{ $part->part_sku ?? '—' }}</td>
                    <td class="text-right">{{ $part->quantity }}</td>
                    <td class="text-right">Lps {{ number_format($part->unit_price, 2) }}</td>
                    <td class="text-right">Lps {{ number_format($part->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- Totales --}}
    <div class="totals-wrap">
        <table class="totals-table">
            <tr><td>Servicios:</td><td class="text-right">Lps {{ number_format($invoice->subtotal_services, 2) }}</td></tr>
            <tr><td>Repuestos:</td><td class="text-right">Lps {{ number_format($invoice->subtotal_parts, 2) }}</td></tr>
            @if($invoice->discount_amount > 0)
            <tr><td>Descuento ({{ number_format($invoice->discount_percent, 1) }}%):</td><td class="text-right">- Lps {{ number_format($invoice->discount_amount, 2) }}</td></tr>
            @endif
            @if($invoice->tax_amount > 0)
            <tr><td>Impuesto ({{ number_format($invoice->tax_percent, 1) }}%):</td><td class="text-right">Lps {{ number_format($invoice->tax_amount, 2) }}</td></tr>
            @endif
            <tr class="total-row"><td>TOTAL:</td><td class="text-right">Lps {{ number_format($invoice->total, 2) }}</td></tr>
            @if($invoice->amount_paid > 0)
            <tr class="paid-row"><td>Pagado:</td><td class="text-right">Lps {{ number_format($invoice->amount_paid, 2) }}</td></tr>
            @endif
            @if($invoice->balance > 0)
            <tr class="balance-row"><td>SALDO PENDIENTE:</td><td class="text-right">Lps {{ number_format($invoice->balance, 2) }}</td></tr>
            @endif
        </table>
    </div>

    {{-- Pagos registrados --}}
    @if($invoice->payments->isNotEmpty())
    <div class="section">
        <h3>Pagos recibidos</h3>
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th class="text-right" style="width:100px">Monto</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->payments as $pay)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($pay->payment_date)->format('d/m/Y') }}</td>
                    <td style="text-transform:capitalize;">{{ $pay->method }}</td>
                    <td style="font-size:9px;color:#64748b;">{{ $pay->reference ?? '—' }}</td>
                    <td class="text-right">Lps {{ number_format($pay->amount, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- Notas --}}
    @if($invoice->notes)
    <div class="section">
        <h3>Notas</h3>
        <p style="font-size:10px;white-space:pre-wrap;line-height:1.5;">{{ $invoice->notes }}</p>
    </div>
    @endif

    {{-- Firmas --}}
    <div class="sig-grid">
        <div class="sig-box">
            <div class="sig-line"></div>
            <p class="sig-label">Entregado por (Taller)</p>
        </div>
        <div class="sig-box">
            <div class="sig-line"></div>
            <p class="sig-label">Recibido conforme (Cliente)</p>
        </div>
    </div>

    <div class="footer">
        {{ $settings['invoice_notes'] ?? 'Gracias por su preferencia.' }}
        &nbsp;·&nbsp; Generado el {{ now()->format('d/m/Y H:i') }}
    </div>

</body>
</html>