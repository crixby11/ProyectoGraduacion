<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; }

        .page { border: 1.5px solid #334155; margin: 14px; }

        /* Encabezado */
        .header { padding: 14px 18px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #334155; }
        .header-left { display: flex; gap: 12px; }
        .header-logo { width: 56px; height: 56px; border-radius: 6px; object-fit: contain; border: 1px solid #cbd5e1; padding: 3px; }
        .shop-name { font-size: 15px; font-weight: bold; letter-spacing: 0.3px; color: #1e293b; }
        .shop-meta { font-size: 9px; color: #475569; margin-top: 2px; line-height: 1.5; }
        .header-right { text-align: right; }
        .doc-title { font-size: 16px; font-weight: bold; letter-spacing: 1px; color: #1e293b; }
        .doc-number { font-size: 13px; font-weight: bold; color: #334155; margin-top: 4px; font-family: monospace; }
        .doc-date { font-size: 9px; color: #64748b; margin-top: 6px; }

        /* Franja cliente */
        .client-bar { display: flex; border-bottom: 1.5px solid #334155; }
        .client-bar .box { flex: 1; padding: 7px 14px; font-size: 10px; }
        .client-bar .box + .box { border-left: 1px solid #cbd5e1; }
        .client-bar .lbl { color: #64748b; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px; }
        .client-bar .val { font-weight: 600; margin-top: 1px; }

        /* Tabla de ítems */
        table.items { width: 100%; border-collapse: collapse; }
        table.items thead th {
            background: #eef2f7; color: #334155; padding: 6px 8px; text-align: left;
            font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px;
            border-bottom: 1.5px solid #334155; border-top: none;
        }
        table.items td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; }
        table.items .text-right { text-align: right; }
        table.items .muted { color: #64748b; font-size: 8.5px; }
        .fill-row td { height: 16px; border-bottom: 1px solid #eef2f7; }

        .section-label {
            background: #f8fafc; padding: 4px 8px; font-size: 9px; font-weight: bold;
            color: #475569; text-transform: uppercase; letter-spacing: 0.4px;
            border-bottom: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1;
        }

        /* Pie: letras + totales */
        .footer-grid { display: flex; border-top: 1.5px solid #334155; }
        .letters-box { flex: 1.4; padding: 10px 14px; border-right: 1.5px solid #334155; }
        .letters-lbl { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
        .letters-val { font-size: 10.5px; font-weight: 600; text-transform: capitalize; }
        .tagline { margin-top: 14px; font-size: 8.5px; color: #64748b; font-style: italic; }

        .totals-box { flex: 1; padding: 8px 14px; }
        .totals-box table { width: 100%; }
        .totals-box td { padding: 2.5px 0; font-size: 9.5px; }
        .totals-box .label { color: #475569; }
        .totals-box .amount { text-align: right; font-family: monospace; }
        .totals-box .divider td { border-top: 1px solid #cbd5e1; padding-top: 5px; }
        .totals-box .grand td { font-size: 13px; font-weight: bold; color: #1e293b; border-top: 1.5px solid #334155; padding-top: 6px; }
        .totals-box .paid td { color: #15803d; }
        .totals-box .balance td { color: #b91c1c; font-weight: bold; }

        /* Estado */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 8.5px; font-weight: bold; letter-spacing: 0.3px; }
        .badge-pendiente { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .badge-parcial   { background: #f1f5f9; color: #92400e; border: 1px solid #fbbf24; }
        .badge-pagada    { background: #f1f5f9; color: #15803d; border: 1px solid #86efac; }
        .badge-anulada   { background: #f1f5f9; color: #991b1b; border: 1px solid #fca5a5; }

        /* Firmas y notas finales */
        .signatures { display: flex; gap: 30px; padding: 16px 18px 10px; border-top: 1px solid #cbd5e1; }
        .sig-box { flex: 1; }
        .sig-line { border-top: 1px solid #334155; margin-bottom: 4px; height: 30px; }
        .sig-label { font-size: 8.5px; color: #64748b; text-align: center; }

        .bottom-note { padding: 8px 18px 14px; font-size: 8.5px; color: #64748b; text-align: center; }
        .bottom-note .copies { margin-top: 4px; letter-spacing: 0.3px; }
    </style>
</head>
<body>

    <div class="page">

        {{-- Encabezado --}}
        <div class="header">
            <div class="header-left">
                @php
                    $logoPath = public_path('img/logo.jpeg');
                    $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
                @endphp
                @if($logoData)
                <img class="header-logo" src="data:image/jpeg;base64,{{ $logoData }}" alt="Logo">
                @endif
                <div>
                    <div class="shop-name">{{ strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO') }}</div>
                    <div class="shop-meta">
                        @if(!empty($settings['shop_address'])){{ $settings['shop_address'] }}@if(!empty($settings['shop_city'])), {{ $settings['shop_city'] }}@endif<br>@endif
                        @if(!empty($settings['shop_phone']))Tel: {{ $settings['shop_phone'] }}@endif
                        @if(!empty($settings['shop_email'])) &nbsp;·&nbsp; {{ $settings['shop_email'] }}@endif
                        @if(!empty($settings['shop_rtn']))<br>R.T.N.: {{ $settings['shop_rtn'] }}@endif
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-title">FACTURA</div>
                <div class="doc-number">{{ $invoice->number }}</div>
                <div class="doc-date">
                    Fecha: {{ $invoice->issued_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}<br>
                    <span class="badge badge-{{ $invoice->status }}">{{ strtoupper($invoice->status) }}</span>
                </div>
            </div>
        </div>

        {{-- Franja cliente --}}
        @php
            $name  = $invoice->customer?->name ?? $invoice->workOrder?->customer_name ?? '—';
            $phone = $invoice->customer?->phone ?? $invoice->workOrder?->customer_phone;
            $rtn   = $invoice->customer?->id_number;
            $vehicle = trim(collect([
                $invoice->workOrder?->vehicle_plate,
                $invoice->workOrder?->vehicle_brand,
                $invoice->workOrder?->vehicle_model,
                $invoice->workOrder?->vehicle_year,
            ])->filter()->implode(' '));
        @endphp
        <div class="client-bar">
            <div class="box">
                <div class="lbl">Cliente</div>
                <div class="val">{{ $name }}</div>
            </div>
            <div class="box">
                <div class="lbl">R.T.N. / Identificación</div>
                <div class="val">{{ $rtn ?? '—' }}</div>
            </div>
            <div class="box">
                <div class="lbl">Teléfono</div>
                <div class="val">{{ $phone ?? '—' }}</div>
            </div>
            @if($invoice->workOrder)
            <div class="box">
                <div class="lbl">OT / Vehículo</div>
                <div class="val">{{ $invoice->workOrder->number }}@if($vehicle) · {{ $vehicle }}@endif</div>
            </div>
            @endif
        </div>

        {{-- Servicios --}}
        @if($invoice->workOrder?->services->isNotEmpty())
        <div class="section-label">Servicios / Mano de obra</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="width:50px">Horas</th>
                    <th>Descripción</th>
                    <th class="text-right" style="width:100px">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->workOrder->services as $svc)
                <tr>
                    <td>{{ number_format($svc->hours, 1) }}</td>
                    <td>{{ $svc->service_name }}</td>
                    <td class="text-right">L {{ number_format($svc->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        {{-- Repuestos --}}
        @if($invoice->workOrder?->parts->isNotEmpty())
        <div class="section-label">Repuestos y materiales</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="width:45px">Cant.</th>
                    <th>Descripción</th>
                    <th class="text-right" style="width:100px">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->workOrder->parts as $part)
                <tr>
                    <td>{{ $part->quantity }}</td>
                    <td>{{ $part->part_name }}</td>
                    <td class="text-right">L {{ number_format($part->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        {{-- Pagos registrados --}}
        @if($invoice->payments->isNotEmpty())
        <div class="section-label">Pagos recibidos</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="width:90px">Fecha</th>
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
                    <td class="muted">{{ $pay->reference ?? '—' }}</td>
                    <td class="text-right">L {{ number_format($pay->amount, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        {{-- Pie: valor en letras + totales --}}
        <div class="footer-grid">
            <div class="letters-box">
                <div class="letters-lbl">Valor en letras</div>
                <div class="letters-val">{{ \App\Support\NumberToWords::convertLempiras((float) $invoice->total) }}</div>
                <div class="tagline">"La factura es beneficio de todos, exíjala."</div>
            </div>
            <div class="totals-box">
                <table>
                    <tr>
                        <td class="label">Servicios</td>
                        <td class="amount">L {{ number_format($invoice->subtotal_services, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Repuestos</td>
                        <td class="amount">L {{ number_format($invoice->subtotal_parts, 2) }}</td>
                    </tr>
                    <tr class="divider">
                        <td class="label">Subtotal</td>
                        <td class="amount">L {{ number_format($invoice->subtotal, 2) }}</td>
                    </tr>
                    @if($invoice->discount_amount > 0)
                    <tr>
                        <td class="label">Descuento ({{ number_format($invoice->discount_percent, 1) }}%)</td>
                        <td class="amount">- L {{ number_format($invoice->discount_amount, 2) }}</td>
                    </tr>
                    @endif
                    @if($invoice->tax_amount > 0)
                    <tr>
                        <td class="label">Impuesto ({{ number_format($invoice->tax_percent, 1) }}%)</td>
                        <td class="amount">L {{ number_format($invoice->tax_amount, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="grand">
                        <td>TOTAL A PAGAR</td>
                        <td class="amount">L {{ number_format($invoice->total, 2) }}</td>
                    </tr>
                    @if($invoice->amount_paid > 0)
                    <tr class="paid">
                        <td class="label">Pagado</td>
                        <td class="amount">L {{ number_format($invoice->amount_paid, 2) }}</td>
                    </tr>
                    @endif
                    @if($invoice->balance > 0)
                    <tr class="balance">
                        <td>Saldo pendiente</td>
                        <td class="amount">L {{ number_format($invoice->balance, 2) }}</td>
                    </tr>
                    @endif
                </table>
            </div>
        </div>

        {{-- Notas --}}
        @if($invoice->notes)
        <div class="section-label">Notas</div>
        <div style="padding:8px 14px; font-size:9.5px; white-space:pre-wrap; line-height:1.5;">{{ $invoice->notes }}</div>
        @endif

        {{-- Firmas --}}
        <div class="signatures">
            <div class="sig-box">
                <div class="sig-line"></div>
                <p class="sig-label">Entregado por (Taller)</p>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <p class="sig-label">Recibido conforme (Cliente)</p>
            </div>
        </div>

        <div class="bottom-note">
            {{ $settings['invoice_notes'] ?? 'Gracias por su preferencia.' }}
            <div class="copies">ORIGINAL: CLIENTE &nbsp;·&nbsp; COPIA: EMISOR &nbsp;·&nbsp; Generado el {{ now()->format('d/m/Y H:i') }}</div>
        </div>

    </div>

</body>
</html>
