<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;

trait CreatesApplication
{
    /**
     * Creates the application.
     */
    public function createApplication(): Application
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        // Red de seguridad: RefreshDatabase borra y reconstruye todas las tablas. Si por cualquier
        // motivo la conexión no es la base de pruebas, se aborta ANTES de tocar nada.
        $database = (string) $app['config']->get('database.connections.' . $app['config']->get('database.default') . '.database');
        if (! str_ends_with($database, '_test')) {
            throw new \RuntimeException("Las pruebas solo pueden correr contra una base cuyo nombre termine en _test (actual: '{$database}').");
        }

        return $app;
    }
}
