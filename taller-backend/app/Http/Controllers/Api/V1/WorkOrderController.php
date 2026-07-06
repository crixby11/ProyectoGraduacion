<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\WorkOrder;
use App\Models\WorkOrderNote;
use App\Services\WorkOrderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(private WorkOrderService $workOrderService) {}

    public function index(Request $request)
    {
        $query = WorkOrder::query()
            ->with(['customer', 'vehicle', 'employee']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('number', 'like', "%$s%")
                  ->orWhere('customer_name', 'like', "%$s%")
                  ->orWhere('vehicle_plate', 'like', "%$s%")
                  ->orWhere('customer_phone', 'like', "%$s%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('service_type')) {
            $query->where('service_type', $request->service_type);
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('received_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('received_at', '<=', $request->date_to);
        }

        // Filtros por fecha prometida (para vista de calendario)
        if ($request->filled('promised_from')) {
            $query->whereDate('promised_at', '>=', $request->promised_from);
        }

        if ($request->filled('promised_to')) {
            $query->whereDate('promised_at', '<=', $request->promised_to);
        }

        return response()->json($query->latest('received_at')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_type' => 'nullable|string|max:80',
            'reference' => 'nullable|string|max:100',
            'received_at' => 'nullable|date',
            'promised_at' => 'nullable|date',
            'problem' => 'nullable|string',
            'inspection' => 'nullable|string',
            'solution' => 'nullable|string',
            'comments' => 'nullable|string',
            // Campos de snapshot opcionales (se auto-llenan si hay customer/vehicle)
            'customer_name' => 'nullable|string|max:150',
            'customer_phone' => 'nullable|string|max:20',
            'vehicle_plate' => 'nullable|string|max:20',
            'vehicle_brand' => 'nullable|string|max:60',
            'vehicle_model' => 'nullable|string|max:60',
            'vehicle_year' => 'nullable|string|max:10',
            'vehicle_color' => 'nullable|string|max:40',
            'vehicle_engine' => 'nullable|string|max:60',
            'vehicle_vin' => 'nullable|string|max:30',
            'vehicle_displacement' => 'nullable|string|max:20',
            'vehicle_description' => 'nullable|string',
        ]);

        $workOrder = $this->workOrderService->create($data);

        return response()->json($workOrder->load(['customer', 'vehicle', 'employee', 'services', 'parts']), 201);
    }

    public function show(WorkOrder $workOrder)
    {
        return response()->json(
            $workOrder->load(['customer', 'vehicle', 'employee', 'services.employee', 'parts', 'invoice.payments', 'appointments'])
        );
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_type' => 'nullable|string|max:80',
            'reference' => 'nullable|string|max:100',
            'status' => 'nullable|in:recibido,diagnostico,en_progreso,listo,entregado,cancelado',
            'received_at' => 'nullable|date',
            'promised_at' => 'nullable|date',
            'delivered_at' => 'nullable|date',
            'problem' => 'nullable|string',
            'inspection' => 'nullable|string',
            'solution' => 'nullable|string',
            'comments' => 'nullable|string',
            'customer_name' => 'nullable|string|max:150',
            'customer_phone' => 'nullable|string|max:20',
            'vehicle_plate' => 'nullable|string|max:20',
            'vehicle_brand' => 'nullable|string|max:60',
            'vehicle_model' => 'nullable|string|max:60',
            'vehicle_year' => 'nullable|string|max:10',
            'vehicle_color' => 'nullable|string|max:40',
            'vehicle_engine' => 'nullable|string|max:60',
            'vehicle_vin' => 'nullable|string|max:30',
            'vehicle_displacement' => 'nullable|string|max:20',
            'vehicle_description' => 'nullable|string',
        ]);

        $workOrder = $this->workOrderService->update($workOrder, $data);

        return response()->json($workOrder->load(['customer', 'vehicle', 'employee', 'services', 'parts']));
    }

    public function destroy(WorkOrder $workOrder)
    {
        $workOrder->delete();

        return response()->json(['message' => 'Orden de trabajo eliminada']);
    }

    public function addService(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'service_id' => 'nullable|exists:services,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'hours' => 'required|numeric|min:0',
            'hourly_rate' => 'required|numeric|min:0',
        ]);

        $woService = $this->workOrderService->addService($workOrder, $data);

        return response()->json($woService, 201);
    }

    public function updateService(Request $request, WorkOrder $workOrder, int $woServiceId)
    {
        $data = $request->validate([
            'employee_id'  => 'nullable|exists:employees,id',
            'service_name' => 'required|string|max:150',
            'description'  => 'nullable|string',
            'hours'        => 'required|numeric|min:0',
            'hourly_rate'  => 'required|numeric|min:0',
        ]);

        $woService = $this->workOrderService->updateService($workOrder, $woServiceId, $data);

        return response()->json($woService);
    }

    public function removeService(WorkOrder $workOrder, int $woServiceId)
    {
        $this->workOrderService->removeService($workOrder, $woServiceId);

        return response()->json(['message' => 'Servicio eliminado de la OT']);
    }

    public function addPart(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'inventory_id' => 'nullable|exists:inventory,id',
            'part_name' => 'required|string|max:150',
            'part_sku' => 'nullable|string|max:60',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $woPart = $this->workOrderService->addPart($workOrder, $data, $request->user());

        return response()->json($woPart, 201);
    }

    public function updatePart(Request $request, WorkOrder $workOrder, int $woPartId)
    {
        $data = $request->validate([
            'part_name'  => 'required|string|max:150',
            'part_sku'   => 'nullable|string|max:60',
            'quantity'   => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $woPart = $this->workOrderService->updatePart($workOrder, $woPartId, $data, $request->user());

        return response()->json($woPart);
    }

    public function removePart(WorkOrder $workOrder, int $woPartId)
    {
        $this->workOrderService->removePart($workOrder, $woPartId);

        return response()->json(['message' => 'Repuesto eliminado de la OT']);
    }

    public function changeStatus(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'status' => 'required|in:recibido,diagnostico,en_progreso,listo,entregado,cancelado',
        ]);

        $workOrder = $this->workOrderService->changeStatus($workOrder, $data['status']);

        return response()->json($workOrder);
    }

    public function pdf(WorkOrder $workOrder)
    {
        $workOrder->load(['services.employee', 'parts', 'notes.user', 'employee']);

        $pdf = Pdf::loadView('pdfs.work_order', [
            'wo' => $workOrder,
            'settings' => Setting::all_map(),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("OT-{$workOrder->number}.pdf");
    }

    public function notes(WorkOrder $workOrder)
    {
        return response()->json(
            $workOrder->notes()->with('user')->latest()->get()
        );
    }

    public function addNote(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $note = $workOrder->notes()->create([
            'body' => $data['body'],
            'user_id' => $request->user()->id,
        ]);

        return response()->json($note->load('user'), 201);
    }
}
