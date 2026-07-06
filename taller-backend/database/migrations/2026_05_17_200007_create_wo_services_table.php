<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wo_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();

            $table->string('service_name')->comment('Snapshot del nombre del servicio');
            $table->text('description')->nullable();
            $table->decimal('hours', 6, 2)->default(1)->comment('Horas trabajadas');
            $table->decimal('hourly_rate', 8, 2)->default(0)->comment('Tarifa por hora aplicada');
            $table->decimal('subtotal', 10, 2)->default(0)->comment('hours × hourly_rate');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wo_services');
    }
};
