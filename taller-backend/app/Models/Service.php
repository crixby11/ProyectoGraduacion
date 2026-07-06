<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'description', 'estimated_hours', 'base_price', 'active',
    ];

    protected $casts = [
        'estimated_hours' => 'decimal:2',
        'base_price' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function woServices()
    {
        return $this->hasMany(WoService::class);
    }
}
