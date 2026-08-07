<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Appointment extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('citas');
    }

    protected $fillable = [
        'customer_id', 'vehicle_id', 'employee_id', 'work_order_id',
        'title', 'description', 'status',
        'start_at', 'end_at', 'color',
        'customer_name', 'customer_phone',
        'reminder_sent', 'reminder_sent_at', 'notes',
    ];

    protected $casts = [
        'reminder_sent' => 'boolean',
        'reminder_sent_at' => 'datetime',
    ];

    // Retorna el datetime sin zona horaria, compatible con datetime-local input
    protected function startAt(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? str_replace(' ', 'T', substr($value, 0, 16)) : null,
        );
    }

    protected function endAt(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? str_replace(' ', 'T', substr($value, 0, 16)) : null,
        );
    }

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

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
