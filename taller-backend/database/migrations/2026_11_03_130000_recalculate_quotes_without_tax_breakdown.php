<?php

use App\Models\Quote;
use Illuminate\Database\Migrations\Migration;

/**
 * Las cotizaciones creadas antes del desglose fiscal quedaron con subtotal e ISV
 * en cero aunque tienen total. Se recalculan para que muestren el impuesto.
 * Las ya convertidas en OT son registro histórico: se completa el subtotal sin
 * tocar el total que se acordó con el cliente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Quote::withTrashed()
            ->where('subtotal', 0)
            ->where('total', '>', 0)
            ->get()
            ->each(function (Quote $quote) {
                if ($quote->status === 'convertida') {
                    $quote->subtotal_services = $quote->services()->sum('subtotal');
                    $quote->subtotal_parts = $quote->parts()->sum('subtotal');
                    $quote->subtotal = $quote->subtotal_services + $quote->subtotal_parts;
                    $quote->saveQuietly();

                    return;
                }
                $quote->recalculateTotals();
            });
    }

    public function down(): void
    {
        // Sin reversa: los montos anteriores eran inconsistentes.
    }
};
