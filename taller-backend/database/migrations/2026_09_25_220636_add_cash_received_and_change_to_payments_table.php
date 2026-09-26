<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Solo pagos en efectivo: lo que entregó el cliente y el cambio devuelto.
        // 'amount' sigue siendo lo abonado a la factura (nunca más que el saldo).
        // Pagos anteriores y de otros métodos quedan con amount_received NULL.
        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount_received', 12, 2)->nullable()->after('amount');
            $table->decimal('change_given', 12, 2)->default(0)->after('amount_received');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['amount_received', 'change_given']);
        });
    }
};
