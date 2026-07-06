<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku', 60)->unique()->nullable();
            $table->string('brand', 60)->nullable();
            $table->string('category', 80)->nullable();
            $table->text('description')->nullable();
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(5)->comment('Stock mínimo para alerta');
            $table->decimal('cost', 10, 2)->default(0)->comment('Costo de adquisición');
            $table->decimal('sale_price', 10, 2)->default(0)->comment('Precio de venta');
            $table->string('unit', 20)->default('unidad')->comment('Unidad de medida');
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
            $table->index('sku');
            $table->index('stock');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
