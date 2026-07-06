<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Service;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Entidades existentes ─────────────────────────────────────────────
        $juan    = Customer::where('phone', '70001111')->first();
        $maria   = Customer::where('phone', '70002222')->first();
        $roberto = Customer::where('phone', '70003333')->first();
        $ana     = Customer::where('phone', '70004444')->first();
        $carlos  = Customer::where('phone', '70005555')->first();

        $corolla  = Vehicle::where('plate', 'ABC123')->first();
        $civic    = Vehicle::where('plate', 'DEF456')->first();
        $tucson   = Vehicle::where('plate', 'GHI789')->first();
        $vitara   = Vehicle::where('plate', 'JKL012')->first();
        $sportage = Vehicle::where('plate', 'MNO345')->first();
        $frontier = Vehicle::where('plate', 'PQR678')->first();

        $empCarlos = Employee::where('phone', '88001122')->first(); // Motor
        $empAndres = Employee::where('phone', '88005566')->first(); // Frenos
        $empMario  = Employee::where('phone', '88007788')->first(); // Diagnóstico

        $svcAceite     = Service::where('name', 'Cambio de aceite y filtro')->first();
        $svcAlineacion = Service::where('name', 'Alineación y balanceo')->first();
        $svcFrenosRev  = Service::where('name', 'Revisión de frenos')->first();
        $svcPastillas  = Service::where('name', 'Cambio de pastillas de freno')->first();
        $svcDiagnostico = Service::where('name', 'Diagnóstico computarizado')->first();
        $svcBanda      = Service::where('name', 'Cambio de banda de distribución')->first();

        $invAceite    = Inventory::where('sku', 'ACE-5W30-1L')->first();
        $invFiltro    = Inventory::where('sku', 'FIL-TOY-001')->first();
        $invPastillas = Inventory::where('sku', 'PAS-HON-D01')->first();
        $invBanda     = Inventory::where('sku', 'BAN-HYU-001')->first();
        $invLiquido   = Inventory::where('sku', 'LIQ-DOT4-500')->first();

        $admin = User::where('email', 'admin@taller.com')->first();

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-001 — Cambio de aceite Toyota Corolla (entregado, pagada)
        // ═══════════════════════════════════════════════════════════════════
        $wo1 = WorkOrder::updateOrCreate(['number' => 'OT-2026-001'], [
            'customer_id'    => $juan->id,
            'vehicle_id'     => $corolla->id,
            'employee_id'    => $empCarlos->id,
            'customer_name'  => $juan->first_name . ' ' . $juan->last_name,
            'customer_phone' => $juan->phone,
            'vehicle_plate'  => $corolla->plate,
            'vehicle_brand'  => $corolla->brand,
            'vehicle_model'  => $corolla->model,
            'vehicle_year'   => $corolla->year,
            'vehicle_color'  => $corolla->color,
            'vehicle_engine' => $corolla->engine_type,
            'service_type'   => 'Mantenimiento preventivo',
            'status'         => 'entregado',
            'problem'        => 'Cambio de aceite programado. Último servicio hace 5,000 km.',
            'inspection'     => 'Vehículo en buen estado general. Nivel de aceite bajo, color oscuro.',
            'solution'       => 'Se realizó cambio de aceite 5W-30 (4 litros) y filtro de aceite. Sin anomalías adicionales.',
            'subtotal_services' => 12000,
            'subtotal_parts'    => 16800,
            'total'             => 28800,
            'received_at'    => now()->subDays(10),
            'promised_at'    => now()->subDays(8)->toDateString(),
            'delivered_at'   => now()->subDays(8),
        ]);

        if ($wo1->services()->count() === 0) {
            $wo1->services()->create([
                'service_id'   => $svcAceite->id,
                'employee_id'  => $empCarlos->id,
                'service_name' => $svcAceite->name,
                'description'  => $svcAceite->description,
                'hours'        => 0.5,
                'hourly_rate'  => 24000,
                'subtotal'     => 12000,
            ]);
        }

        if ($wo1->parts()->count() === 0) {
            $wo1->parts()->create([
                'inventory_id' => $invAceite->id,
                'part_name'    => $invAceite->name,
                'part_sku'     => $invAceite->sku,
                'quantity'     => 4,
                'unit_price'   => 3500,
                'subtotal'     => 14000,
            ]);
            $wo1->parts()->create([
                'inventory_id' => $invFiltro->id,
                'part_name'    => $invFiltro->name,
                'part_sku'     => $invFiltro->sku,
                'quantity'     => 1,
                'unit_price'   => 2800,
                'subtotal'     => 2800,
            ]);
        }

        $fac1 = Invoice::updateOrCreate(['number' => 'FAC-2026-001'], [
            'work_order_id'     => $wo1->id,
            'customer_id'       => $juan->id,
            'status'            => 'pagada',
            'subtotal_services' => 12000,
            'subtotal_parts'    => 16800,
            'subtotal'          => 28800,
            'discount_percent'  => 0,
            'discount_amount'   => 0,
            'tax_percent'       => 0,
            'tax_amount'        => 0,
            'total'             => 28800,
            'amount_paid'       => 28800,
            'balance'           => 0,
            'issued_at'         => now()->subDays(8),
            'paid_at'           => now()->subDays(8),
        ]);

        if ($fac1->payments()->count() === 0) {
            $fac1->payments()->create([
                'work_order_id' => $wo1->id,
                'customer_id'   => $juan->id,
                'user_id'       => $admin?->id,
                'method'        => 'efectivo',
                'amount'        => 28800,
                'payment_date'  => now()->subDays(8)->toDateString(),
                'notes'         => 'Pago completo al momento de la entrega.',
            ]);
        }

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-002 — Frenos Honda Civic (entregado, pago parcial)
        // ═══════════════════════════════════════════════════════════════════
        $wo2 = WorkOrder::updateOrCreate(['number' => 'OT-2026-002'], [
            'customer_id'    => $maria->id,
            'vehicle_id'     => $civic->id,
            'employee_id'    => $empAndres->id,
            'customer_name'  => $maria->first_name . ' ' . $maria->last_name,
            'customer_phone' => $maria->phone,
            'vehicle_plate'  => $civic->plate,
            'vehicle_brand'  => $civic->brand,
            'vehicle_model'  => $civic->model,
            'vehicle_year'   => $civic->year,
            'vehicle_color'  => $civic->color,
            'vehicle_engine' => $civic->engine_type,
            'service_type'   => 'Frenos',
            'status'         => 'entregado',
            'problem'        => 'Frenos hacen ruido metálico al frenar. Pedal se siente esponjoso.',
            'inspection'     => 'Pastillas delanteras desgastadas al 10% de vida útil. Líquido de frenos bajo y contaminado.',
            'solution'       => 'Cambio de pastillas de freno delanteras Brembo. Cambio de líquido DOT4 y purga completa del sistema.',
            'subtotal_services' => 45000,
            'subtotal_parts'    => 21800,
            'total'             => 66800,
            'received_at'    => now()->subDays(6),
            'promised_at'    => now()->subDays(4)->toDateString(),
            'delivered_at'   => now()->subDays(4),
        ]);

        if ($wo2->services()->count() === 0) {
            $wo2->services()->create([
                'service_id'   => $svcFrenosRev->id,
                'employee_id'  => $empAndres->id,
                'service_name' => $svcFrenosRev->name,
                'description'  => $svcFrenosRev->description,
                'hours'        => 1.5,
                'hourly_rate'  => 13333,
                'subtotal'     => 20000,
            ]);
            $wo2->services()->create([
                'service_id'   => $svcPastillas->id,
                'employee_id'  => $empAndres->id,
                'service_name' => $svcPastillas->name,
                'description'  => $svcPastillas->description,
                'hours'        => 2.0,
                'hourly_rate'  => 12500,
                'subtotal'     => 25000,
            ]);
        }

        if ($wo2->parts()->count() === 0) {
            $wo2->parts()->create([
                'inventory_id' => $invPastillas->id,
                'part_name'    => $invPastillas->name,
                'part_sku'     => $invPastillas->sku,
                'quantity'     => 1,
                'unit_price'   => 18000,
                'subtotal'     => 18000,
            ]);
            $wo2->parts()->create([
                'inventory_id' => $invLiquido->id,
                'part_name'    => $invLiquido->name,
                'part_sku'     => $invLiquido->sku,
                'quantity'     => 1,
                'unit_price'   => 3800,
                'subtotal'     => 3800,
            ]);
        }

        $fac2 = Invoice::updateOrCreate(['number' => 'FAC-2026-002'], [
            'work_order_id'     => $wo2->id,
            'customer_id'       => $maria->id,
            'status'            => 'parcial',
            'subtotal_services' => 45000,
            'subtotal_parts'    => 21800,
            'subtotal'          => 66800,
            'discount_percent'  => 0,
            'discount_amount'   => 0,
            'tax_percent'       => 0,
            'tax_amount'        => 0,
            'total'             => 66800,
            'amount_paid'       => 30000,
            'balance'           => 36800,
            'issued_at'         => now()->subDays(4),
        ]);

        if ($fac2->payments()->count() === 0) {
            $fac2->payments()->create([
                'work_order_id' => $wo2->id,
                'customer_id'   => $maria->id,
                'user_id'       => $admin?->id,
                'method'        => 'transferencia',
                'amount'        => 30000,
                'payment_date'  => now()->subDays(4)->toDateString(),
                'reference'     => 'TRF-20260702',
                'notes'         => 'Abono inicial. Saldo pendiente: Lps 36,800.',
            ]);
        }

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-003 — Banda distribución Suzuki Grand Vitara (listo, facturada, sin pago)
        // ═══════════════════════════════════════════════════════════════════
        $wo3 = WorkOrder::updateOrCreate(['number' => 'OT-2026-003'], [
            'customer_id'    => $roberto->id,
            'vehicle_id'     => $vitara->id,
            'employee_id'    => $empMario->id,
            'customer_name'  => $roberto->first_name . ' ' . $roberto->last_name,
            'customer_phone' => $roberto->phone,
            'vehicle_plate'  => $vitara->plate,
            'vehicle_brand'  => $vitara->brand,
            'vehicle_model'  => $vitara->model,
            'vehicle_year'   => $vitara->year,
            'vehicle_color'  => $vitara->color,
            'vehicle_engine' => $vitara->engine_type,
            'service_type'   => 'Motor',
            'status'         => 'listo',
            'problem'        => 'Motor hace ruido de traqueteo al encender en frío. Pérdida leve de potencia.',
            'inspection'     => 'Diagnóstico OBD2: sin códigos de error activos. Inspección visual: banda de distribución con grietas y tensores flojos. Se recomienda cambio preventivo de bomba de agua.',
            'solution'       => 'Cambio de banda de distribución Gates, tensores y rodillo tensor. Bomba de agua en buen estado, no requirió cambio.',
            'subtotal_services' => 70000,
            'subtotal_parts'    => 13000,
            'total'             => 83000,
            'received_at'    => now()->subDays(3),
            'promised_at'    => now()->toDateString(),
        ]);

        if ($wo3->services()->count() === 0) {
            $wo3->services()->create([
                'service_id'   => $svcDiagnostico->id,
                'employee_id'  => $empMario->id,
                'service_name' => $svcDiagnostico->name,
                'description'  => $svcDiagnostico->description,
                'hours'        => 1.0,
                'hourly_rate'  => 10000,
                'subtotal'     => 10000,
            ]);
            $wo3->services()->create([
                'service_id'   => $svcBanda->id,
                'employee_id'  => $empMario->id,
                'service_name' => $svcBanda->name,
                'description'  => $svcBanda->description,
                'hours'        => 4.0,
                'hourly_rate'  => 15000,
                'subtotal'     => 60000,
            ]);
        }

        if ($wo3->parts()->count() === 0) {
            $wo3->parts()->create([
                'inventory_id' => $invBanda->id,
                'part_name'    => $invBanda->name,
                'part_sku'     => $invBanda->sku,
                'quantity'     => 1,
                'unit_price'   => 13000,
                'subtotal'     => 13000,
            ]);
        }

        Invoice::updateOrCreate(['number' => 'FAC-2026-003'], [
            'work_order_id'     => $wo3->id,
            'customer_id'       => $roberto->id,
            'status'            => 'pendiente',
            'subtotal_services' => 70000,
            'subtotal_parts'    => 13000,
            'subtotal'          => 83000,
            'discount_percent'  => 0,
            'discount_amount'   => 0,
            'tax_percent'       => 0,
            'tax_amount'        => 0,
            'total'             => 83000,
            'amount_paid'       => 0,
            'balance'           => 83000,
            'issued_at'         => now(),
        ]);

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-004 — Alineación Kia Sportage (en_progreso, sin factura)
        // ═══════════════════════════════════════════════════════════════════
        $wo4 = WorkOrder::updateOrCreate(['number' => 'OT-2026-004'], [
            'customer_id'    => $ana->id,
            'vehicle_id'     => $sportage->id,
            'employee_id'    => $empAndres->id,
            'customer_name'  => $ana->first_name . ' ' . $ana->last_name,
            'customer_phone' => $ana->phone,
            'vehicle_plate'  => $sportage->plate,
            'vehicle_brand'  => $sportage->brand,
            'vehicle_model'  => $sportage->model,
            'vehicle_year'   => $sportage->year,
            'vehicle_color'  => $sportage->color,
            'vehicle_engine' => $sportage->engine_type,
            'service_type'   => 'Dirección y suspensión',
            'status'         => 'en_progreso',
            'problem'        => 'Vehículo hala hacia la derecha. Volante descentrado. Desgaste irregular en neumáticos.',
            'inspection'     => 'Alineación fuera de especificación del fabricante. Neumáticos delanteros con desgaste en borde interior.',
            'subtotal_services' => 15000,
            'subtotal_parts'    => 0,
            'total'             => 15000,
            'received_at'    => now()->subDay(),
            'promised_at'    => now()->addDay()->toDateString(),
        ]);

        if ($wo4->services()->count() === 0) {
            $wo4->services()->create([
                'service_id'   => $svcAlineacion->id,
                'employee_id'  => $empAndres->id,
                'service_name' => $svcAlineacion->name,
                'description'  => $svcAlineacion->description,
                'hours'        => 1.0,
                'hourly_rate'  => 15000,
                'subtotal'     => 15000,
            ]);
        }

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-005 — Diagnóstico Nissan Frontier (diagnostico)
        // ═══════════════════════════════════════════════════════════════════
        WorkOrder::updateOrCreate(['number' => 'OT-2026-005'], [
            'customer_id'    => $carlos->id,
            'vehicle_id'     => $frontier->id,
            'employee_id'    => $empMario->id,
            'customer_name'  => $carlos->first_name . ' ' . $carlos->last_name,
            'customer_phone' => $carlos->phone,
            'vehicle_plate'  => $frontier->plate,
            'vehicle_brand'  => $frontier->brand,
            'vehicle_model'  => $frontier->model,
            'vehicle_year'   => $frontier->year,
            'vehicle_color'  => $frontier->color,
            'vehicle_engine' => $frontier->engine_type,
            'service_type'   => 'Diagnóstico',
            'status'         => 'diagnostico',
            'problem'        => 'Luz de falla encendida (check engine). Motor pierde potencia en aceleración a partir de 3,000 RPM.',
            'inspection'     => 'Pendiente diagnóstico con escáner OBD2.',
            'subtotal_services' => 0,
            'subtotal_parts'    => 0,
            'total'             => 0,
            'received_at'    => now()->subHours(2),
            'promised_at'    => now()->addDays(2)->toDateString(),
        ]);

        // ═══════════════════════════════════════════════════════════════════
        // OT-2026-006 — AC Hyundai Tucson (recibido, sin técnico asignado)
        // ═══════════════════════════════════════════════════════════════════
        WorkOrder::updateOrCreate(['number' => 'OT-2026-006'], [
            'customer_id'    => $maria->id,
            'vehicle_id'     => $tucson->id,
            'employee_id'    => null,
            'customer_name'  => $maria->first_name . ' ' . $maria->last_name,
            'customer_phone' => $maria->phone,
            'vehicle_plate'  => $tucson->plate,
            'vehicle_brand'  => $tucson->brand,
            'vehicle_model'  => $tucson->model,
            'vehicle_year'   => $tucson->year,
            'vehicle_color'  => $tucson->color,
            'service_type'   => 'Aire acondicionado',
            'status'         => 'recibido',
            'problem'        => 'Aire acondicionado no enfría. Compresor hace ruido raro al activarse.',
            'subtotal_services' => 0,
            'subtotal_parts'    => 0,
            'total'             => 0,
            'received_at'    => now(),
            'promised_at'    => now()->addDays(3)->toDateString(),
        ]);

        // ═══════════════════════════════════════════════════════════════════
        // Ajustar stock por partes usadas en OTs entregadas/en progreso
        // ═══════════════════════════════════════════════════════════════════
        $invAceite->decrement('stock', 4);    // OT-001: 4 litros de aceite
        $invFiltro->decrement('stock', 1);    // OT-001: 1 filtro
        $invPastillas->decrement('stock', 1); // OT-002: 1 juego pastillas
        $invLiquido->decrement('stock', 1);   // OT-002: 1 líquido frenos
        $invBanda->decrement('stock', 1);     // OT-003: 1 banda distribución

        // ═══════════════════════════════════════════════════════════════════
        // Citas / Appointments
        // ═══════════════════════════════════════════════════════════════════
        $citas = [
            [
                'customer_id'    => $juan->id,
                'vehicle_id'     => $corolla->id,
                'employee_id'    => $empCarlos->id,
                'title'          => 'Revisión preventiva — Toyota Corolla',
                'description'    => 'Mantenimiento de rutina. Cliente trae el carro cada 5,000 km.',
                'status'         => 'completada',
                'start_at'       => now()->subDays(10)->setHour(9)->setMinute(0)->setSecond(0),
                'end_at'         => now()->subDays(10)->setHour(10)->setMinute(0)->setSecond(0),
                'color'          => '#22c55e',
                'customer_name'  => $juan->first_name . ' ' . $juan->last_name,
                'customer_phone' => $juan->phone,
                'notes'          => 'Cliente puntual. Prefiere citas en la mañana.',
            ],
            [
                'customer_id'    => $roberto->id,
                'vehicle_id'     => $vitara->id,
                'employee_id'    => $empMario->id,
                'title'          => 'Diagnóstico ruido motor — Suzuki Grand Vitara',
                'description'    => 'Cliente reporta traqueteo al encender en frío.',
                'status'         => 'completada',
                'start_at'       => now()->subDays(3)->setHour(14)->setMinute(0)->setSecond(0),
                'end_at'         => now()->subDays(3)->setHour(15)->setMinute(0)->setSecond(0),
                'color'          => '#22c55e',
                'customer_name'  => $roberto->first_name . ' ' . $roberto->last_name,
                'customer_phone' => $roberto->phone,
            ],
            [
                'customer_id'    => $ana->id,
                'vehicle_id'     => $sportage->id,
                'employee_id'    => $empAndres->id,
                'title'          => 'Alineación — Kia Sportage',
                'description'    => 'Revisar suspensión y realizar alineación. Traer vehículo en ayunas (sin cargar).',
                'status'         => 'confirmada',
                'start_at'       => now()->addDay()->setHour(10)->setMinute(0)->setSecond(0),
                'end_at'         => now()->addDay()->setHour(11)->setMinute(0)->setSecond(0),
                'color'          => '#8b5cf6',
                'customer_name'  => $ana->first_name . ' ' . $ana->last_name,
                'customer_phone' => $ana->phone,
            ],
            [
                'customer_id'    => $carlos->id,
                'vehicle_id'     => $frontier->id,
                'employee_id'    => $empCarlos->id,
                'title'          => 'Cambio de aceite — Nissan Frontier',
                'description'    => 'Mantenimiento preventivo 5,000 km. Aceite diesel 15W-40.',
                'status'         => 'programada',
                'start_at'       => now()->addDays(3)->setHour(8)->setMinute(30)->setSecond(0),
                'end_at'         => now()->addDays(3)->setHour(9)->setMinute(30)->setSecond(0),
                'color'          => '#3b82f6',
                'customer_name'  => $carlos->first_name . ' ' . $carlos->last_name,
                'customer_phone' => $carlos->phone,
            ],
            [
                'customer_id'    => $maria->id,
                'vehicle_id'     => $civic->id,
                'employee_id'    => null,
                'title'          => 'Revisión general pre-viaje — Honda Civic',
                'description'    => 'Revisión completa antes de viaje largo: frenos, aceite, neumáticos, batería.',
                'status'         => 'programada',
                'start_at'       => now()->addDays(6)->setHour(11)->setMinute(0)->setSecond(0),
                'end_at'         => now()->addDays(6)->setHour(13)->setMinute(0)->setSecond(0),
                'color'          => '#3b82f6',
                'customer_name'  => $maria->first_name . ' ' . $maria->last_name,
                'customer_phone' => $maria->phone,
            ],
        ];

        foreach ($citas as $cita) {
            Appointment::updateOrCreate(
                ['title' => $cita['title'], 'start_at' => $cita['start_at']],
                $cita
            );
        }

        $this->command->info('Demo data insertado: 6 OTs, 3 facturas, 2 pagos, 5 citas.');
    }
}
