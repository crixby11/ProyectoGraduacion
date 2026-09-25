<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->decimal('subtotal', 12, 2)->default(0)->after('subtotal_parts');
            $table->decimal('discount_percent', 5, 2)->default(0)->after('subtotal');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('discount_percent');

            // 'estandar' = todo el subtotal cae en gravado 15% (comportamiento
            // por defecto); las otras dos opciones tratan el subtotal completo
            // como exonerado o como gravado 18%. Igual que en Factura, pero
            // como enum en vez de montos sueltos, porque en la cotización el
            // subtotal cambia cada vez que se agrega/quita un servicio o
            // repuesto — un monto fijo se desincronizaría del subtotal real.
            $table->enum('tax_mode', ['estandar', 'exonerado', 'gravado_18'])->default('estandar')->after('discount_amount');

            $table->decimal('exempt_amount', 12, 2)->default(0)->after('tax_mode');
            $table->decimal('taxed_15_amount', 12, 2)->default(0)->after('exempt_amount');
            $table->decimal('tax_15_amount', 12, 2)->default(0)->after('taxed_15_amount');
            $table->decimal('taxed_18_amount', 12, 2)->default(0)->after('tax_15_amount');
            $table->decimal('tax_18_amount', 12, 2)->default(0)->after('taxed_18_amount');
            $table->decimal('tax_percent', 5, 2)->default(0)->after('tax_18_amount');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('tax_percent');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn([
                'subtotal', 'discount_percent', 'discount_amount', 'tax_mode',
                'exempt_amount', 'taxed_15_amount', 'tax_15_amount',
                'taxed_18_amount', 'tax_18_amount', 'tax_percent', 'tax_amount',
            ]);
        });
    }
};
