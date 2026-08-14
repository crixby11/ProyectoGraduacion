<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('supplier')->constrained('suppliers')->nullOnDelete();
        });

        // Migra los valores de texto libre existentes a registros reales en suppliers
        $names = DB::table('inventory')
            ->whereNotNull('supplier')
            ->where('supplier', '!=', '')
            ->distinct()
            ->pluck('supplier');

        foreach ($names as $name) {
            $trimmed = trim($name);
            if ($trimmed === '') {
                continue;
            }

            $supplierId = DB::table('suppliers')->where('name', $trimmed)->value('id');
            if (! $supplierId) {
                $supplierId = DB::table('suppliers')->insertGetId([
                    'name'       => $trimmed,
                    'active'     => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('inventory')->where('supplier', $name)->update(['supplier_id' => $supplierId]);
        }

        Schema::table('inventory', function (Blueprint $table) {
            $table->dropColumn('supplier');
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $table->string('supplier', 150)->nullable()->after('brand');
        });

        DB::table('inventory')->update([
            'supplier' => DB::raw('(select name from suppliers where suppliers.id = inventory.supplier_id)'),
        ]);

        Schema::table('inventory', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
        });
    }
};
