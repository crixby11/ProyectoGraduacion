<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Paso 1: columna puente (sin FK todavía, se backfillea antes de exigirla)
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('supplier_purchase_id')->nullable()->after('id');
        });

        // Paso 2: migrar cada pago existente a una "compra" propia.
        // - pagado    -> compra con total = monto, y se conserva el pago como abono completo.
        // - pendiente -> compra con total = monto sin abonos (no se descarta el dato: se preserva como deuda).
        $oldPayments = DB::table('supplier_payments')->get();

        foreach ($oldPayments as $old) {
            $purchaseId = DB::table('supplier_purchases')->insertGetId([
                'supplier_id'            => $old->supplier_id,
                'inventory_movement_id'  => $old->inventory_movement_id,
                'total'                  => $old->amount,
                'amount_paid'            => $old->status === 'pagado' ? $old->amount : 0,
                'balance'                => $old->status === 'pagado' ? 0 : $old->amount,
                'status'                 => $old->status === 'pagado' ? 'pagado' : 'pendiente',
                'notes'                  => $old->notes,
                'created_at'             => $old->created_at,
                'updated_at'             => $old->updated_at,
            ]);

            if ($old->status === 'pagado') {
                DB::table('supplier_payments')->where('id', $old->id)->update([
                    'supplier_purchase_id' => $purchaseId,
                ]);
            } else {
                // No hubo dinero real de por medio: no queda como "pago", la deuda ya vive en supplier_purchases.
                DB::table('supplier_payments')->where('id', $old->id)->delete();
            }
        }

        // Paso 3: ahora que todo pago restante tiene supplier_purchase_id, se puede exigir y restringir.
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('supplier_purchase_id')->nullable(false)->change();
            $table->foreign('supplier_purchase_id')->references('id')->on('supplier_purchases')->cascadeOnDelete();
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropForeign(['inventory_movement_id']);
            $table->dropColumn(['supplier_id', 'inventory_movement_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_movement_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', ['pagado', 'pendiente'])->default('pagado');
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->dropForeign(['supplier_purchase_id']);
            $table->dropColumn('supplier_purchase_id');
        });
    }
};
