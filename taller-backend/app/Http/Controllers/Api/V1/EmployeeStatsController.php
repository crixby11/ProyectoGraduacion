<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeStatsController extends Controller
{
    /**
     * Estadísticas globales: ranking y comparativa de todos los empleados.
     * Query param: period = month | quarter | half | year  (default: month)
     */
    public function index(Request $request)
    {
        $period  = $request->get('period', 'month');
        $from    = match ($period) {
            'quarter' => now()->subMonths(3)->startOfMonth()->toDateString(),
            'half'    => now()->subMonths(6)->startOfMonth()->toDateString(),
            'year'    => now()->subYear()->startOfMonth()->toDateString(),
            default   => now()->startOfMonth()->toDateString(),
        };

        $nameSql = "TRIM(CONCAT(
            e.first_name, ' ',
            COALESCE(e.second_name, ''), ' ',
            e.last_name, ' ',
            COALESCE(e.second_last_name, '')
        ))";

        // Subquery: estadísticas de trabajo por empleado en el período
        $workSub = DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) use ($from) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at')
                  ->where('wo.received_at', '>=', $from);
            })
            ->select(
                'ws.employee_id',
                DB::raw('COUNT(DISTINCT wo.id) as ot_count'),
                DB::raw('COALESCE(SUM(ws.hours), 0) as total_hours'),
                DB::raw('COALESCE(SUM(ws.subtotal), 0) as total_revenue')
            )
            ->groupBy('ws.employee_id');

        // Subquery: bonos en el período
        $bonusSub = DB::table('employee_bonuses as eb')
            ->whereNull('eb.deleted_at')
            ->where('eb.bonus_month', '>=', $from)
            ->select(
                'eb.employee_id',
                DB::raw('COALESCE(SUM(eb.amount), 0) as total_bonuses')
            )
            ->groupBy('eb.employee_id');

        $ranking = DB::table('employees as e')
            ->leftJoinSub($workSub,  'wrk', 'wrk.employee_id', '=', 'e.id')
            ->leftJoinSub($bonusSub, 'bon', 'bon.employee_id', '=', 'e.id')
            ->whereNull('e.deleted_at')
            ->where('e.active', true)
            ->select(
                'e.id',
                DB::raw("$nameSql as name"),
                'e.specialty',
                DB::raw('COALESCE(wrk.ot_count, 0) as ot_count'),
                DB::raw('COALESCE(wrk.total_hours, 0) as total_hours'),
                DB::raw('COALESCE(wrk.total_revenue, 0) as total_revenue'),
                DB::raw('COALESCE(bon.total_bonuses, 0) as total_bonuses')
            )
            ->orderByDesc('total_revenue')
            ->get();

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
