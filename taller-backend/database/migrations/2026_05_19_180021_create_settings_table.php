<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Valores por defecto
        DB::table('settings')->insert([
            ['key' => 'shop_name',    'value' => 'Taller Mecánico',       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_address', 'value' => '',                       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_phone',   'value' => '',                       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_email',   'value' => '',                       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_rtn',     'value' => '',                       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'shop_city',    'value' => '',                       'created_at' => now(), 'updated_at' => now()],
            ['key' => 'invoice_notes','value' => 'Gracias por su preferencia.', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
