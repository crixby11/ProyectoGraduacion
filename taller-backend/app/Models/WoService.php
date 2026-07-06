<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WoService extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id', 'service_id', 'employee_id',
        'service_name', 'description', 'hours', 'hourly_rate', 'subtotal',
    ];

    protected $casts = [
        'hours' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
