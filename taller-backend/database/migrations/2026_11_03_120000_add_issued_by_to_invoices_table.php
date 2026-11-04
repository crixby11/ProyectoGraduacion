<?php

use App\Models\Invoice;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('issued_by')->nullable()->after('issued_at')
                ->constrained('users')->nullOnDelete()->comment('Usuario que emitió la factura');
        });

        // Facturas anteriores: se toma el usuario que la creó según la bitácora, si existe.
        DB::table('activity_log')
            ->where('subject_type', Invoice::class)
            ->where('event', 'created')
            ->whereNotNull('causer_id')
            ->orderBy('id')
            ->get(['subject_id', 'causer_id'])
            ->each(fn ($log) => DB::table('invoices')
                ->where('id', $log->subject_id)
                ->whereNull('issued_by')
                ->whereExists(fn ($q) => $q->from('users')->where('id', $log->causer_id))
                ->update(['issued_by' => $log->causer_id]));
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('issued_by');
        });
    }
};
