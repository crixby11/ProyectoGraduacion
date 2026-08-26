<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('ordenes_compra');
    }

    protected $fillable = [
        'number', 'supplier_id', 'supplier_invoice_number', 'payment_terms',
        'status', 'order_date', 'received_at', 'notes',
        'subtotal', 'discount_total', 'exempt_amount',
        'taxed_15_amount', 'tax_15_amount', 'taxed_18_amount', 'tax_18_amount', 'total',
    ];

    protected $casts = [
        'order_date' => 'date',
        'received_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'exempt_amount' => 'decimal:2',
        'taxed_15_amount' => 'decimal:2',
        'tax_15_amount' => 'decimal:2',
        'taxed_18_amount' => 'decimal:2',
        'tax_18_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function supplierPurchase()
    {
        return $this->hasOne(SupplierPurchase::class);
    }

    public function files()
    {
        return $this->hasMany(PurchaseOrderFile::class);
    }

    public function recalculateTotals(): void
    {
        $items = $this->items;

        $this->subtotal = $items->sum(fn ($i) => $i->quantity * $i->unit_cost);
        $this->discount_total = $items->sum('discount');

        $taxable = fn (string $type) => $items->where('tax_type', $type)
            ->sum(fn ($i) => ($i->quantity * $i->unit_cost) - $i->discount);

        $this->exempt_amount = $taxable('exento');
        $this->taxed_15_amount = $taxable('gravado_15');
        $this->taxed_18_amount = $taxable('gravado_18');
        $this->tax_15_amount = round($this->taxed_15_amount * TaxRate::percentFor('gravado_15') / 100, 2);
        $this->tax_18_amount = round($this->taxed_18_amount * TaxRate::percentFor('gravado_18') / 100, 2);
        $this->total = $this->exempt_amount + $this->taxed_15_amount + $this->tax_15_amount
                      + $this->taxed_18_amount + $this->tax_18_amount;

        $this->save();
    }
}
