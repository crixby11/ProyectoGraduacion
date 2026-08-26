<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_id')->nullable()->constrained('inventory')->nullOnDelete();

            $table->string('item_name')->comment('Snapshot del nombre del producto');
            $table->string('item_sku', 60)->nullable();
            $table->string('unit', 20)->nullable()->comment('Unidad, Galón, Cuarto, Garrafa...');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0)->comment('Monto fijo, no porcentaje');
            $table->enum('tax_type', ['exento', 'gravado_15', 'gravado_18'])->default('gravado_15');
            $table->decimal('subtotal', 10, 2)->default(0)->comment('quantity × unit_cost - discount');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
