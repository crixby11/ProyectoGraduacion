<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@taller.com'],
            [
                'name' => 'Administrador',
                'email' => 'admin@taller.com',
                'password' => Hash::make('Admin1234!'),
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Admin creado: admin@taller.com / Admin1234!');
    }
}
