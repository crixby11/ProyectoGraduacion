<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkOrder extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('ordenes_trabajo');
    }

    protected $fillable = [
        'number', 'customer_id', 'vehicle_id', 'employee_id',
        'customer_name', 'customer_phone',
        'vehicle_plate', 'vehicle_brand', 'vehicle_model', 'vehicle_year',
        'vehicle_color', 'vehicle_engine', 'vehicle_vin', 'vehicle_displacement',
        'vehicle_description',
        'service_type', 'reference', 'status',
        'received_at', 'promised_at', 'delivered_at',
        'problem', 'inspection', 'solution', 'comments',
        'subtotal_services', 'subtotal_parts', 'total',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'promised_at' => 'date',
        'delivered_at' => 'datetime',
        'subtotal_services' => 'decimal:2',
        'subtotal_parts' => 'decimal:2',
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
        return $this->hasMany(WoService::class);
    }

    public function parts()
    {
        return $this->hasMany(WoPart::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function notes()
    {
        return $this->hasMany(WorkOrderNote::class);
    }

    public function recalculateTotals(): void
    {
        $this->subtotal_services = $this->services()->sum('subtotal');
        $this->subtotal_parts = $this->parts()->sum('subtotal');
        $this->total = $this->subtotal_services + $this->subtotal_parts;
        $this->save();
    }
}
