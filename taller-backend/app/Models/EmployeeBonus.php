<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeBonus extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'work_order_id', 'amount', 'description', 'bonus_month',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'bonus_month' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }
}
