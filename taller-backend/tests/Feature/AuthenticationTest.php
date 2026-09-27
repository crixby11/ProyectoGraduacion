<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    /** @dataProvider protectedEndpoints */
    public function test_protected_endpoints_reject_anonymous_requests(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertStatus(401);
    }

    public static function protectedEndpoints(): array
    {
        return [
            'listar pagos' => ['GET', '/api/v1/payments'],
            'registrar pago' => ['POST', '/api/v1/payments'],
            'facturas' => ['GET', '/api/v1/invoices'],
            'configuracion' => ['PUT', '/api/v1/settings'],
            'reporte del taller' => ['GET', '/api/v1/reports/performance/export?format=csv'],
            'reporte de empleados' => ['GET', '/api/v1/employees/stats/export?format=csv'],
            'ordenes de compra' => ['POST', '/api/v1/purchase-orders'],
            'inventario' => ['POST', '/api/v1/inventory'],
        ];
    }

    public function test_login_rejects_wrong_credentials(): void
    {
        $this->postJson('/api/v1/login', ['email' => 'nadie@taller.com', 'password' => 'mala'])
            ->assertStatus(401);
    }
}
