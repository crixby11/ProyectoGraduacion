<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('work_order_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->enum('status', ['programada', 'confirmada', 'completada', 'cancelada'])->default('programada');
            $table->dateTime('start_at');
            $table->dateTime('end_at')->nullable();
            $table->string('color', 10)->default('#3B82F6')->comment('Color para FullCalendar');

            // Datos de contacto snapshot para recordatorio
            $table->string('customer_name')->nullable();
            $table->string('customer_phone', 20)->nullable();

            $table->boolean('reminder_sent')->default(false);
            $table->timestamp('reminder_sent_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('start_at');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
