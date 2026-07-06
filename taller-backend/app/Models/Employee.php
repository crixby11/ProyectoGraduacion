<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name', 'second_name', 'last_name', 'second_last_name',
        'specialty', 'phone', 'email', 'biweekly_salary', 'active', 'notes',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'biweekly_salary' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function getNameAttribute(): string
    {
        return collect([$this->first_name, $this->second_name, $this->last_name, $this->second_last_name])
            ->filter()
            ->implode(' ');
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function bonuses()
    {
        return $this->hasMany(EmployeeBonus::class)->orderBy('bonus_month', 'desc');
    }

    public function woServices()
    {
        return $this->hasMany(WoService::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function files()
    {
        return $this->hasMany(EmployeeFile::class)->orderBy('created_at', 'desc');
    }
}
