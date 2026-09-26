<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // El stock se cuenta siempre en unidades sueltas. 'unit' pasa a ser la
        // presentación en que se compra (caja, docena, ristra...) y
        // units_per_pack cuántas unidades sueltas trae esa presentación.
        // Default 1 = comportamiento anterior (una unidad = una unidad).
        Schema::table('inventory', function (Blueprint $table) {
            $table->unsignedInteger('units_per_pack')->default(1)->after('unit');
        });

        // Snapshot en la línea de compra: si luego cambia la configuración del
        // repuesto, la orden ya guardada conserva con qué empaque se compró.
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->unsignedInteger('units_per_pack')->default(1)->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $table->dropColumn('units_per_pack');
        });
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn('units_per_pack');
        });
    }
};
