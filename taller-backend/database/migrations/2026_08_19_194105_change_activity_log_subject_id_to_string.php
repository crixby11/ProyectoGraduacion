<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * subject_id era bigint unsigned, incompatible con modelos de clave primaria
     * no numérica (ej. Setting, cuya PK es el nombre de la clave de config).
     * Se amplía a string para admitir ambos casos sin perder auditoría.
     * Se usa SQL directo para no depender de doctrine/dbal solo por este cambio.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE activity_log MODIFY subject_id VARCHAR(255) NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE activity_log MODIFY subject_id BIGINT UNSIGNED NULL');
    }
};
