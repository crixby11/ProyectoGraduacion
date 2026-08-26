<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Rendimiento del taller a lo largo del tiempo: ingresos cobrados y OTs
     * entregadas, agrupados por mes o por trimestre.
     * Query param: period = month | quarter (default: month)
     */
    public function performance(Request $request)
    {
        $period = $request->get('period') === 'quarter' ? 'quarter' : 'month';
        $bucketsCount = $period === 'quarter' ? 8 : 12;

        if ($period === 'quarter') {
            $revenueExpr = "CONCAT(YEAR(payment_date), '-Q', QUARTER(payment_date))";
            $otExpr = "CONCAT(YEAR(delivered_at), '-Q', QUARTER(delivered_at))";
            $revenueFrom = now()->subQuarters($bucketsCount - 1)->startOfQuarter()->toDateString();
            $otFrom = $revenueFrom;
        } else {
            $revenueExpr = "DATE_FORMAT(payment_date, '%Y-%m')";
            $otExpr = "DATE_FORMAT(delivered_at, '%Y-%m')";
            $revenueFrom = now()->subMonths($bucketsCount - 1)->startOfMonth()->toDateString();
            $otFrom = $revenueFrom;
        }

        $revenueRows = Payment::select(
                DB::raw("$revenueExpr as bucket"),
                DB::raw('SUM(amount) as total')
            )
            ->where('payment_date', '>=', $revenueFrom)
            ->groupBy('bucket')
            ->get()
            ->keyBy('bucket');

        $otRows = WorkOrder::select(
                DB::raw("$otExpr as bucket"),
                DB::raw('COUNT(*) as total')
            )
            ->where('status', 'entregado')
            ->where('delivered_at', '>=', $otFrom)
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

        return response()->json([
            'period' => $period,
            'data'   => $data,
        ]);
    }
}
