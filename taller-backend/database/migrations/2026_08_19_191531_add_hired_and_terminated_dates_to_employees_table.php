<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->date('hired_at')->nullable()->comment('Fecha de contrato');
            $table->date('terminated_at')->nullable()->comment('Fecha de terminación, si aplica');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['hired_at', 'terminated_at']);
        });
    }
};
