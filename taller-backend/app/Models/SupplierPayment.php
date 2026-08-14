<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SupplierPayment extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'supplier_purchase_id', 'user_id',
        'amount', 'method', 'payment_date', 'reference', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pagos_proveedores');
    }

    public function purchase()
    {
        return $this->belongsTo(SupplierPurchase::class, 'supplier_purchase_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
