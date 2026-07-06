<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('first_name', 100)->after('id');
            $table->string('last_name', 100)->after('first_name');
        });

        \DB::statement("UPDATE employees SET first_name = SUBSTRING_INDEX(name, ' ', 1), last_name = TRIM(SUBSTRING(name, LOCATE(' ', name)))");

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('name')->after('id');
        });

        \DB::statement("UPDATE employees SET name = CONCAT(first_name, ' ', last_name)");

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name']);
        });
    }
};
