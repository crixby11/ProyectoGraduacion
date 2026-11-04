<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Rango de fechas de un reporte: desde/hasta, el período anterior con el que
 * se compara y cómo se agrupan las cifras en la gráfica (día, semana o mes).
 */
class ReportRange
{
    public const PRESETS = [
        'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month',
        'this_quarter', 'this_year', 'last_year', 'last_7', 'last_30', 'last_90', 'custom',
    ];

    public const GROUPS = ['day', 'week', 'month'];

    /** Rango máximo permitido en un reporte personalizado (5 años). */
    private const MAX_DAYS = 1830;

    private const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    public function __construct(
        public readonly string $preset,
        public readonly string $label,
        public readonly Carbon $from,
        public readonly Carbon $to,
        public readonly Carbon $prevFrom,
        public readonly Carbon $prevTo,
        public readonly string $group,
        public readonly string $compareLabel,
    ) {}

    /** Reglas de validación de los parámetros de rango. */
    public static function rules(): array
    {
        return [
            'preset' => 'nullable|in:' . implode(',', self::PRESETS),
            'from'   => 'required_if:preset,custom|nullable|date',
            'to'     => 'required_if:preset,custom|nullable|date|after_or_equal:from',
            'group'  => 'nullable|in:' . implode(',', self::GROUPS),
        ];
    }

    public static function fromInput(array $input): self
    {
        $preset = $input['preset'] ?? 'this_month';
        $now = now();
        $today = $now->copy()->startOfDay();

        // [desde, hasta, unidad de calendario (o null si es un rango móvil), etiqueta]
        [$from, $to, $unit, $label] = match ($preset) {
            'today'        => [$today->copy(), $today->copy()->endOfDay(), 'day', 'Hoy'],
            'yesterday'    => [$today->copy()->subDay(), $today->copy()->subDay()->endOfDay(), 'day', 'Ayer'],
            'this_week'    => [$today->copy()->startOfWeek(Carbon::MONDAY), $today->copy()->endOfWeek(Carbon::SUNDAY), 'week', 'Esta semana'],
            'last_week'    => [$today->copy()->subWeek()->startOfWeek(Carbon::MONDAY), $today->copy()->subWeek()->endOfWeek(Carbon::SUNDAY), 'week', 'Semana pasada'],
            'last_month'   => [$today->copy()->subMonthNoOverflow()->startOfMonth(), $today->copy()->subMonthNoOverflow()->endOfMonth(), 'month', 'Mes pasado'],
            'this_quarter' => [$today->copy()->firstOfQuarter(), $today->copy()->lastOfQuarter()->endOfDay(), 'quarter', 'Este trimestre'],
            'this_year'    => [$today->copy()->startOfYear(), $today->copy()->endOfYear(), 'year', 'Este año'],
            'last_year'    => [$today->copy()->subYear()->startOfYear(), $today->copy()->subYear()->endOfYear(), 'year', 'Año pasado'],
            'last_7'       => [$today->copy()->subDays(6), $today->copy()->endOfDay(), null, 'Últimos 7 días'],
            'last_30'      => [$today->copy()->subDays(29), $today->copy()->endOfDay(), null, 'Últimos 30 días'],
            'last_90'      => [$today->copy()->subDays(89), $today->copy()->endOfDay(), null, 'Últimos 90 días'],
            'custom'       => [
                Carbon::parse($input['from'])->startOfDay(),
                Carbon::parse($input['to'])->endOfDay(),
                null,
                'Personalizado',
            ],
            default        => [$today->copy()->startOfMonth(), $today->copy()->endOfMonth(), 'month', 'Este mes'],
        };
        if (! in_array($preset, self::PRESETS, true)) {
            $preset = 'this_month';
        }

        $days = $from->diffInDays($to) + 1;
        if ($days > self::MAX_DAYS) {
            throw ValidationException::withMessages(['to' => 'El rango no puede ser mayor a 5 años.']);
        }

        // Se compara contra el mismo tramo transcurrido: si hoy es día 3 del mes,
        // "Este mes" (1-3) se compara con los días 1-3 del mes anterior.
        $effectiveTo = $to->greaterThan($now) && $from->lessThanOrEqualTo($now) ? $now->copy()->endOfDay() : $to->copy();
        if ($unit) {
            $prevFrom = self::shift($from, $unit);
            $prevTo = self::shift($effectiveTo, $unit);
            $compareLabel = match ($unit) {
                'day'     => 'vs día anterior',
                'week'    => 'vs semana anterior',
                'month'   => 'vs mes anterior',
                'quarter' => 'vs trimestre anterior',
                'year'    => 'vs año anterior',
            };
        } else {
            $length = $from->diffInDays($effectiveTo) + 1;
            $prevTo = $from->copy()->subDay()->endOfDay();
            $prevFrom = $prevTo->copy()->subDays($length - 1)->startOfDay();
            $compareLabel = "vs {$length} días anteriores";
        }

        $group = $input['group'] ?? null;
        if (! in_array($group, self::GROUPS, true)) {
            $group = $days <= 31 ? 'day' : ($days <= 120 ? 'week' : 'month');
        }
        // Evita gráficas ilegibles con cientos de barras.
        if ($group === 'day' && $days > 92) {
            $group = $days > 400 ? 'month' : 'week';
        } elseif ($group === 'week' && $days > 731) {
            $group = 'month';
        }

        return new self($preset, $label, $from, $to, $prevFrom, $prevTo, $group, $compareLabel);
    }

    private static function shift(Carbon $date, string $unit): Carbon
    {
        $d = $date->copy();

        return match ($unit) {
            'day'     => $d->subDay(),
            'week'    => $d->subWeek(),
            'month'   => $d->subMonthNoOverflow(),
            'quarter' => $d->subQuarterNoOverflow(),
            'year'    => $d->subYearNoOverflow(),
        };
    }

    /** "01/11/2026 al 30/11/2026" o una sola fecha si el rango es de un día. */
    public function rangeText(): string
    {
        return self::spanText($this->from, $this->to);
    }

    public function previousText(): string
    {
        return self::spanText($this->prevFrom, $this->prevTo);
    }

    private static function spanText(Carbon $from, Carbon $to): string
    {
        return $from->isSameDay($to)
            ? $from->format('d/m/Y')
            : $from->format('d/m/Y') . ' al ' . $to->format('d/m/Y');
    }

    /** Expresión SQL que agrupa una columna de fecha según el agrupamiento del rango. */
    public function bucketSql(string $column): string
    {
        return match ($this->group) {
            'day'   => "DATE_FORMAT($column, '%Y-%m-%d')",
            'week'  => "DATE_FORMAT(DATE_SUB(DATE($column), INTERVAL WEEKDAY($column) DAY), '%Y-%m-%d')",
            'month' => "DATE_FORMAT($column, '%Y-%m')",
        };
    }

    /**
     * Lista ordenada de grupos (clave + etiqueta) que cubren el rango. En rangos que
     * incluyen días futuros la gráfica termina hoy.
     */
    public function buckets(): array
    {
        $now = now();
        $end = $this->to->greaterThan($now) && $this->from->lessThanOrEqualTo($now) ? $now->copy()->endOfDay() : $this->to;

        $cursor = match ($this->group) {
            'day'   => $this->from->copy()->startOfDay(),
            'week'  => $this->from->copy()->startOfWeek(Carbon::MONDAY),
            'month' => $this->from->copy()->startOfMonth(),
        };

        $buckets = [];
        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $this->group === 'month' ? $cursor->format('Y-m') : $cursor->format('Y-m-d');
            $buckets[] = ['key' => $key, 'label' => $this->bucketLabel($cursor)];
            match ($this->group) {
                'day'   => $cursor->addDay(),
                'week'  => $cursor->addWeek(),
                'month' => $cursor->addMonthNoOverflow(),
            };
        }

        return $buckets;
    }

    private function bucketLabel(Carbon $d): string
    {
        return match ($this->group) {
            'day'   => $d->format('d/m'),
            'week'  => 'Sem ' . $d->format('d/m'),
            'month' => self::MONTHS[$d->month - 1] . ' ' . $d->format('Y'),
        };
    }

    public function groupLabel(): string
    {
        return ['day' => 'día', 'week' => 'semana', 'month' => 'mes'][$this->group];
    }

    public function toArray(): array
    {
        return [
            'preset'        => $this->preset,
            'label'         => $this->label,
            'from'          => $this->from->toDateString(),
            'to'            => $this->to->toDateString(),
            'text'          => $this->rangeText(),
            'prev_from'     => $this->prevFrom->toDateString(),
            'prev_to'       => $this->prevTo->toDateString(),
            'prev_text'     => $this->previousText(),
            'compare_label' => $this->compareLabel,
            'group'         => $this->group,
        ];
    }
}
