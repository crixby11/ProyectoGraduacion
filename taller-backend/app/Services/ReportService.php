<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\WorkOrder;
use App\Support\ReportRange;
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

    /**
     * Reporte completo del taller para un rango: indicadores del período y del
     * período anterior, serie para la gráfica, desgloses, estado actual y
     * observaciones automáticas.
     */
    public function workshop(ReportRange $range): array
    {
        $kpis = $this->kpis($range->from, $range->to);
        $previous = $this->kpis($range->prevFrom, $range->prevTo);
        $snapshot = $this->snapshot();

        return [
            'range'      => $range->toArray(),
            'kpis'       => $kpis,
            'previous'   => $previous,
            'series'     => $this->series($range),
            'breakdowns' => $this->breakdowns($range->from, $range->to),
            'snapshot'   => $snapshot,
            'insights'   => $this->insights($kpis, $previous, $snapshot, $range),
        ];
    }

    /** OTs entregadas dentro del rango (base de los cálculos de trabajo terminado). */
    private function deliveredQuery(Carbon $from, Carbon $to)
    {
        return DB::table('work_orders as wo')
            ->whereNull('wo.deleted_at')
            ->where('wo.status', 'entregado')
            ->whereBetween('wo.delivered_at', [$from, $to]);
    }

    /** Facturas válidas (no anuladas) emitidas dentro del rango. */
    private function invoicesQuery(Carbon $from, Carbon $to)
    {
        return Invoice::where('status', '!=', 'anulada')->whereBetween('issued_at', [$from, $to]);
    }

    /** Indicadores de un rango. */
    public function kpis(Carbon $from, Carbon $to): array
    {
        $dates = [$from->toDateString(), $to->toDateString()];

        $collected = (float) Payment::whereBetween('payment_date', $dates)->sum('amount');

        $inv = $this->invoicesQuery($from, $to)->selectRaw(
            'COUNT(*) as n, COALESCE(SUM(total), 0) as total, COALESCE(SUM(balance), 0) as balance,
             COALESCE(SUM(subtotal_services), 0) as services, COALESCE(SUM(subtotal_parts), 0) as parts'
        )->first();

        $received = DB::table('work_orders')->whereNull('deleted_at')->whereBetween('received_at', [$from, $to])
            ->selectRaw("COUNT(*) as n, SUM(status = 'cancelado') as cancelled")->first();

        $delivered = $this->deliveredQuery($from, $to)->selectRaw(
            'COUNT(*) as n,
             AVG(TIMESTAMPDIFF(HOUR, wo.received_at, wo.delivered_at)) as avg_hours,
             SUM(wo.promised_at IS NOT NULL) as with_promise,
             SUM(wo.promised_at IS NOT NULL AND DATE(wo.delivered_at) <= wo.promised_at) as on_time'
        )->first();

        $quotes = DB::table('quotes')->whereNull('deleted_at')
            ->whereBetween(DB::raw('COALESCE(issued_at, created_at)'), [$from, $to])
            ->selectRaw(
                "COUNT(*) as n, COALESCE(SUM(total), 0) as total,
                 SUM(status IN ('aprobada', 'convertida')) as won,
                 COALESCE(SUM(CASE WHEN status IN ('aprobada', 'convertida') THEN total ELSE 0 END), 0) as won_total,
                 SUM(status = 'rechazada') as rejected"
            )->first();

        $appts = DB::table('appointments')->whereNull('deleted_at')->whereBetween('start_at', [$from, $to])
            ->selectRaw(
                "COUNT(*) as n, SUM(status = 'completada') as completed,
                 SUM(status = 'no_presente') as no_show, SUM(status = 'cancelada') as cancelled"
            )->first();

        $supplierPayments = (float) DB::table('supplier_payments')
            ->whereBetween('payment_date', $dates)->sum('amount');

        $purchases = (float) DB::table('purchase_orders')->whereNull('deleted_at')->where('status', 'recibida')
            ->whereBetween('received_at', [$from, $to])->sum('total');

        // Margen de repuestos de inventario en OTs entregadas: venta vs costo
        // registrado en el movimiento de salida (costo real al momento de usarlo).
        $deliveredIds = $this->deliveredQuery($from, $to)->select('wo.id');
        $partsSold = (float) DB::table('wo_parts')->whereIn('work_order_id', $deliveredIds)
            ->whereNotNull('inventory_id')->sum('subtotal');
        $partsCost = (float) DB::table('inventory_movements')->whereIn('work_order_id', $deliveredIds)
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'salida' THEN quantity * unit_cost ELSE -quantity * unit_cost END), 0) as cost")
            ->value('cost');

        $invoiceCount = (int) $inv->n;
        $quoteCount = (int) $quotes->n;
        $apptCount = (int) $appts->n;
        $withPromise = (int) $delivered->with_promise;

        return [
            'collected'              => round($collected, 2),
            'invoiced'               => round((float) $inv->total, 2),
            'invoice_count'          => $invoiceCount,
            'avg_ticket'             => $invoiceCount > 0 ? round($inv->total / $invoiceCount, 2) : 0,
            'receivable'             => round((float) $inv->balance, 2),
            'services_revenue'       => round((float) $inv->services, 2),
            'parts_revenue'          => round((float) $inv->parts, 2),
            'ots_received'           => (int) $received->n,
            'ots_cancelled'          => (int) $received->cancelled,
            'ots_delivered'          => (int) $delivered->n,
            'avg_turnaround_days'    => $delivered->avg_hours !== null ? round($delivered->avg_hours / 24, 1) : null,
            'on_time_rate'           => $withPromise > 0 ? round($delivered->on_time / $withPromise * 100, 1) : null,
            'quotes_issued'          => $quoteCount,
            'quotes_won'             => (int) $quotes->won,
            'quotes_rejected'        => (int) $quotes->rejected,
            'quotes_total'           => round((float) $quotes->total, 2),
            'quotes_won_total'       => round((float) $quotes->won_total, 2),
            'conversion_rate'        => $quoteCount > 0 ? round($quotes->won / $quoteCount * 100, 1) : null,
            'appointments'           => $apptCount,
            'appointments_completed' => (int) $appts->completed,
            'appointments_no_show'   => (int) $appts->no_show,
            'appointments_cancelled' => (int) $appts->cancelled,
            'no_show_rate'           => $apptCount > 0 ? round($appts->no_show / $apptCount * 100, 1) : null,
            'supplier_payments'      => round($supplierPayments, 2),
            'purchases'              => round($purchases, 2),
            'net_cash'               => round($collected - $supplierPayments, 2),
            'parts_sold'             => round($partsSold, 2),
            'parts_cost'             => round($partsCost, 2),
            'parts_margin'           => round($partsSold - $partsCost, 2),
            'parts_margin_pct'       => $partsSold > 0 ? round(($partsSold - $partsCost) / $partsSold * 100, 1) : null,
        ];
    }

    /** Cobros, facturación y OTs agrupados por día, semana o mes. */
    public function series(ReportRange $range): array
    {
        $from = $range->from;
        $to = $range->to;

        $collected = Payment::selectRaw($range->bucketSql('payment_date') . ' as bucket, SUM(amount) as total')
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('bucket')->pluck('total', 'bucket');

        $invoiced = $this->invoicesQuery($from, $to)
            ->selectRaw($range->bucketSql('issued_at') . ' as bucket, SUM(total) as total')
            ->groupBy('bucket')->pluck('total', 'bucket');

        $received = DB::table('work_orders')->whereNull('deleted_at')->whereBetween('received_at', [$from, $to])
            ->selectRaw($range->bucketSql('received_at') . ' as bucket, COUNT(*) as total')
            ->groupBy('bucket')->pluck('total', 'bucket');

        $delivered = $this->deliveredQuery($from, $to)
            ->selectRaw($range->bucketSql('wo.delivered_at') . ' as bucket, COUNT(*) as total')
            ->groupBy('bucket')->pluck('total', 'bucket');

        return array_map(fn ($b) => [
            'bucket'        => $b['key'],
            'label'         => $b['label'],
            'collected'     => round((float) ($collected[$b['key']] ?? 0), 2),
            'invoiced'      => round((float) ($invoiced[$b['key']] ?? 0), 2),
            'ots_received'  => (int) ($received[$b['key']] ?? 0),
            'ots_delivered' => (int) ($delivered[$b['key']] ?? 0),
        ], $range->buckets());
    }

    /** Desgloses del rango: métodos de pago y lo más vendido. */
    public function breakdowns(Carbon $from, Carbon $to): array
    {
        $deliveredIds = $this->deliveredQuery($from, $to)->select('wo.id');

        return [
            'payment_methods' => Payment::whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
                ->selectRaw('method, COUNT(*) as count, SUM(amount) as total')
                ->groupBy('method')->orderByDesc('total')->get()
                ->map(fn ($r) => ['method' => $r->method, 'count' => (int) $r->count, 'total' => round((float) $r->total, 2)])
                ->values(),

            'top_services' => DB::table('wo_services')->whereIn('work_order_id', $deliveredIds)
                ->selectRaw('service_name as name, COUNT(*) as count, COALESCE(SUM(hours), 0) as hours, COALESCE(SUM(subtotal), 0) as total')
                ->groupBy('service_name')->orderByDesc('total')->limit(10)->get()
                ->map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->count, 'hours' => round((float) $r->hours, 1), 'total' => round((float) $r->total, 2)]),

            'top_parts' => DB::table('wo_parts')->whereIn('work_order_id', $deliveredIds)
                ->selectRaw('part_name as name, COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(subtotal), 0) as total')
                ->groupBy('part_name')->orderByDesc('total')->limit(10)->get()
                ->map(fn ($r) => ['name' => $r->name, 'quantity' => (int) $r->quantity, 'total' => round((float) $r->total, 2)]),

            'top_customers' => DB::table('invoices as i')
                ->join('work_orders as wo', 'wo.id', '=', 'i.work_order_id')
                ->whereNull('i.deleted_at')->where('i.status', '!=', 'anulada')
                ->whereBetween('i.issued_at', [$from, $to])
                ->selectRaw("COALESCE(NULLIF(wo.customer_name, ''), 'Sin nombre') as name, COUNT(*) as count, SUM(i.total) as total, SUM(i.balance) as balance")
                ->groupBy('name')->orderByDesc('total')->limit(10)->get()
                ->map(fn ($r) => ['name' => $r->name, 'count' => (int) $r->count, 'total' => round((float) $r->total, 2), 'balance' => round((float) $r->balance, 2)]),
        ];
    }

    /** Estado actual del taller (no depende del rango): carga, atrasos, cobros pendientes y stock. */
    public function snapshot(): array
    {
        $open = DB::table('work_orders')->whereNull('deleted_at')
            ->whereIn('status', ['recibido', 'diagnostico', 'en_progreso', 'listo'])
            ->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status');

        $overdue = DB::table('work_orders')->whereNull('deleted_at')
            ->whereNotIn('status', ['entregado', 'cancelado'])
            ->whereNotNull('promised_at')->where('promised_at', '<', now()->toDateString())
            ->count();

        $aging = DB::table('invoices')->whereNull('deleted_at')->whereIn('status', ['pendiente', 'parcial'])
            ->selectRaw(
                'COUNT(*) as n, COALESCE(SUM(balance), 0) as total,
                 COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), issued_at) <= 30 THEN balance ELSE 0 END), 0) as d30,
                 COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), issued_at) BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0) as d60,
                 COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), issued_at) BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0) as d90,
                 COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), issued_at) > 90 THEN balance ELSE 0 END), 0) as d90plus'
            )->first();

        $lowStock = DB::table('inventory')->whereNull('deleted_at')->where('active', true)
            ->whereColumn('stock', '<=', 'min_stock')->count();

        return [
            'open_ots' => [
                'recibido'    => (int) ($open['recibido'] ?? 0),
                'diagnostico' => (int) ($open['diagnostico'] ?? 0),
                'en_progreso' => (int) ($open['en_progreso'] ?? 0),
                'listo'       => (int) ($open['listo'] ?? 0),
            ],
            'open_total'  => (int) $open->sum(),
            'overdue_ots' => $overdue,
            'receivables' => [
                'count'   => (int) $aging->n,
                'total'   => round((float) $aging->total, 2),
                'd0_30'   => round((float) $aging->d30, 2),
                'd31_60'  => round((float) $aging->d60, 2),
                'd61_90'  => round((float) $aging->d90, 2),
                'd90plus' => round((float) $aging->d90plus, 2),
            ],
            'low_stock' => $lowStock,
        ];
    }

    /** Variación porcentual; null si no hay base de comparación. */
    public static function change(?float $current, ?float $previous): ?float
    {
        if ($current === null || $previous === null) {
            return null;
        }
        if ((float) $previous === 0.0) {
            return (float) $current === 0.0 ? 0.0 : null;
        }

        return round(($current - $previous) / abs($previous) * 100, 1);
    }

    /** Observaciones en lenguaje simple para apoyar la toma de decisiones. */
    public function insights(array $k, array $p, array $s, ReportRange $range): array
    {
        $out = [];
        $money = fn ($n) => 'L ' . number_format($n, 2);
        $cmp = $range->compareLabel;

        $c = self::change($k['collected'], $p['collected']);
        if ($c !== null && abs($c) >= 10) {
            $out[] = ['type' => $c > 0 ? 'good' : 'bad',
                'text' => sprintf('Los cobros %s %s%% (%s) %s.', $c > 0 ? 'subieron' : 'bajaron', number_format(abs($c), 1), $money($k['collected']), $cmp)];
        }

        if ($k['invoiced'] > 0 && $k['collected'] < $k['invoiced'] * 0.7) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('Se cobró %s de %s facturados en el período. Conviene dar seguimiento a los saldos pendientes.', $money($k['collected']), $money($k['invoiced']))];
        }

        $old = $s['receivables']['d61_90'] + $s['receivables']['d90plus'];
        if ($old > 0) {
            $out[] = ['type' => 'bad',
                'text' => sprintf('Hay %s en facturas con más de 60 días sin pagar.', $money($old))];
        }

        if ($s['overdue_ots'] > 0) {
            $out[] = ['type' => 'bad',
                'text' => sprintf('%d orden(es) de trabajo pasaron su fecha de entrega prometida y siguen abiertas.', $s['overdue_ots'])];
        }

        if ($k['on_time_rate'] !== null && $k['on_time_rate'] < 80) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('Solo el %s%% de las entregas se hizo en la fecha prometida.', number_format($k['on_time_rate'], 1))];
        }

        if ($k['conversion_rate'] !== null && $k['quotes_issued'] >= 3 && $k['conversion_rate'] < 50) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('Se aprobaron %d de %d cotizaciones (%s%%). Revise precios o el seguimiento a clientes.', $k['quotes_won'], $k['quotes_issued'], number_format($k['conversion_rate'], 1))];
        }

        if ($k['no_show_rate'] !== null && $k['appointments'] >= 3 && $k['no_show_rate'] >= 15) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('El %s%% de las citas no se presentó. Los recordatorios por WhatsApp pueden ayudar.', number_format($k['no_show_rate'], 1))];
        }

        if ($k['parts_margin_pct'] !== null && $k['parts_margin_pct'] < 20) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('El margen en repuestos fue de %s%%. Revise los precios de venta frente al costo.', number_format($k['parts_margin_pct'], 1))];
        }

        if ($k['net_cash'] < 0) {
            $out[] = ['type' => 'bad',
                'text' => sprintf('Se pagó más a proveedores de lo que se cobró a clientes (%s).', $money($k['net_cash']))];
        }

        if ($s['low_stock'] > 0) {
            $out[] = ['type' => 'warn',
                'text' => sprintf('%d repuesto(s) están en o por debajo del stock mínimo.', $s['low_stock'])];
        }

        $t = self::change($k['avg_ticket'], $p['avg_ticket']);
        if ($t !== null && abs($t) >= 15 && $k['invoice_count'] > 0) {
            $out[] = ['type' => $t > 0 ? 'good' : 'warn',
                'text' => sprintf('El ticket promedio %s %s%% %s (%s por factura).', $t > 0 ? 'subió' : 'bajó', number_format(abs($t), 1), $cmp, $money($k['avg_ticket']))];
        }

        return $out;
    }

    /** Detalle que respalda las cifras del reporte (solo para PDF y CSV). */
    public function workshopDetails(Carbon $from, Carbon $to): array
    {
        return [
            'payments' => Payment::with(['invoice:id,number', 'customer'])
                ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
                ->orderBy('payment_date')->orderBy('id')
                ->get(),
            'delivered' => WorkOrder::where('status', 'entregado')
                ->whereBetween('delivered_at', [$from, $to])
                ->orderBy('delivered_at')
                ->get(),
            'invoices' => Invoice::with(['customer', 'workOrder:id,number'])
                ->whereBetween('issued_at', [$from, $to])
                ->orderBy('issued_at')
                ->get(),
            'receivables' => Invoice::with(['customer', 'workOrder:id,number'])
                ->whereIn('status', ['pendiente', 'parcial'])
                ->orderBy('issued_at')
                ->get(),
        ];
    }

    // ── Rendimiento de empleados ────────────────────────────────────────

    /**
     * Ranking de empleados activos con OTs, horas, ingresos y bonos del rango.
     * Los bonos son mensuales: se toman los de los meses que toca el rango.
     */
    public function employeeRanking(Carbon $from, Carbon $to)
    {
        $nameSql = self::EMPLOYEE_NAME_SQL;

        $workSub = DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) use ($from, $to) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at')
                  ->whereBetween('wo.received_at', [$from, $to]);
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
            ->whereBetween('eb.bonus_month', [$from->copy()->startOfMonth()->toDateString(), $to->toDateString()])
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

    /** Ingresos, horas y OTs de cada empleado activo agrupados por día, semana o mes. */
    public function employeeTrend(ReportRange $range)
    {
        $nameSql = self::EMPLOYEE_NAME_SQL;
        $bucket = $range->bucketSql('wo.received_at');
        $labels = collect($range->buckets())->pluck('label', 'key');

        return DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) use ($range) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at')
                  ->whereBetween('wo.received_at', [$range->from, $range->to]);
            })
            ->join('employees as e', function ($j) {
                $j->on('e.id', '=', 'ws.employee_id')
                  ->whereNull('e.deleted_at')
                  ->where('e.active', true);
            })
            ->select(
                DB::raw("$bucket as bucket"),
                DB::raw("$nameSql as name"),
                'e.id as employee_id',
                DB::raw('COUNT(DISTINCT wo.id) as ot_count'),
                DB::raw('COALESCE(SUM(ws.subtotal), 0) as revenue'),
                DB::raw('COALESCE(SUM(ws.hours), 0) as hours')
            )
            ->groupBy('bucket', 'e.id', 'e.first_name', 'e.second_name', 'e.last_name', 'e.second_last_name')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($r) => (array) $r + ['label' => $labels[$r->bucket] ?? $r->bucket]);
    }

    /** Servicios trabajados por cada empleado activo en el rango, agrupados por empleado. */
    public function employeeWorkDetail(Carbon $from, Carbon $to)
    {
        return DB::table('wo_services as ws')
            ->join('work_orders as wo', function ($j) use ($from, $to) {
                $j->on('wo.id', '=', 'ws.work_order_id')
                  ->whereNull('wo.deleted_at')
                  ->whereBetween('wo.received_at', [$from, $to]);
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

    public function date($value): string
    {
        return $value ? Carbon::parse($value)->format('d/m/Y') : '';
    }
}
