<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxRate extends Model
{
    protected $fillable = ['code', 'name', 'percent'];

    protected $casts = [
        'percent' => 'decimal:2',
    ];

    public static function percentFor(string $code): float
    {
        return (float) (static::where('code', $code)->value('percent') ?? 0);
    }
}
