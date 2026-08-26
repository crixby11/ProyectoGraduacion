<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PurchaseOrderFile extends Model
{
    protected $fillable = [
        'purchase_order_id', 'original_name', 'stored_name', 'path',
        'mime_type', 'size', 'description',
    ];

    protected $appends = ['url'];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
