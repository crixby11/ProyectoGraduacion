<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __construct(private WhatsAppService $whatsApp) {}

    public function index(Request $request)
    {
        $query = Appointment::query()->with(['customer', 'vehicle', 'employee']);

        if ($request->filled('start')) {
            $query->where('start_at', '>=', $request->start);
        }

        if ($request->filled('end')) {
            $query->where('start_at', '<=', $request->end);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        return response()->json($query->orderBy('start_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'title' => 'required|string|max:150',
            'description' => 'nullable|string',
            'start_at' => 'required|date',
            'end_at' => 'nullable|date|after:start_at',
            'color' => 'nullable|string|max:10',
            'customer_name' => 'nullable|string|max:150',
            'customer_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
        ]);

        $appointment = Appointment::create($data);

        return response()->json($appointment->load(['customer', 'vehicle', 'employee']), 201);
    }

    public function show(Appointment $appointment)
    {
        return response()->json($appointment->load(['customer', 'vehicle', 'employee', 'workOrder']));
    }

    public function update(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'title' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'status' => 'nullable|in:programada,confirmada,completada,cancelada,no_presente',
            'start_at' => 'sometimes|required|date',
            'end_at' => 'nullable|date',
            'color' => 'nullable|string|max:10',
            'customer_name' => 'nullable|string|max:150',
            'customer_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
        ]);

        $appointment->update($data);

        return response()->json($appointment->load(['customer', 'vehicle', 'employee']));
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->json(['message' => 'Cita eliminada']);
    }

    public function sendReminder(Appointment $appointment)
    {
        $link = $this->whatsApp->appointmentReminderLink($appointment);

        return response()->json(['url' => $link]);
    }
}
