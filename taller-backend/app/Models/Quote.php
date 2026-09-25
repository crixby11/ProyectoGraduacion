<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Quote extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('cotizaciones');
    }

    protected $fillable = [
        'number', 'customer_id', 'vehicle_id', 'employee_id',
        'customer_name', 'customer_phone',
        'vehicle_plate', 'vehicle_brand', 'vehicle_model', 'vehicle_year',
        'vehicle_color', 'vehicle_engine', 'vehicle_vin', 'vehicle_displacement',
        'vehicle_description',
        'service_type', 'description', 'notes', 'status',
        'issued_at', 'decided_at', 'work_order_id',
        'subtotal_services', 'subtotal_parts', 'subtotal',
        'discount_percent', 'discount_amount', 'tax_mode',
        'total',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'decided_at' => 'datetime',
        'subtotal_services' => 'decimal:2',
        'subtotal_parts' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'taxed_15_amount' => 'decimal:2',
        'tax_15_amount' => 'decimal:2',
        'taxed_18_amount' => 'decimal:2',
        'tax_18_amount' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function services()
    {
        return $this->hasMany(QuoteService::class);
    }

    public function parts()
    {
        return $this->hasMany(QuotePart::class);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    /**
     * Desglose fiscal igual que Factura (subtotal/descuento/exonerado/gravado
     * 15%/18%), para que el total de la cotización sea el mismo monto que el
     * cliente pagará al facturar. A diferencia de Factura, el subtotal cambia
     * cada vez que se agrega o quita un servicio/repuesto, así que en vez de
     * guardar un monto fijo de "exonerado", se guarda el modo (tax_mode) y el
     * monto se deriva del subtotal actual en cada recálculo.
     */
    public function recalculateTotals(): void
    {
        $this->subtotal_services = $this->services()->sum('subtotal');
        $this->subtotal_parts = $this->parts()->sum('subtotal');
        $this->subtotal = $this->subtotal_services + $this->subtotal_parts;
        $this->discount_amount = round($this->subtotal * $this->discount_percent / 100, 2);
        $afterDiscount = $this->subtotal - $this->discount_amount;

        $this->exempt_amount = $this->tax_mode === 'exonerado' ? $afterDiscount : 0;
        $this->taxed_18_amount = $this->tax_mode === 'gravado_18' ? $afterDiscount : 0;
        $this->taxed_15_amount = $this->tax_mode === 'estandar' ? $afterDiscount : 0;

        $this->tax_15_amount = round($this->taxed_15_amount * TaxRate::percentFor('gravado_15') / 100, 2);
        $this->tax_18_amount = round($this->taxed_18_amount * TaxRate::percentFor('gravado_18') / 100, 2);
        $this->tax_amount = $this->tax_15_amount + $this->tax_18_amount;
        $this->tax_percent = $afterDiscount > 0 ? round($this->tax_amount / $afterDiscount * 100, 2) : 0;

        $this->total = $afterDiscount + $this->tax_amount;
        $this->save();
    }
}
