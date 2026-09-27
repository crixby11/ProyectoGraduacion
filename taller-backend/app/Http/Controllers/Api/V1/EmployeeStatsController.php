<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeStatsController extends Controller
{
    public function __construct(private ReportService $reports) {}

    /**
     * Estadísticas globales: ranking y comparativa de todos los empleados.
     * Query param: period = month | quarter | half | year  (default: month)
     */
    public function index(Request $request)
    {
        $period  = $request->get('period', 'month');
        $from    = $this->reports->employeeFrom($period);

        $nameSql = "TRIM(CONCAT(
            e.first_name, ' ',
            COALESCE(e.second_name, ''), ' ',
            e.last_name, ' ',
            COALESCE(e.second_last_name, '')
        ))";

        $ranking = $this->reports->employeeRanking($from);

        // Tendencia mensual de ingresos (últimos 6 meses, todos los empleados)
        $monthlyTrend = DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at');
            })
            ->join('employees as e', function ($j) {
                $j->on('e.id', '=', 'ws.employee_id')
                  ->whereNull('e.deleted_at')
                  ->where('e.active', true);
            })
            ->where('wo.received_at', '>=', now()->subMonths(5)->startOfMonth()->toDateString())
            ->select(
                DB::raw("DATE_FORMAT(wo.received_at, '%Y-%m') as month"),
                DB::raw("$nameSql as name"),
                'e.id as employee_id',
                DB::raw('COUNT(DISTINCT wo.id) as ot_count'),
                DB::raw('COALESCE(SUM(ws.subtotal), 0) as revenue'),
                DB::raw('COALESCE(SUM(ws.hours), 0) as hours')
            )
            ->groupBy('month', 'e.id', 'e.first_name', 'e.second_name', 'e.last_name', 'e.second_last_name')
            ->orderBy('month')
            ->get();

        return response()->json([
            'ranking'       => $ranking,
            'monthly_trend' => $monthlyTrend,
            'period'        => $period,
            'from'          => $from,
        ]);
    }

    /**
     * Reporte descargable de rendimiento de empleados (PDF o CSV): ranking del
     * período y el detalle de servicios trabajados por cada empleado.
     * Query params: period = month | quarter | half | year, format = pdf | csv
     */
    public function export(Request $request)
    {
        $request->validate([
            'period' => 'nullable|in:month,quarter,half,year',
            'format' => 'required|in:pdf,csv',
        ]);

        $period = $request->get('period', 'month');
        $from = $this->reports->employeeFrom($period);
        $periodLabel = $this->reports->employeePeriodLabel($period);
        $range = $this->reports->date($from) . ' al ' . now()->format('d/m/Y');
        $ranking = $this->reports->employeeRanking($from);
        $work = $this->reports->employeeWorkDetail($from);
        $totals = [
            'revenue' => $ranking->sum('total_revenue'),
            'hours'   => $ranking->sum('total_hours'),
            'ots'     => $ranking->sum('ot_count'),
            'bonuses' => $ranking->sum('total_bonuses'),
        ];
        $stamp = now()->format('Ymd');

        if ($request->get('format') === 'pdf') {
            return $this->reports->pdf('pdfs.report_employees', [
                'periodLabel' => $periodLabel,
                'range'       => $range,
                'ranking'     => $ranking,
                'work'        => $work,
                'totals'      => $totals,
            ], "reporte-rendimiento-empleados-{$stamp}.pdf");
        }

        $blocks = [
            [
                ['Reporte de rendimiento de empleados'],
                ['Período', $periodLabel],
                ['Rango (OTs recibidas)', $range],
            ],
            [
                ['Resumen'],
                ['Ingresos generados (L)', number_format($totals['revenue'], 2, '.', '')],
                ['Horas trabajadas', number_format($totals['hours'], 1, '.', '')],
                ['OTs atendidas (suma por empleado)', $totals['ots']],
                ['Total bonos (L)', number_format($totals['bonuses'], 2, '.', '')],
            ],
            array_merge(
                [['Ranking por ingresos'], ['#', 'Empleado', 'Especialidad', 'OTs', 'Horas', 'Ingresos (L)', 'Bonos (L)']],
                $ranking->values()->map(fn ($r, $i) => [
                    $i + 1, $r->name, $r->specialty, $r->ot_count,
                    number_format($r->total_hours, 1, '.', ''), number_format($r->total_revenue, 2, '.', ''),
                    number_format($r->total_bonuses, 2, '.', ''),
                ])->all()
            ),
        ];

        $detailRows = [['Detalle de servicios por empleado'], ['Empleado', 'OT', 'Recibida', 'Cliente', 'Vehículo', 'Servicio', 'Horas', 'Precio (L)']];
        foreach ($ranking as $r) {
            foreach ($work->get($r->id, collect()) as $w) {
                $detailRows[] = [
                    $r->name, $w->number, $this->reports->date($w->received_at), $w->customer_name,
                    trim("{$w->vehicle_plate} {$w->vehicle_brand} {$w->vehicle_model}"), $w->service_name,
                    number_format($w->hours, 1, '.', ''), number_format($w->subtotal, 2, '.', ''),
                ];
            }
        }
        $blocks[] = $detailRows;

        return $this->reports->csv($blocks, "reporte-rendimiento-empleados-{$stamp}.csv");
    }

    /**
     * Estadísticas individuales de un empleado.
     * Query param: months = 6 | 12  (default: 6)
     */
    public function show(Employee $employee, Request $request)
    {
        $months = min((int) $request->get('months', 6), 12);
        $from   = now()->subMonths($months - 1)->startOfMonth()->toDateString();

        // KPIs totales (todo el tiempo)
        $totals = DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at');
            })
            ->where('ws.employee_id', $employee->id)
            ->select(
                DB::raw('COUNT(DISTINCT wo.id) as ot_count'),
                DB::raw('COALESCE(SUM(ws.hours), 0) as total_hours'),
                DB::raw('COALESCE(SUM(ws.subtotal), 0) as total_revenue')
            )
            ->first();

        $totalBonuses = DB::table('employee_bonuses')
            ->where('employee_id', $employee->id)
            ->whereNull('deleted_at')
            ->sum('amount');

        // Tendencia mensual (ingresos + horas + OTs)
        $monthlyRevenue = DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at');
            })
            ->where('ws.employee_id', $employee->id)
            ->where('wo.received_at', '>=', $from)
            ->select(
                DB::raw("DATE_FORMAT(wo.received_at, '%Y-%m') as month"),
                DB::raw('COUNT(DISTINCT wo.id) as ot_count'),
                DB::raw('COALESCE(SUM(ws.hours), 0) as hours'),
                DB::raw('COALESCE(SUM(ws.subtotal), 0) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        // Tendencia mensual de bonos
        $monthlyBonuses = DB::table('employee_bonuses')
            ->where('employee_id', $employee->id)
            ->whereNull('deleted_at')
            ->where('bonus_month', '>=', $from)
            ->select(
                DB::raw("DATE_FORMAT(bonus_month, '%Y-%m') as month"),
                DB::raw('COALESCE(SUM(amount), 0) as total')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        // Rellenar meses sin datos para que la gráfica sea continua
        $series = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $rev = $monthlyRevenue->get($key);
            $bon = $monthlyBonuses->get($key);
            $series[] = [
                'month'    => $key,
                'ot_count' => $rev ? (int)   $rev->ot_count : 0,
                'hours'    => $rev ? (float)  $rev->hours    : 0,
                'revenue'  => $rev ? (float)  $rev->revenue  : 0,
                'bonuses'  => $bon ? (float)  $bon->total    : 0,
            ];
        }

        return response()->json([
            'totals'        => $totals,
            'total_bonuses' => (float) $totalBonuses,
            'series'        => $series,
        ]);
    }
}
