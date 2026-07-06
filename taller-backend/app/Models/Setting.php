<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    public static function get(string $key, string $default = ''): string
    {
        return static::find($key)?->value ?? $default;
    }

    public static function all_map(): array
    {
        return static::all()->pluck('value', 'key')->toArray();
    }
}