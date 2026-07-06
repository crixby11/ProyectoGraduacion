<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('programada','confirmada','completada','cancelada','no_presente') NOT NULL DEFAULT 'programada'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('programada','confirmada','completada','cancelada') NOT NULL DEFAULT 'programada'");
    }
};
