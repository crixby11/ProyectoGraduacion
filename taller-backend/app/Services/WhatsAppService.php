<?php

namespace App\Services;

use App\Models\Appointment;

class WhatsAppService
{
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
