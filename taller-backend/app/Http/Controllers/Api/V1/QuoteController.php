<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Services\QuoteService;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    public function __construct(private QuoteService $quoteService) {}

    public function index(Request $request)
    {
        $query = Quote::query()->with(['customer', 'vehicle', 'employee']);

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

        if ($request->filled('date_from')) {
            $query->whereDate('issued_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issued_at', '<=', $request->date_to);
        }

        return response()->json($query->latest('issued_at')->paginate($request->per_page ?? 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_type' => 'nullable|string|max:80',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'issued_at' => 'nullable|date',
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

        $quote = $this->quoteService->create($data);

        return response()->json($quote->load(['customer', 'vehicle', 'employee', 'services', 'parts']), 201);
    }

    public function show(Quote $quote)
    {
        return response()->json(
            $quote->load(['customer', 'vehicle', 'employee', 'services.employee', 'parts', 'workOrder'])
        );
    }

    public function update(Request $request, Quote $quote)
    {
        $data = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_type' => 'nullable|string|max:80',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'issued_at' => 'nullable|date',
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
            'work_order_id' => 'nullable|exists:work_orders,id',
        ]);

        $quote = $this->quoteService->update($quote, $data);

        return response()->json($quote->load(['customer', 'vehicle', 'employee', 'services', 'parts']));
    }

    public function destroy(Quote $quote)
    {
        $quote->delete();

        return response()->json(['message' => 'Cotización eliminada']);
    }

    public function changeStatus(Request $request, Quote $quote)
    {
        $data = $request->validate([
            'status' => 'required|in:pendiente,aprobada,rechazada,convertida',
            'work_order_id' => 'nullable|exists:work_orders,id',
        ]);

        $quote = $this->quoteService->changeStatus($quote, $data['status'], $data['work_order_id'] ?? null);

        return response()->json($quote);
    }

    public function addService(Request $request, Quote $quote)
    {
        $data = $request->validate([
            'service_id' => 'nullable|exists:services,id',
            'employee_id' => 'nullable|exists:employees,id',
            'service_name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'hours' => 'required|numeric|min:0',
            'hourly_rate' => 'required|numeric|min:0',
        ]);

        $line = $this->quoteService->addService($quote, $data);

        return response()->json($line, 201);
    }

    public function updateService(Request $request, Quote $quote, int $quoteServiceId)
    {
        $data = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'service_name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'hours' => 'required|numeric|min:0',
            'hourly_rate' => 'required|numeric|min:0',
        ]);

        $line = $this->quoteService->updateService($quote, $quoteServiceId, $data);

        return response()->json($line);
    }

    public function removeService(Quote $quote, int $quoteServiceId)
    {
        $this->quoteService->removeService($quote, $quoteServiceId);

        return response()->json(['message' => 'Servicio eliminado de la cotización']);
    }

    public function addPart(Request $request, Quote $quote)
    {
        $data = $request->validate([
            'inventory_id' => 'nullable|exists:inventory,id',
            'part_name' => 'required|string|max:150',
            'part_sku' => 'nullable|string|max:60',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $line = $this->quoteService->addPart($quote, $data);

        return response()->json($line, 201);
    }

    public function updatePart(Request $request, Quote $quote, int $quotePartId)
    {
        $data = $request->validate([
            'part_name' => 'required|string|max:150',
            'part_sku' => 'nullable|string|max:60',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $line = $this->quoteService->updatePart($quote, $quotePartId, $data);

        return response()->json($line);
    }

    public function removePart(Quote $quote, int $quotePartId)
    {
        $this->quoteService->removePart($quote, $quotePartId);

        return response()->json(['message' => 'Repuesto eliminado de la cotización']);
    }

    public function pdf(Quote $quote)
    {
        return $this->quoteService->generatePdf($quote);
    }

    public function whatsappLink(Quote $quote)
    {
        return response()->json(['url' => $this->quoteService->whatsappLink($quote)]);
    }
}
