<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->comment('Quien registró');

            $table->enum('method', ['efectivo', 'transferencia', 'tarjeta', 'otro'])->default('efectivo');
            $table->decimal('amount', 12, 2);
            $table->date('payment_date');
            $table->string('reference', 100)->nullable()->comment('Número de transferencia, voucher, etc.');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('payment_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
