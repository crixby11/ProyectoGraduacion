<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('plate', 20)->unique();
            $table->string('brand', 60);
            $table->string('model', 60);
            $table->year('year')->nullable();
            $table->string('color', 40)->nullable();
            $table->string('engine_type', 60)->nullable()->comment('Tipo de motor');
            $table->string('vin', 30)->nullable()->unique();
            $table->string('displacement', 20)->nullable()->comment('Cilindraje');
            $table->text('description')->nullable()->comment('Observaciones generales del vehículo');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('plate');
            $table->index(['brand', 'model']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
