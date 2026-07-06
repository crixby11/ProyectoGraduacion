<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('specialty', 100)->nullable()->comment('Especialidad técnica');
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->decimal('hourly_rate', 8, 2)->default(0)->comment('Tarifa por hora');
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
