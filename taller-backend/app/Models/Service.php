<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Service extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('servicios');
    }

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
