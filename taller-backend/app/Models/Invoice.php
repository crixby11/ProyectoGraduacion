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
        'exempt_amount', 'taxed_15_amount', 'tax_15_amount',
        'taxed_18_amount', 'tax_18_amount',
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
        'exempt_amount' => 'decimal:2',
        'taxed_15_amount' => 'decimal:2',
        'tax_15_amount' => 'decimal:2',
        'taxed_18_amount' => 'decimal:2',
        'tax_18_amount' => 'decimal:2',
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

    /**
     * Desglose fiscal en tres categorías (tabla tax_rates: exonerado/15%/18%),
     * igual que Órdenes de Compra. El usuario solo asigna montos a exonerado
     * y gravado 18% — lo que sobra del subtotal cae en gravado 15% (tasa por
     * defecto), nunca al revés, para que la suma siempre cuadre con el total.
     */
    public function recalculate(): void
    {
        $this->subtotal = $this->subtotal_services + $this->subtotal_parts;
        $this->discount_amount = round($this->subtotal * $this->discount_percent / 100, 2);
        $subtotalAfterDiscount = $this->subtotal - $this->discount_amount;

        $this->exempt_amount = min($this->exempt_amount, $subtotalAfterDiscount);
        $this->taxed_18_amount = min($this->taxed_18_amount, $subtotalAfterDiscount - $this->exempt_amount);
        $this->taxed_15_amount = max(0, $subtotalAfterDiscount - $this->exempt_amount - $this->taxed_18_amount);

        $this->tax_15_amount = round($this->taxed_15_amount * TaxRate::percentFor('gravado_15') / 100, 2);
        $this->tax_18_amount = round($this->taxed_18_amount * TaxRate::percentFor('gravado_18') / 100, 2);
        $this->tax_amount = $this->tax_15_amount + $this->tax_18_amount;
        $this->tax_percent = $subtotalAfterDiscount > 0 ? round($this->tax_amount / $subtotalAfterDiscount * 100, 2) : 0;

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
