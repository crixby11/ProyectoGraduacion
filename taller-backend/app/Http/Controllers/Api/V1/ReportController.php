<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    /**
     * Rendimiento del taller a lo largo del tiempo: ingresos cobrados y OTs
     * entregadas, agrupados por mes o por trimestre.
     * Query param: period = month | quarter (default: month)
     */
    public function performance(Request $request)
    {
        $result = $this->reports->performance((string) $request->get('period'));

        return response()->json([
            'period' => $result['period'],
            'data'   => $result['data'],
        ]);
    }

    /**
     * Reporte descargable del rendimiento del taller (PDF o CSV): resumen,
     * cifras por período y el detalle de pagos, OTs entregadas y facturas.
     * Query params: period = month | quarter, format = pdf | csv
     */
    public function exportPerformance(Request $request)
    {
        $request->validate([
            'period' => 'nullable|in:month,quarter',
            'format' => 'required|in:pdf,csv',
        ]);

        $result = $this->reports->performance((string) $request->get('period'));
        $period = $result['period'];
        $rows = $result['data']->map(fn ($r) => $r + ['label' => $this->reports->bucketLabel($r['bucket'], $period)]);
        $detail = $this->reports->performanceDetails($result['from']);

        $totalRevenue = $rows->sum('revenue');
        $totalOts = $rows->sum('ot_count');
        $summary = [
            'revenue'    => $totalRevenue,
            'ots'        => $totalOts,
            'avg_ticket' => $totalOts > 0 ? $totalRevenue / $totalOts : 0,
        ];
        $periodLabel = $period === 'quarter' ? 'Últimos 8 trimestres' : 'Últimos 12 meses';
        $range = $this->reports->date($result['from']) . ' al ' . now()->format('d/m/Y');
        $stamp = now()->format('Ymd');

        if ($request->get('format') === 'pdf') {
            return $this->reports->pdf('pdfs.report_performance', [
                'periodLabel' => $periodLabel,
                'range'       => $range,
                'summary'     => $summary,
                'rows'        => $rows,
                'detail'      => $detail,
            ], "reporte-rendimiento-taller-{$stamp}.pdf");
        }

        $blocks = [
            [
                ['Reporte de rendimiento del taller'],
                ['Período', $periodLabel],
                ['Rango', $range],
            ],
            [
                ['Resumen'],
                ['Ingresos cobrados (L)', number_format($summary['revenue'], 2, '.', '')],
                ['Autos entregados', $summary['ots']],
                ['Ticket promedio (L)', number_format($summary['avg_ticket'], 2, '.', '')],
            ],
            array_merge(
                [['Por ' . ($period === 'quarter' ? 'trimestre' : 'mes')], ['Período', 'Ingresos cobrados (L)', 'Autos entregados']],
                $rows->map(fn ($r) => [$r['label'], number_format($r['revenue'], 2, '.', ''), $r['ot_count']])->all()
            ),
            array_merge(
                [['Pagos cobrados'], ['Fecha', 'Factura', 'Cliente', 'Método', 'Monto (L)', 'Referencia']],
                $detail['payments']->map(fn ($p) => [
                    $this->reports->date($p->payment_date), $p->invoice?->number, $p->customer?->name,
                    $p->method, number_format($p->amount, 2, '.', ''), $p->reference,
                ])->all()
            ),
            array_merge(
                [['OTs entregadas'], ['OT', 'Entrega', 'Cliente', 'Vehículo', 'Total (L)']],
                $detail['delivered']->map(fn ($w) => [
                    $w->number, $this->reports->date($w->delivered_at), $w->customer_name,
                    trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}"), number_format($w->total, 2, '.', ''),
                ])->all()
            ),
            array_merge(
                [['Facturas emitidas'], ['Factura', 'Fecha', 'Cliente', 'OT', 'Total (L)', 'Pagado (L)', 'Saldo (L)', 'Estado']],
                $detail['invoices']->map(fn ($i) => [
                    $i->number, $this->reports->date($i->issued_at), $i->customer?->name, $i->workOrder?->number,
                    number_format($i->total, 2, '.', ''), number_format($i->amount_paid, 2, '.', ''),
                    number_format($i->balance, 2, '.', ''), $i->status,
                ])->all()
            ),
        ];

        return $this->reports->csv($blocks, "reporte-rendimiento-taller-{$stamp}.csv");
    }
}
