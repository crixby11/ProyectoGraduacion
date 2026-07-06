<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWhatsAppReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function handle(WhatsAppService $whatsApp): void
    {
        if ($this->appointment->reminder_sent || ! $this->appointment->customer_phone) {
            return;
        }

        $date = $this->appointment->start_at->format('d/m/Y \a \l\a\s H:i');
        $message = "Hola {$this->appointment->customer_name},\n" .
            "Le recordamos su cita en el Taller el {$date}.\n" .
            "Motivo: {$this->appointment->title}\n" .
            "Si necesita reprogramar contáctenos. ¡Gracias!";

        $sent = $whatsApp->sendViaTwilio($this->appointment->customer_phone, $message);

        if ($sent) {
            $this->appointment->update([
                'reminder_sent' => true,
                'reminder_sent_at' => now(),
            ]);
        }
    }
}
