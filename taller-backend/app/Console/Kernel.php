<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Envía recordatorios WhatsApp a citas del día siguiente, todos los días a las 10am
        $schedule->call(function () {
            $tomorrow = now()->addDay()->toDateString();

            \App\Models\Appointment::whereDate('start_at', $tomorrow)
                ->where('reminder_sent', false)
                ->whereNotNull('customer_phone')
                ->whereIn('status', ['programada', 'confirmada'])
                ->get()
                ->each(fn($apt) => \App\Jobs\SendWhatsAppReminder::dispatch($apt));
        })->dailyAt('10:00')->name('send-appointment-reminders')->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
