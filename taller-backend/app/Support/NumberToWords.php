<?php

namespace App\Support;

class NumberToWords
{
    private static array $unidades = [
        '', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
        'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
        'dieciocho', 'diecinueve', 'veinte',
    ];

    private static array $veintes = [
        1 => 'veintiuno', 2 => 'veintidós', 3 => 'veintitrés', 4 => 'veinticuatro',
        5 => 'veinticinco', 6 => 'veintiséis', 7 => 'veintisiete', 8 => 'veintiocho', 9 => 'veintinueve',
    ];

    private static array $decenas = [
        3 => 'treinta', 4 => 'cuarenta', 5 => 'cincuenta',
        6 => 'sesenta', 7 => 'setenta', 8 => 'ochenta', 9 => 'noventa',
    ];

    private static array $centenas = [
        1 => 'ciento', 2 => 'doscientos', 3 => 'trescientos', 4 => 'cuatrocientos',
        5 => 'quinientos', 6 => 'seiscientos', 7 => 'setecientos', 8 => 'ochocientos', 9 => 'novecientos',
    ];

    public static function convertLempiras(float $amount): string
    {
        $amount   = round($amount, 2);
        $entero   = (int) floor($amount);
        $centavos = (int) round(($amount - $entero) * 100);

        $letras = $entero === 0 ? 'cero' : self::convert($entero);
        $letras = ucfirst($letras);
        $unidad = $entero === 1 ? 'lempira' : 'lempiras';

        return sprintf('%s %s con %02d/100', $letras, $unidad, $centavos);
    }

    private static function convert(int $n): string
    {
        if ($n === 100) {
            return 'cien';
        }

        if ($n < 21) {
            return self::$unidades[$n];
        }

        if ($n < 30) {
            return $n === 20 ? 'veinte' : self::$veintes[$n - 20];
        }

        if ($n < 100) {
            $d = intdiv($n, 10);
            $u = $n % 10;

            return self::$decenas[$d].($u > 0 ? ' y '.self::$unidades[$u] : '');
        }

        if ($n < 1000) {
            $c = intdiv($n, 100);
            $resto = $n % 100;

            return trim(self::$centenas[$c].($resto > 0 ? ' '.self::convert($resto) : ''));
        }

        if ($n < 1000000) {
            $miles = intdiv($n, 1000);
            $resto = $n % 1000;
            $prefijo = $miles === 1 ? 'mil' : self::convert($miles).' mil';

            return trim($prefijo.($resto > 0 ? ' '.self::convert($resto) : ''));
        }

        $millones = intdiv($n, 1000000);
        $resto = $n % 1000000;
        $prefijo = $millones === 1 ? 'un millón' : self::convert($millones).' millones';

        return trim($prefijo.($resto > 0 ? ' '.self::convert($resto) : ''));
    }
}
