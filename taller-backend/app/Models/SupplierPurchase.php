<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SupplierPurchase extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'supplier_id', 'inventory_movement_id', 'purchase_order_id',
        'total', 'amount_paid', 'balance', 'status', 'notes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('compras_proveedores');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function inventoryMovement()
    {
        return $this->belongsTo(InventoryMovement::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function payments()
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function recalculate(): void
    {
        $this->amount_paid = $this->payments()->sum('amount');
        $this->balance = $this->total - $this->amount_paid;
        $this->status = match (true) {
            $this->balance <= 0 => 'pagado',
            $this->amount_paid > 0 => 'parcial',
            default => 'pendiente',
        };
        $this->save();
    }
}
