<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_movement_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->comment('Quien registró el pago');

            $table->decimal('amount', 12, 2);
            $table->enum('status', ['pagado', 'pendiente'])->default('pagado');
            $table->enum('method', ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'])->nullable();
            $table->date('payment_date')->nullable();
            $table->string('reference', 100)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
