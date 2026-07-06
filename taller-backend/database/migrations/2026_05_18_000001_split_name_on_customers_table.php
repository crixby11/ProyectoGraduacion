<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('first_name', 100)->after('id');
            $table->string('last_name', 100)->after('first_name');
        });

        // Migrar datos existentes: split en el primer espacio
        \DB::statement("UPDATE customers SET first_name = SUBSTRING_INDEX(name, ' ', 1), last_name = TRIM(SUBSTRING(name, LOCATE(' ', name)))");

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropColumn('name');
            $table->index('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('name')->after('id');
        });

        \DB::statement("UPDATE customers SET name = CONCAT(first_name, ' ', last_name)");

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name']);
            $table->index('name');
        });
    }
};
