<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>OT {{ $wo->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; }

        .header { background: #1e40af; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-logo { width: 48px; height: 48px; border-radius: 8px; background: white; padding: 3px; }
        .header-left h1 { font-size: 20px; font-weight: bold; }
        .header-left p { font-size: 10px; margin-top: 2px; opacity: 0.85; }
        .header-right { text-align: right; }
        .header-right .ot-number { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
        .header-right .ot-label { font-size: 9px; opacity: 0.8; }

        .status-bar { background: #dbeafe; padding: 6px 20px; display: flex; gap: 24px; }
        .status-bar .item { font-size: 10px; }
        .status-bar .item strong { color: #1e40af; }

        .section { padding: 12px 20px; border-bottom: 1px solid #e2e8f0; }
        .section h3 { font-size: 10px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }

        .grid-2 { display: flex; gap: 20px; }
        .grid-2 > div { flex: 1; }

        .info-row { display: flex; margin-bottom: 4px; }
        .info-label { width: 90px; color: #64748b; font-size: 10px; }
        .info-value { font-size: 10px; font-weight: 600; flex: 1; }

        .problem-box { background: #f8fafc; border-left: 3px solid #1e40af; padding: 8px 10px; font-size: 10px; line-height: 1.5; white-space: pre-wrap; }

        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .text-right { text-align: right; }

        .totals-wrap { display: flex; justify-content: flex-end; padding: 10px 20px; }
        .totals-table { width: 240px; }
        .totals-table td { border: none; padding: 3px 6px; font-size: 10px; }
        .totals-table .total-row td { font-weight: bold; font-size: 13px; border-top: 2px solid #1e40af; color: #1e40af; padding-top: 5px; }

        .notes-list { padding: 0; list-style: none; }
        .note-item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
        .note-item:last-child { border-bottom: none; margin-bottom: 0; }
        .note-meta { font-size: 9px; color: #64748b; margin-bottom: 2px; }
        .note-body { font-size: 10px; white-space: pre-wrap; line-height: 1.4; }

        .signature-section { padding: 20px 20px 12px; }
        .signature-section h3 { font-size: 10px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
        .sig-grid { display: flex; gap: 30px; }
        .sig-box { flex: 1; }
        .sig-line { border-top: 1px solid #1e293b; margin-bottom: 4px; height: 32px; }
        .sig-label { font-size: 9px; color: #64748b; text-align: center; }

        .footer { background: #f8fafc; padding: 8px 20px; text-align: center; font-size: 9px; color: #94a3b8; }

        .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 9px; font-weight: bold; }
        .badge-recibido    { background: #e2e8f0; color: #475569; }
        .badge-diagnostico { background: #fef3c7; color: #92400e; }
        .badge-en_progreso { background: #dbeafe; color: #1e40af; }
        .badge-listo       { background: #d1fae5; color: #065f46; }
        .badge-entregado   { background: #dcfce7; color: #14532d; }
        .badge-cancelado   { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>

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
                <h1>{{ strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO') }}</h1>
                <p>Orden de Trabajo — Copia Técnica</p>
                @if(!empty($settings['shop_address']))<p>{{ $settings['shop_address'] }}</p>@endif
                @if(!empty($settings['shop_phone']))<p>Tel: {{ $settings['shop_phone'] }}</p>@endif
            </div>
        </div>
        <div class="header-right">
            <div class="ot-label">ORDEN DE TRABAJO</div>
            <div class="ot-number">{{ $wo->number }}</div>
        </div>
    </div>

    {{-- Barra de estado --}}
    <div class="status-bar">
        <div class="item">
            Estado: <span class="badge badge-{{ $wo->status }}">{{ strtoupper(str_replace('_', ' ', $wo->status)) }}</span>
        </div>
        <div class="item">
            Recibido: <strong>{{ $wo->received_at?->format('d/m/Y H:i') ?? '—' }}</strong>
        </div>
        <div class="item">
            Entrega prometida: <strong>{{ $wo->promised_at?->format('d/m/Y') ?? '—' }}</strong>
        </div>
        @if($wo->service_type)
        <div class="item">
            Tipo: <strong>{{ $wo->service_type }}</strong>
        </div>
        @endif
    </div>

    {{-- Cliente y Vehículo --}}
    <div class="section">
        <div class="grid-2">
            <div>
                <h3>Cliente</h3>
                <div class="info-row"><span class="info-label">Nombre:</span><span class="info-value">{{ $wo->customer_name ?? '—' }}</span></div>
                <div class="info-row"><span class="info-label">Teléfono:</span><span class="info-value">{{ $wo->customer_phone ?? '—' }}</span></div>
            </div>
            <div>
                <h3>Vehículo</h3>
                <div class="info-row"><span class="info-label">Placa:</span><span class="info-value">{{ $wo->vehicle_plate ?? '—' }}</span></div>
                <div class="info-row"><span class="info-label">Marca / Modelo:</span><span class="info-value">{{ $wo->vehicle_brand }} {{ $wo->vehicle_model }} {{ $wo->vehicle_year }}</span></div>
                @if($wo->vehicle_color)
                <div class="info-row"><span class="info-label">Color:</span><span class="info-value">{{ $wo->vehicle_color }}</span></div>
                @endif
            </div>
        </div>
    </div>

    {{-- Técnico y problema --}}
    <div class="section">
        <div class="grid-2">
            <div>
                <h3>Técnico asignado</h3>
                <div class="info-row"><span class="info-value">{{ $wo->employee?->name ?? 'Sin asignar' }}</span></div>
                @if($wo->employee?->specialty)
                <div class="info-row"><span class="info-label" style="color:#64748b;">{{ $wo->employee->specialty }}</span></div>
                @endif
            </div>
        </div>
    </div>

    {{-- Problema reportado --}}
    @if($wo->problem)
    <div class="section">
        <h3>Problema reportado por el cliente</h3>
        <div class="problem-box">{{ $wo->problem }}</div>
    </div>
    @endif

    {{-- Inspección --}}
    @if($wo->inspection)
    <div class="section">
        <h3>Inspección inicial</h3>
        <div class="problem-box">{{ $wo->inspection }}</div>
    </div>
    @endif

    {{-- Servicios --}}
    @if($wo->services->isNotEmpty())
    <div class="section">
        <h3>Servicios / Mano de obra</h3>
        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th>Técnico</th>
                    <th class="text-right">Horas</th>
                    <th class="text-right">Tarifa/hr</th>
                    <th class="text-right">Subtotal</th>
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
        </table>
    </div>
    @endif

    {{-- Repuestos --}}
    @if($wo->parts->isNotEmpty())
    <div class="section">
        <h3>Repuestos y materiales</h3>
        <table>
            <thead>
                <tr>
                    <th>Repuesto</th>
                    <th>SKU</th>
                    <th class="text-right">Cant.</th>
                    <th class="text-right">P. Unit.</th>
                    <th class="text-right">Subtotal</th>
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
        </table>
    </div>
    @endif

    {{-- Totales --}}
    <div class="totals-wrap">
        <table class="totals-table">
            <tr><td>Servicios:</td><td class="text-right">L {{ number_format($wo->subtotal_services, 2) }}</td></tr>
            <tr><td>Repuestos:</td><td class="text-right">L {{ number_format($wo->subtotal_parts, 2) }}</td></tr>
            <tr class="total-row"><td>TOTAL:</td><td class="text-right">L {{ number_format($wo->total, 2) }}</td></tr>
        </table>
    </div>

    {{-- Solución (si ya está resuelta) --}}
    @if($wo->solution)
    <div class="section">
        <h3>Solución aplicada</h3>
        <div class="problem-box">{{ $wo->solution }}</div>
    </div>
    @endif

    {{-- Bitácora de notas --}}
    @if($wo->notes->isNotEmpty())
    <div class="section">
        <h3>Bitácora interna</h3>
        <ul class="notes-list">
            @foreach($wo->notes as $note)
            <li class="note-item">
                <div class="note-meta">{{ $note->user?->name ?? 'Sistema' }} — {{ $note->created_at->format('d/m/Y H:i') }}</div>
                <div class="note-body">{{ $note->body }}</div>
            </li>
            @endforeach
        </ul>
    </div>
    @endif

    {{-- Firma --}}
    <div class="signature-section">
        <h3>Firmas de conformidad</h3>
        <div class="sig-grid">
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
    </div>

    <div class="footer">
        Documento generado el {{ now()->format('d/m/Y H:i') }} · {{ $wo->number }} · Taller Mecánico
    </div>

</body>
</html>