<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20)->unique()->comment('COT-2026-001');
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete()->comment('Asesor que cotiza');

            // Snapshot de datos del cliente (para historial inmutable)
            $table->string('customer_name')->nullable();
            $table->string('customer_phone', 20)->nullable();

            // Snapshot de datos del vehículo
            $table->string('vehicle_plate', 20)->nullable();
            $table->string('vehicle_brand', 60)->nullable();
            $table->string('vehicle_model', 60)->nullable();
            $table->string('vehicle_year', 10)->nullable();
            $table->string('vehicle_color', 40)->nullable();
            $table->string('vehicle_engine', 60)->nullable();
            $table->string('vehicle_vin', 30)->nullable();
            $table->string('vehicle_displacement', 20)->nullable();
            $table->text('vehicle_description')->nullable();

            $table->string('service_type', 80)->nullable()->comment('Tipo de servicio');
            $table->text('description')->nullable()->comment('Trabajo a cotizar');
            $table->text('notes')->nullable();

            $table->enum('status', ['pendiente', 'aprobada', 'rechazada', 'convertida'])->default('pendiente');

            $table->decimal('subtotal_services', 12, 2)->default(0);
            $table->decimal('subtotal_parts', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            $table->timestamp('issued_at')->nullable();
            $table->timestamp('decided_at')->nullable()->comment('Cuándo se aprobó o rechazó');

            // Trazabilidad hacia la OT generada al convertir
            $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('number');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
