<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_id', 'work_order_id', 'purchase_order_id', 'user_id',
        'type', 'quantity', 'stock_before', 'stock_after',
        'unit_cost', 'reason', 'notes',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
    ];

    public function inventoryItem()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function supplierPurchase()
    {
        return $this->hasOne(SupplierPurchase::class);
    }
}
