@php
    $logoPath = public_path('img/logo.jpeg');
    $logoData = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : null;
@endphp
<table class="head">
    <tr>
        <td style="width:56px">@if($logoData)<img class="logo" src="data:image/jpeg;base64,{{ $logoData }}" alt="">@endif</td>
        <td>
            <div class="shop-name">{{ mb_strtoupper($settings['shop_name'] ?? 'TALLER MECÁNICO', 'UTF-8') }}</div>
            <div class="shop-meta">
                @if(!empty($settings['shop_address'])){{ $settings['shop_address'] }}@if(!empty($settings['shop_city'])), {{ $settings['shop_city'] }}@endif<br>@endif
                @if(!empty($settings['shop_phone']))Tel.: {{ $settings['shop_phone'] }}@endif
                @if(!empty($settings['shop_rtn'])) · R.T.N.: {{ $settings['shop_rtn'] }}@endif
            </div>
        </td>
        <td style="width:240px">
            <div class="doc-title">{{ $title }}</div>
            <div class="doc-meta">
                {{ $periodLabel }}<br>
                Del {{ $range }}<br>
                Generado el {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </td>
    </tr>
</table>
<div class="footer">Página <span class="pnum"></span></div>
