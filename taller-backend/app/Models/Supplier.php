<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Supplier extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name', 'contact_name', 'phone', 'email', 'address', 'rtn', 'notes', 'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('proveedores');
    }

    public function inventory()
    {
        return $this->hasMany(Inventory::class);
    }

    public function purchases()
    {
        return $this->hasMany(SupplierPurchase::class);
    }
}
