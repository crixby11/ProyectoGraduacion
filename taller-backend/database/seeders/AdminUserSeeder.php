<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            if (! app()->environment('local')) {
                $this->command->error('Define ADMIN_EMAIL y ADMIN_PASSWORD en el .env antes de sembrar en este entorno.');

                return;
            }

            // Credenciales de desarrollo local únicamente — nunca se usan si
            // ADMIN_EMAIL/ADMIN_PASSWORD están definidos (como debe estar en producción).
            $email = 'admin@taller.com';
            $password = 'Admin1234!';
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Administrador',
                'email' => $email,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("Admin creado/actualizado: {$email}");
    }
}
