<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Quote;
use App\Models\QuotePart;
use App\Models\QuoteService as QuoteServiceLine;
use App\Models\Vehicle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class QuoteService
{
    public function create(array $data): Quote
    {
        return DB::transaction(function () use ($data) {
            $data['number'] = $this->generateNumber();
            $data['issued_at'] ??= now();

            if (isset($data['customer_id']) && ! isset($data['customer_name'])) {
                $customer = Customer::find($data['customer_id']);
                $data['customer_name'] = $customer?->name;
                $data['customer_phone'] = $customer?->phone;
            }

            if (isset($data['vehicle_id']) && ! isset($data['vehicle_plate'])) {
                $vehicle = Vehicle::find($data['vehicle_id']);
                $data['vehicle_plate'] = $vehicle?->plate;
                $data['vehicle_brand'] = $vehicle?->brand;
                $data['vehicle_model'] = $vehicle?->model;
                $data['vehicle_year'] = $vehicle?->year;
                $data['vehicle_color'] = $vehicle?->color;
                $data['vehicle_engine'] = $vehicle?->engine_type;
                $data['vehicle_vin'] = $vehicle?->vin;
                $data['vehicle_displacement'] = $vehicle?->displacement;
                $data['vehicle_description'] = $vehicle?->description;
            }

            return Quote::create($data);
        });
    }

    public function update(Quote $quote, array $data): Quote
    {
        $this->assertEditable($quote);

        $quote->update($data);

        return $quote->fresh();
    }

    public function changeStatus(Quote $quote, string $status, ?int $workOrderId = null): Quote
    {
        $quote->status = $status;

        if (in_array($status, ['aprobada', 'rechazada'], true)) {
            $quote->decided_at = now();
        }

        if ($workOrderId !== null) {
            $quote->work_order_id = $workOrderId;
        }

        $quote->save();

        return $quote;
    }

    public function addService(Quote $quote, array $data): QuoteServiceLine
    {
        return DB::transaction(function () use ($quote, $data) {
            $this->assertEditable($quote);

            $data['subtotal'] = round($data['hours'] * $data['hourly_rate'], 2);
            $line = $quote->services()->create($data);
            $quote->recalculateTotals();

            return $line;
        });
    }

    public function updateService(Quote $quote, int $quoteServiceId, array $data): QuoteServiceLine
    {
        return DB::transaction(function () use ($quote, $quoteServiceId, $data) {
            $this->assertEditable($quote);

            $line = $quote->services()->findOrFail($quoteServiceId);
            $data['subtotal'] = round($data['hours'] * $data['hourly_rate'], 2);
            $line->update($data);
            $quote->recalculateTotals();

            return $line->fresh();
        });
    }

    public function removeService(Quote $quote, int $quoteServiceId): void
    {
        DB::transaction(function () use ($quote, $quoteServiceId) {
            $this->assertEditable($quote);

            $quote->services()->findOrFail($quoteServiceId)->delete();
            $quote->recalculateTotals();
        });
    }

    public function addPart(Quote $quote, array $data): QuotePart
    {
        return DB::transaction(function () use ($quote, $data) {
            $this->assertEditable($quote);

            $data['subtotal'] = round($data['quantity'] * $data['unit_price'], 2);

            // Solo lectura de referencia — nunca se descuenta stock ni se crea InventoryMovement,
            // porque una cotización es una estimación, no trabajo comprometido.
            if (isset($data['inventory_id'])) {
                $item = Inventory::find($data['inventory_id']);
                $data['part_name'] ??= $item?->name;
                $data['part_sku'] ??= $item?->sku;
            }

            $line = $quote->parts()->create($data);
            $quote->recalculateTotals();

            return $line;
        });
    }

    public function updatePart(Quote $quote, int $quotePartId, array $data): QuotePart
    {
        return DB::transaction(function () use ($quote, $quotePartId, $data) {
            $this->assertEditable($quote);

            $line = $quote->parts()->findOrFail($quotePartId);
            $data['subtotal'] = round($data['quantity'] * $data['unit_price'], 2);
            $line->update($data);
            $quote->recalculateTotals();

            return $line->fresh();
        });
    }

    public function removePart(Quote $quote, int $quotePartId): void
    {
        DB::transaction(function () use ($quote, $quotePartId) {
            $this->assertEditable($quote);

            $quote->parts()->findOrFail($quotePartId)->delete();
            $quote->recalculateTotals();
        });
    }

    public function generatePdf(Quote $quote): Response
    {
        $quote->load(['services', 'parts', 'customer']);

        $pdf = Pdf::loadView('pdfs.quote', [
            'quote' => $quote,
            'settings' => \App\Models\Setting::all_map(),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("cotizacion-{$quote->number}.pdf");
    }

    public function whatsappLink(Quote $quote): string
    {
        $quote->load(['customer']);

        $phone = $quote->customer?->phone ?? $quote->customer_phone;
        $phone = preg_replace('/\D/', '', $phone ?? '');
        $name = $quote->customer?->name ?? $quote->customer_name;

        $message = urlencode(
            "Estimado/a {$name},\n" .
            "Le compartimos la cotización #{$quote->number}.\n" .
            "Total estimado: L " . number_format($quote->total, 2) . "\n" .
            "Taller Mecánico - Cotización sujeta a revisión del vehículo."
        );

        return "https://wa.me/{$phone}?text={$message}";
    }

    /**
     * Una cotización convertida queda como registro histórico inmutable —
     * la OT generada es la fuente de verdad viva a partir de ese punto.
     */
    private function assertEditable(Quote $quote): void
    {
        abort_if($quote->status === 'convertida', 422, 'No se puede modificar una cotización ya convertida a orden de trabajo');
    }

    private function generateNumber(): string
    {
        $year = now()->year;
        $last = Quote::withTrashed()
            ->where('number', 'like', "COT-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = $last ? (int) substr($last->number, -4) + 1 : 1;

        return sprintf('COT-%s-%04d', $year, $seq);
    }
}
