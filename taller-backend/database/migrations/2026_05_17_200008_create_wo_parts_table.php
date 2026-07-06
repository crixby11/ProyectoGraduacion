<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wo_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_id')->nullable()->constrained('inventory')->nullOnDelete();

            $table->string('part_name')->comment('Snapshot del nombre del repuesto');
            $table->string('part_sku', 60)->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0)->comment('Precio de venta al momento');
            $table->decimal('subtotal', 10, 2)->default(0)->comment('quantity × unit_price');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wo_parts');
    }
};
