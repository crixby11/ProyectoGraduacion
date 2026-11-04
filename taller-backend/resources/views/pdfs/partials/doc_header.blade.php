{{-- Encabezado compartido de los documentos impresos.
     Variables: $settings, $title, $number (opcional; solo números oficiales, nunca
     correlativos internos del sistema como COT-2026-0001 u OT-2026-0001), $date (Carbon),
     $dateLabel (opcional), $meta (líneas opcionales bajo el número). --}}
@php
    $logoPath = public_path('img/logo.jpeg');
    $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
@endphp

<div class="page-num">Página <span class="n"></span></div>

<table>
    <tr>
        <td style="width:56pt">@if($logoData)<img class="logo" src="data:image/jpeg;base64,{{ $logoData }}" alt="">@endif</td>
        <td>
            <div class="shop-name">{{ mb_strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO', 'UTF-8') }}</div>
            @if(!empty($settings['shop_owner']))<div class="shop-owner">PROP. {{ mb_strtoupper($settings['shop_owner'], 'UTF-8') }}</div>@endif
            <div class="shop-meta">
                @if(!empty($settings['shop_address'])){{ $settings['shop_address'] }}@if(!empty($settings['shop_city'])), {{ $settings['shop_city'] }}@endif<br>@endif
                @if(!empty($settings['shop_phone']))Cel.: {{ $settings['shop_phone'] }}@endif
                @if(!empty($settings['shop_email'])), Email: {{ $settings['shop_email'] }}@endif
            </div>
        </td>
        <td style="width:20pt"></td>
    </tr>
</table>

<table style="margin-top:6pt">
    <tr>
        <td style="vertical-align:bottom">
            <div class="doc-title">{{ $title }}</div>
            @if(!empty($number))<div class="doc-number">Nº&nbsp;&nbsp;{{ $number }}</div>@endif
            @foreach($meta ?? [] as $line)
                <div class="doc-meta">{!! $line !!}</div>
            @endforeach
        </td>
        <td style="width:150pt">
            <div class="c b" style="font-size:6.5pt; margin-bottom:1.5pt">{{ $dateLabel ?? 'FECHA DE EMISIÓN' }}</div>
            <table class="date-box">
                <tr><th>DÍA</th><th>MES</th><th>AÑO</th></tr>
                <tr><td>{{ $date->format('d') }}</td><td>{{ $date->format('m') }}</td><td>{{ $date->format('Y') }}</td></tr>
            </table>
        </td>
    </tr>
</table>
