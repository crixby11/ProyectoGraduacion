<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\Payment;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        // Ingresos (pagos cobrados)
        $revenueToday = Payment::whereDate('payment_date', $today)->sum('amount');
        $revenueWeek = Payment::whereDate('payment_date', '>=', $weekStart)->sum('amount');
        $revenueMonth = Payment::whereDate('payment_date', '>=', $monthStart)->sum('amount');

        // OTs por estado
        $otsByStatus = WorkOrder::select('status', DB::raw('count(*) as total'))
            ->whereNull('deleted_at')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Entregas de hoy
        $deliveriesToday = WorkOrder::whereDate('promised_at', $today)
            ->whereNotIn('status', ['entregado', 'cancelado'])
            ->with(['customer', 'vehicle', 'employee'])
            ->get();

        // Stock bajo
        $lowStock = Inventory::whereColumn('stock', '<=', 'min_stock')
            ->where('active', true)
            ->count();

        // Mecánico más productivo del mes (por horas)
        $topEmployee = DB::table('wo_services')
            ->join('work_orders', 'wo_services.work_order_id', '=', 'work_orders.id')
            ->join('employees', 'wo_services.employee_id', '=', 'employees.id')
            ->where('work_orders.received_at', '>=', $monthStart)
            ->whereNull('work_orders.deleted_at')
            ->select(
                DB::raw("TRIM(CONCAT(employees.first_name, ' ', COALESCE(employees.second_name, ''), ' ', employees.last_name, ' ', COALESCE(employees.second_last_name, ''))) as name"),
                DB::raw('SUM(wo_services.hours) as total_hours'),
                DB::raw('SUM(wo_services.subtotal) as total_revenue')
            )
            ->groupBy('employees.id', 'employees.first_name', 'employees.second_name', 'employees.last_name', 'employees.second_last_name')
            ->orderByDesc('total_hours')
            ->first();

        // Gráfica de ingresos por día (últimos 30 días)
        $revenueChart = Payment::select(
                DB::raw('DATE(payment_date) as date'),
                DB::raw('SUM(amount) as total')
            )
            ->where('payment_date', '>=', now()->subDays(29)->toDateString())
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Citas de hoy (programadas o confirmadas)
        $appointmentsToday = Appointment::whereDate('start_at', $today)
            ->whereNotIn('status', ['cancelada', 'completada'])
            ->with(['customer', 'vehicle', 'employee'])
            ->orderBy('start_at')
            ->get();

        // OTs abiertas totales
        $openWorkOrders = WorkOrder::whereNotIn('status', ['entregado', 'cancelado'])->count();

        // OTs con fecha prometida vencida y aún no entregadas
        $overdueWorkOrders = WorkOrder::whereNotIn('status', ['entregado', 'cancelado'])
            ->whereNotNull('promised_at')
            ->whereDate('promised_at', '<', $today)
            ->with(['employee'])
            ->orderBy('promised_at')
            ->get();

        return response()->json([
            'revenue' => [
                'today' => $revenueToday,
                'week' => $revenueWeek,
                'month' => $revenueMonth,
            ],
            'ots_by_status' => $otsByStatus,
            'open_work_orders' => $openWorkOrders,
            'deliveries_today' => $deliveriesToday,
            'low_stock_count' => $lowStock,
            'top_employee' => $topEmployee,
            'revenue_chart' => $revenueChart,
            'overdue_work_orders' => $overdueWorkOrders,
            'appointments_today' => $appointmentsToday,
        ]);
    }
}
