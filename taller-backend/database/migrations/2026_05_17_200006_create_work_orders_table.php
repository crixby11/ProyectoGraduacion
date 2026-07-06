<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20)->unique()->comment('OT-2026-001');
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete()->comment('Técnico asignado');

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

            // Tipo y estado
            $table->string('service_type', 80)->nullable()->comment('Tipo de servicio');
            $table->string('reference', 100)->nullable()->comment('Referencia interna');
            $table->enum('status', [
                'recibido',
                'diagnostico',
                'en_progreso',
                'listo',
                'entregado',
                'cancelado',
            ])->default('recibido');

            // Fechas
            $table->timestamp('received_at')->nullable();
            $table->date('promised_at')->nullable()->comment('Fecha entrega prometida');
            $table->timestamp('delivered_at')->nullable();

            // Diagnóstico y trabajo
            $table->text('problem')->nullable()->comment('Problema reportado');
            $table->text('inspection')->nullable()->comment('Revisión/diagnóstico');
            $table->text('solution')->nullable()->comment('Solución aplicada');
            $table->text('comments')->nullable()->comment('Comentarios adicionales');

            // Totales calculados (desnormalizados para rendimiento)
            $table->decimal('subtotal_services', 12, 2)->default(0);
            $table->decimal('subtotal_parts', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index('number');
            $table->index('status');
            $table->index('promised_at');
            $table->index('received_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
