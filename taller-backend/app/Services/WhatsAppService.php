<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Employee;
use App\Models\WorkOrder;
use Carbon\Carbon;

class WhatsAppService
{
    /**
     * Enlace de WhatsApp con el listado de OTs del empleado (como técnico
     * asignado) cuya fecha de entrega prometida cae en la semana actual
     * (lunes a domingo) y siguen abiertas.
     */
    public function employeeWeeklyOtsLink(Employee $employee): string
    {
        $weekStart = now()->startOfWeek(Carbon::MONDAY)->toDateString();
        $weekEnd = now()->endOfWeek(Carbon::SUNDAY)->toDateString();

        $workOrders = WorkOrder::where('employee_id', $employee->id)
            ->whereNotIn('status', ['entregado', 'cancelado'])
            ->whereBetween('promised_at', [$weekStart, $weekEnd])
            ->orderBy('promised_at')
            ->get();

        abort_if($workOrders->isEmpty(), 422, 'Este empleado no tiene OTs con entrega programada esta semana');

        $phone = preg_replace('/\D/', '', $employee->phone ?? '');
        abort_if(! $phone, 422, 'El empleado no tiene un número de teléfono registrado');

        $lines = $workOrders->map(function (WorkOrder $wo) {
            $vehicle = trim("{$wo->vehicle_brand} {$wo->vehicle_model}");
            $date = $wo->promised_at?->format('d/m');

            return "• {$wo->number} — {$wo->customer_name}" . ($vehicle ? " ({$vehicle})" : '') . " — entrega: {$date}";
        })->implode("\n");

        $message = urlencode(
            "Hola {$employee->first_name},\n" .
            "Este es tu recordatorio semanal — estas son tus OTs con entrega programada esta semana:\n\n" .
            "{$lines}\n\n" .
            "¡Gracias por tu trabajo!"
        );

        return "https://wa.me/{$phone}?text={$message}";
    }

    public function appointmentReminderLink(Appointment $appointment): string
    {
        $phone = preg_replace('/\D/', '', $appointment->customer_phone ?? '');

        $date = $appointment->start_at->format('d/m/Y \a \l\a\s H:i');
        $message = urlencode(
            "Hola {$appointment->customer_name},\n" .
            "Le recordamos su cita en el Taller el {$date}.\n" .
            "Motivo: {$appointment->title}\n" .
            "Si necesita reprogramar contáctenos. ¡Gracias!"
        );

        $appointment->update([
            'reminder_sent' => true,
            'reminder_sent_at' => now(),
        ]);

        return "https://wa.me/{$phone}?text={$message}";
    }

    public function sendViaTwilio(string $to, string $message): bool
    {
        $sid = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from = config('services.twilio.whatsapp_from');

        if (empty($sid) || empty($token)) {
            return false;
        }

        $client = new \Twilio\Rest\Client($sid, $token);

        $client->messages->create(
            "whatsapp:{$to}",
            ['from' => $from, 'body' => $message]
        );

        return true;
    }
}
