<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WoPart extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id', 'inventory_id',
        'part_name', 'part_sku', 'quantity', 'unit_price', 'subtotal',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function inventoryItem()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }
}
