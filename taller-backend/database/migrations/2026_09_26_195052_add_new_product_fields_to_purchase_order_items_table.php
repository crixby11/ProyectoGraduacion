<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Datos con los que se crea en Inventario un producto nuevo (sin inventory_id)
        // al recibir la orden. Van en la línea porque el repuesto aún no existe.
        // NULL en líneas de repuestos ya existentes y en órdenes anteriores.
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('brand', 60)->nullable()->after('item_sku');
            $table->string('category', 80)->nullable()->after('brand');
            $table->decimal('sale_price', 10, 2)->nullable()->after('category')->comment('Precio de venta por unidad suelta');
            $table->unsignedInteger('min_stock')->nullable()->after('sale_price');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn(['brand', 'category', 'sale_price', 'min_stock']);
        });
    }
};
