<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Invoice extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('facturas');
    }

    protected $fillable = [
        'work_order_id', 'customer_id', 'number', 'status',
        'subtotal_services', 'subtotal_parts', 'subtotal',
        'discount_percent', 'discount_amount',
        'tax_percent', 'tax_amount',
        'total', 'amount_paid', 'balance',
        'notes', 'pdf_path', 'issued_at', 'paid_at',
    ];

    protected $casts = [
        'subtotal_services' => 'decimal:2',
        'subtotal_parts' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function recalculate(): void
    {
        $this->subtotal = $this->subtotal_services + $this->subtotal_parts;
        $this->discount_amount = round($this->subtotal * $this->discount_percent / 100, 2);
        $subtotalAfterDiscount = $this->subtotal - $this->discount_amount;
        $this->tax_amount = round($subtotalAfterDiscount * $this->tax_percent / 100, 2);
        $this->total = $subtotalAfterDiscount + $this->tax_amount;
        $this->amount_paid = $this->payments()->sum('amount');
        $this->balance = $this->total - $this->amount_paid;
        $this->status = match (true) {
            $this->balance <= 0 => 'pagada',
            $this->amount_paid > 0 => 'parcial',
            default => 'pendiente',
        };
        $this->save();
    }
}
