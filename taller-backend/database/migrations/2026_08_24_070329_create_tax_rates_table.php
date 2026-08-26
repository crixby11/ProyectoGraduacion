<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('exonerado | gravado_15 | gravado_18');
            $table->string('name', 40);
            $table->decimal('percent', 5, 2);
            $table->timestamps();
        });

        DB::table('tax_rates')->insert([
            ['code' => 'exonerado',  'name' => 'Exonerado', 'percent' => 0,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'gravado_15', 'name' => '15%',        'percent' => 15, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'gravado_18', 'name' => '18%',        'percent' => 18, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
