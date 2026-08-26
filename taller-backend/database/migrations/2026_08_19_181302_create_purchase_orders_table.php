<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20)->unique()->comment('OC-2026-001');
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();

            $table->string('supplier_invoice_number', 60)->nullable()->comment('N° de factura física del proveedor');
            $table->string('payment_terms', 60)->nullable()->comment('Contado, Crédito 45 días, etc.');
            $table->enum('status', ['pendiente', 'recibida', 'cancelada'])->default('pendiente');
            $table->date('order_date')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('exempt_amount', 12, 2)->default(0);
            $table->decimal('taxed_15_amount', 12, 2)->default(0);
            $table->decimal('tax_15_amount', 12, 2)->default(0);
            $table->decimal('taxed_18_amount', 12, 2)->default(0);
            $table->decimal('tax_18_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index('number');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
