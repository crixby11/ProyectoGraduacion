<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a1a1a; }

        .page { border: 1.5px solid #1a1a1a; margin: 14px; }

        /* Encabezado */
        .header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #1a1a1a; }
        .header-left { display: flex; gap: 10px; }
        .header-logo { width: 52px; height: 52px; object-fit: contain; }
        .shop-name { font-size: 15px; font-weight: bold; letter-spacing: 0.2px; }
        .shop-owner { font-size: 9px; font-weight: bold; margin-top: 1px; }
        .shop-meta { font-size: 8.5px; color: #333; margin-top: 3px; line-height: 1.5; max-width: 260px; }
        .header-right { text-align: right; }
        .doc-title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
        .doc-number { font-size: 14px; font-weight: bold; color: #b91c1c; margin-top: 4px; font-family: monospace; }
        .doc-date { font-size: 9px; color: #333; margin-top: 6px; }
        .doc-date .badge { display: inline-block; margin-top: 3px; padding: 2px 7px; border-radius: 3px; font-size: 8px; font-weight: bold; letter-spacing: 0.3px; background: #f1f5f9; border: 1px solid #94a3b8; }

        /* Franja cliente */
        .client-bar { display: flex; border-bottom: 1.5px solid #1a1a1a; }
        .client-bar .box { flex: 1; padding: 6px 14px; font-size: 9.5px; }
        .client-bar .box + .box { border-left: 1px solid #94a3b8; }
        .client-bar .lbl { color: #555; font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; }
        .client-bar .val { font-weight: 600; margin-top: 1px; }

        /* Tabla de ítems */
        table.items { width: 100%; border-collapse: collapse; }
        table.items thead th {
            background: #eef2f7; color: #1a1a1a; padding: 5px 8px; text-align: left;
            font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3px;
            border-bottom: 1.5px solid #1a1a1a;
        }
        table.items td { padding: 4.5px 8px; font-size: 9.5px; border-bottom: 1px solid #e2e8f0; }
        table.items .text-right { text-align: right; }
        table.items .fill-row td { height: 14px; }

        /* Adquirente exonerado */
        .exempt-box { border-bottom: 1.5px solid #1a1a1a; padding: 8px 16px; }
        .exempt-title { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 5px; }
        .exempt-row { display: flex; font-size: 8.5px; margin-bottom: 3px; }
        .exempt-row .lbl { width: 260px; color: #333; }
        .exempt-row .line { flex: 1; border-bottom: 1px solid #94a3b8; }

        /* Pie: firma/fiscal + totales */
        .footer-grid { display: flex; border-bottom: 1.5px solid #1a1a1a; }
        .fiscal-box { flex: 1.3; padding: 10px 16px; border-right: 1.5px solid #1a1a1a; font-size: 8.5px; }
        .fiscal-box .sig-line { border-top: 1px solid #1a1a1a; margin: 18px 40px 4px 0; }
        .fiscal-box .sig-label { color: #555; margin-bottom: 10px; }
        .fiscal-box .row { margin-top: 3px; }
        .fiscal-box .row b { font-family: monospace; }

        .totals-box { flex: 1; padding: 8px 14px; }
        .totals-box table { width: 100%; }
        .totals-box td { padding: 2.5px 0; font-size: 9px; }
        .totals-box .label { color: #333; }
        .totals-box .amount { text-align: right; font-family: monospace; }
        .totals-box .divider td { border-top: 1px solid #94a3b8; padding-top: 4px; }
        .totals-box .grand td { font-size: 12px; font-weight: bold; border-top: 1.5px solid #1a1a1a; padding-top: 5px; }

        /* Valor en letras + tagline */
        .letters-box { padding: 10px 16px; }
        .letters-lbl { font-size: 8.5px; color: #555; text-transform: uppercase; letter-spacing: 0.4px; }
        .letters-val { font-size: 10px; font-weight: 600; text-transform: capitalize; margin-top: 2px; }
        .tagline { margin-top: 10px; font-size: 9px; font-weight: bold; font-style: italic; text-align: center; }

        /* Pie de página fijo (se repite en cada hoja), abajo a la derecha */
        .page-footer { position: fixed; bottom: 48px; right: 24px; font-size: 8px; color: #555; text-align: right; }
        .page-footer .pnum:before { content: counter(page); }

        .bottom-note { padding: 6px 16px 12px; font-size: 8px; color: #555; text-align: center; border-top: 1px solid #cbd5e1; }
    </style>
</head>
<body>

    <div class="page-footer">Página <span class="pnum"></span></div>

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
                    <div class="shop-name">{{ mb_strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO', 'UTF-8') }}</div>
                    @if(!empty($settings['shop_owner']))
                    <div class="shop-owner">PROP. {{ mb_strtoupper($settings['shop_owner'], 'UTF-8') }}</div>
                    @endif
                    <div class="shop-meta">
                        @if(!empty($settings['shop_address'])){{ $settings['shop_address'] }}@if(!empty($settings['shop_city'])), {{ $settings['shop_city'] }}@endif<br>@endif
                        @if(!empty($settings['shop_phone']))Cel.: {{ $settings['shop_phone'] }}@endif
                        @if(!empty($settings['shop_email'])) &nbsp;·&nbsp; {{ $settings['shop_email'] }}@endif
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-title">FACTURA CONTADO</div>
                <div class="doc-number">N° {{ $invoice->number }}</div>
                <div class="doc-date">
                    Fecha de emisión: {{ $invoice->issued_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}<br>
                    <span class="badge">{{ strtoupper($invoice->status) }}</span>
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
                <div class="lbl">R.T.N.</div>
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

        {{-- Ítems (servicios y repuestos unificados) --}}
        <table class="items">
            <thead>
                <tr>
                    <th style="width:45px">Cant.</th>
                    <th>Descripción</th>
                    <th class="text-right" style="width:85px">Precio Unit.</th>
                    <th class="text-right" style="width:75px">Descuento</th>
                    <th class="text-right" style="width:95px">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->workOrder?->services ?? [] as $svc)
                <tr>
                    <td>{{ number_format($svc->hours, 1) }}</td>
                    <td>{{ $svc->service_name }}</td>
                    <td class="text-right">L {{ number_format($svc->hourly_rate, 2) }}</td>
                    <td class="text-right">—</td>
                    <td class="text-right">L {{ number_format($svc->subtotal, 2) }}</td>
                </tr>
                @endforeach
                @foreach($invoice->workOrder?->parts ?? [] as $part)
                <tr>
                    <td>{{ $part->quantity }}</td>
                    <td>{{ $part->part_name }}</td>
                    <td class="text-right">L {{ number_format($part->unit_price, 2) }}</td>
                    <td class="text-right">—</td>
                    <td class="text-right">L {{ number_format($part->subtotal, 2) }}</td>
                </tr>
                @endforeach
                <tr class="fill-row"><td colspan="5"></td></tr>
            </tbody>
        </table>

        {{-- Datos del adquirente exonerado --}}
        <div class="exempt-box">
            <div class="exempt-title">Datos del adquirente exonerado</div>
            <div class="exempt-row"><span class="lbl">Número Correlativo de Orden de Compra Exenta</span><span class="line"></span></div>
            <div class="exempt-row"><span class="lbl">Número Correlativo de Constancia de Registro Exonerado</span><span class="line"></span></div>
            <div class="exempt-row"><span class="lbl">Número Identificativo del Registro de la Secretaría de Estado en el Despacho de Agricultura y Ganadería</span><span class="line"></span></div>
        </div>

        {{-- Pie: firma/datos fiscales + totales --}}
        @php
            $exento    = $invoice->exempt_amount;
            $gravado15 = $invoice->taxed_15_amount;
            $gravado18 = $invoice->taxed_18_amount;
            $isv15     = $invoice->tax_15_amount;
            $isv18     = $invoice->tax_18_amount;
        @endphp
        <div class="footer-grid">
            <div class="fiscal-box">
                <div class="sig-line"></div>
                <div class="sig-label">Firma Autorizada</div>
                <div class="row">R.T.N.: <b>{{ $settings['shop_rtn'] ?? '—' }}</b></div>
                <div class="row">CAI: <b>{{ $settings['invoice_cai'] ?? '—' }}</b></div>
                <div class="row">Fecha límite de emisión: <b>{{ !empty($settings['invoice_deadline']) ? \Carbon\Carbon::parse($settings['invoice_deadline'])->format('d/m/Y') : '—' }}</b></div>
                <div class="row">Rango autorizado: <b>{{ $settings['invoice_range_start'] ?? '—' }}</b> / <b>{{ $settings['invoice_range_end'] ?? '—' }}</b></div>
            </div>
            <div class="totals-box">
                <table>
                    <tr>
                        <td class="label">Sub-total Exonerados</td>
                        <td class="amount">L {{ number_format($exento, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Sub-total Importe Gravado 15%</td>
                        <td class="amount">L {{ number_format($gravado15, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Sub-total Importe Gravado 18%</td>
                        <td class="amount">L {{ number_format($gravado18, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">15% I.S.V.</td>
                        <td class="amount">L {{ number_format($isv15, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">18% I.S.V.</td>
                        <td class="amount">L {{ number_format($isv18, 2) }}</td>
                    </tr>
                    <tr class="grand">
                        <td>TOTAL</td>
                        <td class="amount">L {{ number_format($invoice->total, 2) }}</td>
                    </tr>
                </table>
            </div>
        </div>

        {{-- Valor en letras --}}
        <div class="letters-box">
            <div class="letters-lbl">Total (Letras)</div>
            <div class="letters-val">{{ \App\Support\NumberToWords::convertLempiras((float) $invoice->total) }}</div>
            @if($invoice->amount_paid > 0 || $invoice->balance > 0)
            <div style="margin-top:8px; font-size:9px; display:flex; gap:18px;">
                @if($invoice->amount_paid > 0)
                <span>Pagado: <b style="color:#15803d;">L {{ number_format($invoice->amount_paid, 2) }}</b></span>
                @endif
                @if($invoice->balance > 0)
                <span>Saldo pendiente: <b style="color:#b91c1c;">L {{ number_format($invoice->balance, 2) }}</b></span>
                @endif
            </div>
            @endif
            <div class="tagline">LA FACTURA ES BENEFICIO DE TODOS &nbsp;"EXÍJALA"</div>
        </div>

        <div class="bottom-note">
            {{ $settings['invoice_notes'] ?? 'Gracias por su preferencia.' }}
            <div style="margin-top:3px;">ORIGINAL: CLIENTE &nbsp;·&nbsp; COPIA: OBLIGADO TRIBUTARIO EMISOR &nbsp;·&nbsp; Generado el {{ now()->format('d/m/Y H:i') }}</div>
        </div>

    </div>

</body>
</html>
