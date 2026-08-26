<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('exempt_amount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('taxed_15_amount', 12, 2)->default(0)->after('exempt_amount');
            $table->decimal('tax_15_amount', 12, 2)->default(0)->after('taxed_15_amount');
            $table->decimal('taxed_18_amount', 12, 2)->default(0)->after('tax_15_amount');
            $table->decimal('tax_18_amount', 12, 2)->default(0)->after('taxed_18_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['exempt_amount', 'taxed_15_amount', 'tax_15_amount', 'taxed_18_amount', 'tax_18_amount']);
        });
    }
};
