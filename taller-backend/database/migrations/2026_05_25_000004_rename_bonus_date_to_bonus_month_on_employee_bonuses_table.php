<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_bonuses', function (Blueprint $table) {
            $table->renameColumn('bonus_date', 'bonus_month');
        });
    }

    public function down(): void
    {
        Schema::table('employee_bonuses', function (Blueprint $table) {
            $table->renameColumn('bonus_month', 'bonus_date');
        });
    }
};
