<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_movement_id')->nullable()->constrained()->nullOnDelete();

            $table->decimal('total', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->enum('status', ['pendiente', 'parcial', 'pagado'])->default('pendiente');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_purchases');
    }
};
