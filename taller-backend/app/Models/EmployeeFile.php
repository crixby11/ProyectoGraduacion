<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class EmployeeFile extends Model
{
    protected $fillable = [
        'employee_id', 'original_name', 'stored_name', 'path',
        'mime_type', 'size', 'description',
    ];

    protected $appends = ['url'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    public function getSizeFormattedAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' MB';
        if ($bytes >= 1024)    return round($bytes / 1024, 1)    . ' KB';
        return $bytes . ' B';
    }
}
