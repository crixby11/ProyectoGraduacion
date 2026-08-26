<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>OT {{ $wo->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; border: 0; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a1a1a; }

        .page { border: 1.5px solid #1a1a1a; margin: 14px; }

        /* Encabezado */
        .header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #1a1a1a; }
        .header-left { display: flex; gap: 10px; }
        .header-logo { width: 52px; height: 52px; object-fit: contain; }
        .shop-name { font-size: 15px; font-weight: bold; letter-spacing: 0.2px; }
        .shop-meta { font-size: 8.5px; color: #333; margin-top: 3px; line-height: 1.5; max-width: 260px; }
        .header-right { text-align: right; }
        .doc-title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
        .doc-number { font-size: 14px; font-weight: bold; color: #b91c1c; margin-top: 4px; font-family: monospace; }
        .doc-date { font-size: 9px; color: #333; margin-top: 6px; line-height: 1.6; }
        .badge { display: inline-block; margin-top: 3px; padding: 2px 7px; border-radius: 3px; font-size: 8px; font-weight: bold; letter-spacing: 0.3px; }
        .badge-recibido    { background: #e2e8f0; color: #475569; }
        .badge-diagnostico { background: #fef3c7; color: #92400e; }
        .badge-en_progreso { background: #dbeafe; color: #1e40af; }
        .badge-listo       { background: #d1fae5; color: #065f46; }
        .badge-entregado   { background: #dcfce7; color: #14532d; }
        .badge-cancelado   { background: #fee2e2; color: #991b1b; }

        /* Franja cliente / vehículo / técnico */
        .client-bar { display: flex; flex-wrap: wrap; border-bottom: 1.5px solid #1a1a1a; }
        .client-bar .box { flex: 1; min-width: 120px; padding: 6px 14px; font-size: 9.5px; }
        .client-bar .box + .box { border-left: 1px solid #94a3b8; }
        .client-bar .lbl { color: #555; font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; }
        .client-bar .val { font-weight: 600; margin-top: 1px; }

        /* Secciones de texto (problema / inspección / solución / pendientes) */
        .text-section { padding: 8px 16px; border-bottom: 1px solid #cbd5e1; }
        .text-section .lbl { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; color: #1a1a1a; margin-bottom: 4px; }
        .text-section .body { font-size: 9.5px; line-height: 1.5; white-space: pre-wrap; color: #333; }

        /* Tabla de ítems */
        .items-section { padding: 10px 16px; border-bottom: 1.5px solid #1a1a1a; }
        .items-section .lbl { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 5px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        table.items:last-child { margin-bottom: 0; }
        table.items thead th {
            background: #eef2f7; color: #1a1a1a; padding: 5px 8px; text-align: left;
            font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3px;
            border-bottom: 1.5px solid #1a1a1a;
        }
        table.items td { padding: 4.5px 8px; font-size: 9.5px; border-bottom: 1px solid #e2e8f0; }
        table.items .text-right { text-align: right; }
        table.items tfoot td { padding: 4px 8px; font-size: 9px; font-weight: bold; border-top: 1px solid #94a3b8; border-bottom: none; }

        /* Totales */
        .totals-wrap { display: flex; justify-content: flex-end; padding: 10px 16px; border-bottom: 1.5px solid #1a1a1a; }
        .totals-box { width: 240px; }
        .totals-box table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .totals-box td { padding: 2.5px 0; font-size: 9.5px; border: none; }
        .totals-box .label { color: #333; }
        .totals-box .amount { text-align: right; font-family: monospace; }
        .totals-box .grand td { font-size: 13px; font-weight: bold; border-top: 1.5px solid #1a1a1a; padding-top: 5px; }

        /* Bitácora */
        .notes-section { padding: 8px 16px; border-bottom: 1.5px solid #1a1a1a; }
        .notes-section .lbl { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
        .note-item { margin-bottom: 7px; padding-bottom: 7px; border-bottom: 1px dashed #e2e8f0; }
        .note-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .note-meta { font-size: 8.5px; color: #64748b; margin-bottom: 2px; }
        .note-body { font-size: 9.5px; white-space: pre-wrap; line-height: 1.4; }

        /* Firmas */
        .sig-section { display: flex; padding: 16px; }
        .sig-box { flex: 1; padding-right: 20px; font-size: 8.5px; }
        .sig-box:last-child { padding-right: 0; }
        .sig-box .sig-line { border-top: 1px solid #1a1a1a; margin-top: 24px; margin-bottom: 4px; }
        .sig-box .sig-label { color: #555; text-align: center; }

        .bottom-note { padding: 6px 16px 12px; font-size: 8px; color: #555; text-align: center; border-top: 1px solid #cbd5e1; }
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
                        @if(!empty($settings['shop_phone']))Cel.: {{ $settings['shop_phone'] }}@endif
                        @if(!empty($settings['shop_email'])) &nbsp;·&nbsp; {{ $settings['shop_email'] }}@endif
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-title">ORDEN DE TRABAJO</div>
                <div class="doc-number">N° {{ $wo->number }}</div>
                <div class="doc-date">
                    Recibido: {{ $wo->received_at?->format('d/m/Y H:i') ?? '—' }}<br>
                    Entrega prometida: {{ $wo->promised_at?->format('d/m/Y') ?? '—' }}<br>
                    <span class="badge badge-{{ $wo->status }}">{{ strtoupper(str_replace('_', ' ', $wo->status)) }}</span>
                </div>
            </div>
        </div>

        {{-- Franja cliente / vehículo / técnico --}}
        <div class="client-bar">
            <div class="box">
                <div class="lbl">Cliente</div>
                <div class="val">{{ $wo->customer_name ?? '—' }}</div>
            </div>
            <div class="box">
                <div class="lbl">Teléfono</div>
                <div class="val">{{ $wo->customer_phone ?? '—' }}</div>
            </div>
            @php
                $vehicleLine = collect([$wo->vehicle_brand, $wo->vehicle_model, $wo->vehicle_year])->filter()->implode(' ');
                $vehicleLine = collect([$wo->vehicle_plate, $vehicleLine])->filter()->implode(' · ');
            @endphp
            <div class="box">
                <div class="lbl">Vehículo</div>
                <div class="val">{{ $vehicleLine ?: '—' }}</div>
            </div>
            <div class="box">
                <div class="lbl">Técnico asignado</div>
                <div class="val">{{ $wo->employee?->name ?? 'Sin asignar' }}</div>
            </div>
        </div>

        {{-- Problema reportado --}}
        @if($wo->problem)
        <div class="text-section">
            <div class="lbl">Problema reportado por el cliente</div>
            <div class="body">{{ $wo->problem }}</div>
        </div>
        @endif

        {{-- Inspección --}}
        @if($wo->inspection)
        <div class="text-section">
            <div class="lbl">Inspección / diagnóstico</div>
            <div class="body">{{ $wo->inspection }}</div>
        </div>
        @endif

        {{-- Solución --}}
        @if($wo->solution)
        <div class="text-section">
            <div class="lbl">Solución aplicada</div>
            <div class="body">{{ $wo->solution }}</div>
        </div>
        @endif

        {{-- Pendientes --}}
        @if($wo->comments)
        <div class="text-section" style="border-bottom: 1.5px solid #1a1a1a;">
            <div class="lbl">Pendientes</div>
            <div class="body">{{ $wo->comments }}</div>
        </div>
        @endif

        {{-- Servicios y repuestos --}}
        @if($wo->services->isNotEmpty() || $wo->parts->isNotEmpty())
        <div class="items-section">
            @if($wo->services->isNotEmpty())
            <div class="lbl">Servicios / Mano de obra</div>
            <table class="items">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Técnico</th>
                        <th class="text-right" style="width:55px">Horas</th>
                        <th class="text-right" style="width:75px">Tarifa/hr</th>
                        <th class="text-right" style="width:85px">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($wo->services as $svc)
                    <tr>
                        <td>{{ $svc->service_name }}</td>
                        <td>{{ $svc->employee?->name ?? '—' }}</td>
                        <td class="text-right">{{ number_format($svc->hours, 2) }}</td>
                        <td class="text-right">L {{ number_format($svc->hourly_rate, 2) }}</td>
                        <td class="text-right">L {{ number_format($svc->subtotal, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr><td colspan="4">Subtotal servicios</td><td class="text-right">L {{ number_format($wo->subtotal_services, 2) }}</td></tr>
                </tfoot>
            </table>
            @endif

            @if($wo->parts->isNotEmpty())
            <div class="lbl">Repuestos y materiales</div>
            <table class="items">
                <thead>
                    <tr>
                        <th>Repuesto</th>
                        <th style="width:80px">SKU</th>
                        <th class="text-right" style="width:45px">Cant.</th>
                        <th class="text-right" style="width:75px">P. Unit.</th>
                        <th class="text-right" style="width:85px">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($wo->parts as $part)
                    <tr>
                        <td>{{ $part->part_name }}</td>
                        <td>{{ $part->part_sku ?? '—' }}</td>
                        <td class="text-right">{{ $part->quantity }}</td>
                        <td class="text-right">L {{ number_format($part->unit_price, 2) }}</td>
                        <td class="text-right">L {{ number_format($part->subtotal, 2) }}</td>
                    </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr><td colspan="4">Subtotal repuestos</td><td class="text-right">L {{ number_format($wo->subtotal_parts, 2) }}</td></tr>
                </tfoot>
            </table>
            @endif
        </div>
        @endif

        {{-- Totales --}}
        <div class="totals-wrap">
            <div class="totals-box">
                <table>
                    <tr><td class="label">Servicios</td><td class="amount">L {{ number_format($wo->subtotal_services, 2) }}</td></tr>
                    <tr><td class="label">Repuestos</td><td class="amount">L {{ number_format($wo->subtotal_parts, 2) }}</td></tr>
                    <tr class="grand"><td>TOTAL</td><td class="amount">L {{ number_format($wo->total, 2) }}</td></tr>
                </table>
            </div>
        </div>

        {{-- Bitácora de notas --}}
        @if($wo->notes->isNotEmpty())
        <div class="notes-section">
            <div class="lbl">Bitácora interna</div>
            @foreach($wo->notes as $note)
            <div class="note-item">
                <div class="note-meta">{{ $note->user?->name ?? 'Sistema' }} — {{ $note->created_at->format('d/m/Y H:i') }}</div>
                <div class="note-body">{{ $note->body }}</div>
            </div>
            @endforeach
        </div>
        @endif

        {{-- Firmas --}}
        <div class="sig-section">
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Técnico responsable</div>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Recibido conforme — Cliente</div>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Fecha de entrega</div>
            </div>
        </div>

        <div class="bottom-note">
            Documento interno — copia técnica, no válido como factura.
            <div style="margin-top:3px;">Generado el {{ now()->format('d/m/Y H:i') }} · {{ $wo->number }}</div>
        </div>

    </div>

</body>
</html>
