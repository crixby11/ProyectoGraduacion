<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\WorkOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Cálculos de los reportes (pantalla, PDF y CSV comparten la misma fuente
 * para que las cifras siempre cuadren entre sí).
 */
class ReportService
{
    private const EMPLOYEE_NAME_SQL = "TRIM(CONCAT(
            e.first_name, ' ',
            COALESCE(e.second_name, ''), ' ',
            e.last_name, ' ',
            COALESCE(e.second_last_name, '')
        ))";

    // ── Rendimiento del taller ──────────────────────────────────────────

    /** Ingresos cobrados y OTs entregadas por mes (12) o trimestre (8). */
    public function performance(string $period): array
    {
        $period = $period === 'quarter' ? 'quarter' : 'month';
        $bucketsCount = $period === 'quarter' ? 8 : 12;

        if ($period === 'quarter') {
            $revenueExpr = "CONCAT(YEAR(payment_date), '-Q', QUARTER(payment_date))";
            $otExpr = "CONCAT(YEAR(delivered_at), '-Q', QUARTER(delivered_at))";
            $from = now()->subQuarters($bucketsCount - 1)->startOfQuarter()->toDateString();
        } else {
            $revenueExpr = "DATE_FORMAT(payment_date, '%Y-%m')";
            $otExpr = "DATE_FORMAT(delivered_at, '%Y-%m')";
            $from = now()->subMonths($bucketsCount - 1)->startOfMonth()->toDateString();
        }

        $revenueRows = Payment::select(DB::raw("$revenueExpr as bucket"), DB::raw('SUM(amount) as total'))
            ->where('payment_date', '>=', $from)
            ->groupBy('bucket')
            ->get()
            ->keyBy('bucket');

        $otRows = WorkOrder::select(DB::raw("$otExpr as bucket"), DB::raw('COUNT(*) as total'))
            ->where('status', 'entregado')
            ->where('delivered_at', '>=', $from)
            ->groupBy('bucket')
            ->get()
            ->keyBy('bucket');

        $buckets = [];
        for ($i = $bucketsCount - 1; $i >= 0; $i--) {
            if ($period === 'quarter') {
                $d = now()->subQuarters($i);
                $buckets[] = $d->year . '-Q' . (intdiv($d->month - 1, 3) + 1);
            } else {
                $buckets[] = now()->subMonths($i)->format('Y-m');
            }
        }

        $data = collect($buckets)->map(fn ($key) => [
            'bucket'   => $key,
            'revenue'  => (float) ($revenueRows->get($key)?->total ?? 0),
            'ot_count' => (int) ($otRows->get($key)?->total ?? 0),
        ]);

        return ['period' => $period, 'from' => $from, 'data' => $data];
    }

    /** Detalle que respalda las cifras del reporte de rendimiento. */
    public function performanceDetails(string $from): array
    {
        return [
            'payments' => Payment::with(['invoice:id,number', 'customer'])
                ->where('payment_date', '>=', $from)
                ->orderBy('payment_date')->orderBy('id')
                ->get(),
            'delivered' => WorkOrder::where('status', 'entregado')
                ->where('delivered_at', '>=', $from)
                ->orderBy('delivered_at')
                ->get(),
            'invoices' => Invoice::with(['customer', 'workOrder:id,number'])
                ->where('issued_at', '>=', $from)
                ->orderBy('issued_at')
                ->get(),
        ];
    }

    // ── Rendimiento de empleados ────────────────────────────────────────

    public function employeeFrom(string $period): string
    {
        return match ($period) {
            'quarter' => now()->subMonths(3)->startOfMonth()->toDateString(),
            'half'    => now()->subMonths(6)->startOfMonth()->toDateString(),
            'year'    => now()->subYear()->startOfMonth()->toDateString(),
            default   => now()->startOfMonth()->toDateString(),
        };
    }

    public function employeePeriodLabel(string $period): string
    {
        return match ($period) {
            'quarter' => 'Últimos 3 meses',
            'half'    => 'Últimos 6 meses',
            'year'    => 'Este año (últimos 12 meses)',
            default   => 'Este mes',
        };
    }

    /** Ranking de empleados activos con OTs, horas, ingresos y bonos del período. */
    public function employeeRanking(string $from)
    {
        $nameSql = self::EMPLOYEE_NAME_SQL;

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

        $bonusSub = DB::table('employee_bonuses as eb')
            ->whereNull('eb.deleted_at')
            ->where('eb.bonus_month', '>=', $from)
            ->select('eb.employee_id', DB::raw('COALESCE(SUM(eb.amount), 0) as total_bonuses'))
            ->groupBy('eb.employee_id');

        return DB::table('employees as e')
            ->leftJoinSub($workSub, 'wrk', 'wrk.employee_id', '=', 'e.id')
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
    }

    /** Servicios trabajados por cada empleado activo en el período, agrupados por empleado. */
    public function employeeWorkDetail(string $from)
    {
        return DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) use ($from) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at')
                  ->where('wo.received_at', '>=', $from);
            })
            ->join('employees as e', function ($j) {
                $j->on('e.id', '=', 'ws.employee_id')
                  ->whereNull('e.deleted_at')
                  ->where('e.active', true);
            })
            ->select(
                'ws.employee_id',
                'wo.number', 'wo.received_at', 'wo.customer_name',
                'wo.vehicle_plate', 'wo.vehicle_brand', 'wo.vehicle_model', 'wo.status',
                'ws.service_name', 'ws.hours', 'ws.subtotal'
            )
            ->orderBy('wo.received_at')->orderBy('wo.id')
            ->get()
            ->groupBy('employee_id');
    }

    // ── Salidas: PDF y CSV ──────────────────────────────────────────────

    public function pdf(string $view, array $data, string $filename)
    {
        $pdf = Pdf::loadView($view, $data + ['settings' => Setting::all_map(), 'generatedAt' => now()])
            ->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }

    /**
     * CSV que Excel abre directo: UTF-8 con BOM, comas, decimales con punto.
     * $blocks = lista de bloques; cada bloque es una lista de filas (arrays).
     */
    public function csv(array $blocks, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($blocks) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            foreach ($blocks as $i => $rows) {
                if ($i > 0) {
                    fputcsv($out, []);
                }
                foreach ($rows as $row) {
                    fputcsv($out, $row);
                }
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function bucketLabel(string $bucket, string $period): string
    {
        $months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        if ($period === 'quarter') {
            [$y, $q] = explode('-Q', $bucket);

            return "T{$q} {$y}";
        }
        [$y, $m] = explode('-', $bucket);

        return $months[(int) $m - 1] . ' ' . $y;
    }

    public function date($value): string
    {
        return $value ? Carbon::parse($value)->format('d/m/Y') : '';
    }
}
