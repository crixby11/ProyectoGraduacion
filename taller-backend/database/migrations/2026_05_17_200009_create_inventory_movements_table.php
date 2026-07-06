<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
            $table->foreignId('work_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('type', ['entrada', 'salida'])->comment('Tipo de movimiento');
            $table->integer('quantity');
            $table->integer('stock_before')->comment('Stock antes del movimiento');
            $table->integer('stock_after')->comment('Stock después del movimiento');
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('reason', 150)->nullable()->comment('Motivo del movimiento');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['inventory_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
