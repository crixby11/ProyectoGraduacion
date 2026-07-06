<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('second_name', 100)->nullable()->after('first_name');
            $table->string('second_last_name', 100)->nullable()->after('last_name');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->string('second_name', 100)->nullable()->after('first_name');
            $table->string('second_last_name', 100)->nullable()->after('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['second_name', 'second_last_name']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['second_name', 'second_last_name']);
        });
    }
};
