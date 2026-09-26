<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Inventory extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('inventario');
    }

    protected $table = 'inventory';

    protected $fillable = [
        'name', 'sku', 'brand', 'supplier_id', 'category', 'description',
        'stock', 'min_stock', 'cost', 'sale_price', 'unit', 'units_per_pack', 'active', 'notes',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'units_per_pack' => 'integer',
        'active' => 'boolean',
    ];

    // Presentaciones con cantidad fija de unidades sueltas.
    public const FIXED_PACKS = ['unidad' => 1, 'litro' => 1, 'galon' => 1, 'par' => 2, 'docena' => 12];

    // Presentaciones cuya cantidad se configura por repuesto.
    public const VARIABLE_PACKS = ['caja', 'ristra'];

    public static function unitKeys(): array
    {
        return array_merge(array_keys(self::FIXED_PACKS), self::VARIABLE_PACKS);
    }

    /**
     * Unidades sueltas que trae una presentación. Las fijas ignoran lo que
     * mande el cliente (una docena siempre es 12); caja/ristra usan el valor
     * configurado; un valor desconocido (dato viejo de texto libre) cuenta como 1.
     */
    public static function resolvePackSize(?string $unit, $given = null): int
    {
        if ($unit !== null && isset(self::FIXED_PACKS[$unit])) {
            return self::FIXED_PACKS[$unit];
        }
        if (in_array($unit, self::VARIABLE_PACKS, true)) {
            return max(1, (int) $given);
        }

        return 1;
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function woParts()
    {
        return $this->hasMany(WoPart::class);
    }

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock <= $this->min_stock;
    }
}
