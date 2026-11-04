<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use App\Support\ReportRange;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    /**
     * Reporte del taller para un rango de fechas: indicadores con comparación
     * contra el período anterior, serie para la gráfica, desgloses, estado
     * actual y observaciones.
     * Query params: preset (today, this_week, this_month, custom, ...),
     *               from / to (Y-m-d, requeridos con preset=custom),
     *               group = day | week | month (opcional, se elige solo si falta).
     */
    public function performance(Request $request)
    {
        $range = ReportRange::fromInput($request->validate(ReportRange::rules()));

        return response()->json($this->reports->workshop($range));
    }

    /**
     * Reporte descargable del taller (PDF o CSV) con los mismos parámetros de
     * rango, más el detalle de pagos, OTs entregadas, facturas y saldos.
     */
    public function exportPerformance(Request $request)
    {
        $input = $request->validate(ReportRange::rules() + ['format' => 'required|in:pdf,csv']);
        $range = ReportRange::fromInput($input);
        $report = $this->reports->workshop($range);
        $detail = $this->reports->workshopDetails($range->from, $range->to);
        $stamp = now()->format('Ymd');

        $rows = $this->comparisonRows($report['kpis'], $report['previous']);

        if ($input['format'] === 'pdf') {
            return $this->reports->pdf('pdfs.report_performance', [
                'periodLabel' => $range->label,
                'range'       => $range->rangeText(),
                'rangeObj'    => $range,
                'report'      => $report,
                'comparison'  => $rows,
                'detail'      => $detail,
            ], "reporte-taller-{$stamp}.pdf");
        }

        $n = fn ($v, $d = 2) => $v === null ? '' : number_format($v, $d, '.', '');
        $k = $report['kpis'];
        $s = $report['snapshot'];
        $b = $report['breakdowns'];

        $blocks = [
            [
                ['Reporte del taller'],
                ['Período', $range->label],
                ['Rango', $range->rangeText()],
                ['Comparado con', $range->previousText()],
            ],
            array_merge(
                [['Indicadores'], ['Indicador', 'Actual', 'Anterior', 'Variación (%)']],
                array_map(fn ($r) => [$r['label'], $n($r['current'], $r['decimals']), $n($r['previous'], $r['decimals']), $n($r['change'], 1)], $rows)
            ),
        ];

        if ($report['insights']) {
            $blocks[] = array_merge([['Observaciones']], array_map(fn ($i) => [$i['text']], $report['insights']));
        }

        $blocks[] = array_merge(
            [['Por ' . $range->groupLabel()], ['Período', 'Cobrado (L)', 'Facturado (L)', 'OTs recibidas', 'OTs entregadas']],
            array_map(fn ($r) => [$r['label'], $n($r['collected']), $n($r['invoiced']), $r['ots_received'], $r['ots_delivered']], $report['series'])
        );
        $blocks[] = [
            ['Origen de la facturación'],
            ['Servicios (mano de obra) (L)', $n($k['services_revenue'])],
            ['Repuestos (L)', $n($k['parts_revenue'])],
            ['Margen de repuestos de inventario (L)', $n($k['parts_margin'])],
            ['Margen de repuestos (%)', $n($k['parts_margin_pct'], 1)],
        ];
        $blocks[] = array_merge(
            [['Cobros por método de pago'], ['Método', 'Pagos', 'Total (L)']],
            $b['payment_methods']->map(fn ($r) => [ucfirst($r['method']), $r['count'], $n($r['total'])])->all()
        );
        $blocks[] = array_merge(
            [['Servicios más vendidos (OTs entregadas)'], ['Servicio', 'Veces', 'Horas', 'Total (L)']],
            $b['top_services']->map(fn ($r) => [$r['name'], $r['count'], $n($r['hours'], 1), $n($r['total'])])->all()
        );
        $blocks[] = array_merge(
            [['Repuestos más vendidos (OTs entregadas)'], ['Repuesto', 'Cantidad', 'Total (L)']],
            $b['top_parts']->map(fn ($r) => [$r['name'], $r['quantity'], $n($r['total'])])->all()
        );
        $blocks[] = array_merge(
            [['Mejores clientes (facturado)'], ['Cliente', 'Facturas', 'Total (L)', 'Saldo (L)']],
            $b['top_customers']->map(fn ($r) => [$r['name'], $r['count'], $n($r['total']), $n($r['balance'])])->all()
        );
        $blocks[] = [
            ['Estado actual del taller'],
            ['OTs abiertas', $s['open_total']],
            ['Recibidas', $s['open_ots']['recibido']],
            ['En diagnóstico', $s['open_ots']['diagnostico']],
            ['En progreso', $s['open_ots']['en_progreso']],
            ['Listas para entregar', $s['open_ots']['listo']],
            ['OTs atrasadas', $s['overdue_ots']],
            ['Repuestos con stock bajo', $s['low_stock']],
        ];
        $blocks[] = [
            ['Cuentas por cobrar (todas las facturas con saldo)'],
            ['Total por cobrar (L)', $n($s['receivables']['total'])],
            ['0 a 30 días (L)', $n($s['receivables']['d0_30'])],
            ['31 a 60 días (L)', $n($s['receivables']['d31_60'])],
            ['61 a 90 días (L)', $n($s['receivables']['d61_90'])],
            ['Más de 90 días (L)', $n($s['receivables']['d90plus'])],
        ];
        $blocks[] = array_merge(
            [['Pagos cobrados'], ['Fecha', 'Factura', 'Cliente', 'Método', 'Monto (L)', 'Referencia']],
            $detail['payments']->map(fn ($p) => [
                $this->reports->date($p->payment_date), $p->invoice?->number, $p->customer?->name,
                $p->method, $n($p->amount), $p->reference,
            ])->all()
        );
        $blocks[] = array_merge(
            [['OTs entregadas'], ['OT', 'Recibida', 'Entrega', 'Cliente', 'Vehículo', 'Total (L)']],
            $detail['delivered']->map(fn ($w) => [
                $w->number, $this->reports->date($w->received_at), $this->reports->date($w->delivered_at), $w->customer_name,
                trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}"), $n($w->total),
            ])->all()
        );
        $blocks[] = array_merge(
            [['Facturas emitidas'], ['Factura', 'Fecha', 'Cliente', 'OT', 'Total (L)', 'Pagado (L)', 'Saldo (L)', 'Estado']],
            $detail['invoices']->map(fn ($i) => [
                $i->number, $this->reports->date($i->issued_at), $i->customer?->name, $i->workOrder?->number,
                $n($i->total), $n($i->amount_paid), $n($i->balance), $i->status,
            ])->all()
        );
        $blocks[] = array_merge(
            [['Facturas con saldo pendiente'], ['Factura', 'Fecha', 'Días', 'Cliente', 'OT', 'Total (L)', 'Saldo (L)']],
            $detail['receivables']->map(fn ($i) => [
                $i->number, $this->reports->date($i->issued_at), $i->issued_at ? (int) $i->issued_at->diffInDays(now()) : '',
                $i->customer?->name, $i->workOrder?->number, $n($i->total), $n($i->balance),
            ])->all()
        );

        return $this->reports->csv($blocks, "reporte-taller-{$stamp}.csv");
    }

    /** Filas de la tabla "actual vs anterior" que comparten el PDF y el CSV. */
    private function comparisonRows(array $k, array $p): array
    {
        $defs = [
            ['collected', 'Cobrado (L)', 2],
            ['invoiced', 'Facturado (L)', 2],
            ['invoice_count', 'Facturas emitidas', 0],
            ['avg_ticket', 'Ticket promedio por factura (L)', 2],
            ['receivable', 'Saldo pendiente de lo facturado (L)', 2],
            ['ots_received', 'OTs recibidas', 0],
            ['ots_delivered', 'OTs entregadas', 0],
            ['ots_cancelled', 'OTs canceladas', 0],
            ['avg_turnaround_days', 'Días promedio de entrega', 1],
            ['on_time_rate', 'Entregas a tiempo (%)', 1],
            ['quotes_issued', 'Cotizaciones emitidas', 0],
            ['conversion_rate', 'Cotizaciones aprobadas (%)', 1],
            ['appointments', 'Citas', 0],
            ['no_show_rate', 'Citas sin presentarse (%)', 1],
            ['supplier_payments', 'Pagos a proveedores (L)', 2],
            ['net_cash', 'Flujo neto: cobros menos pagos a proveedores (L)', 2],
            ['parts_margin', 'Margen de repuestos (L)', 2],
        ];

        return array_map(fn ($d) => [
            'key'      => $d[0],
            'label'    => $d[1],
            'decimals' => $d[2],
            'current'  => $k[$d[0]],
            'previous' => $p[$d[0]],
            'change'   => ReportService::change($k[$d[0]], $p[$d[0]]),
        ], $defs);
    }
}
