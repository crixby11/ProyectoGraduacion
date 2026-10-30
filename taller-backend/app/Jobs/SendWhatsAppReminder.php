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
        $this->appointment->loadMissing('customer');
        $phone = $this->appointment->customer_phone ?: $this->appointment->customer?->phone;
        $name = $this->appointment->customer_name ?: $this->appointment->customer?->name;

        if ($this->appointment->reminder_sent || ! $phone) {
            return;
        }

        $date = \Carbon\Carbon::parse($this->appointment->start_at)->format('d/m/Y \a \l\a\s H:i');
        $message = "Hola {$name},\n" .
            "Le recordamos su cita en el Taller el {$date}.\n" .
            "Motivo: {$this->appointment->title}\n" .
            "Si necesita reprogramar contáctenos. ¡Gracias!";

        $sent = $whatsApp->sendViaTwilio($phone, $message);

        if ($sent) {
            $this->appointment->update([
                'reminder_sent' => true,
                'reminder_sent_at' => now(),
            ]);
        }
    }
}
