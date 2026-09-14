<?php

use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EmployeeBonusController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\EmployeeFileController;
use App\Http\Controllers\Api\V1\EmployeeStatsController;
use App\Http\Controllers\Api\V1\GeneralFileController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Http\Controllers\Api\V1\PurchaseOrderFileController;
use App\Http\Controllers\Api\V1\QuoteController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\VehicleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\SupplierPaymentController;
use App\Http\Controllers\Api\V1\WorkOrderController;
use Illuminate\Support\Facades\Route;

// Rutas públicas
Route::prefix('v1')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
});

// Rutas protegidas con Sanctum
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Reportes
    Route::get('reports/performance', [ReportController::class, 'performance']);

    // Clientes
    Route::apiResource('customers', CustomerController::class);

    // Vehículos
    Route::apiResource('vehicles', VehicleController::class);

    // Empleados — rutas estáticas ANTES del apiResource para evitar conflicto con {employee}
    Route::get('employees/stats', [EmployeeStatsController::class, 'index']);
    Route::apiResource('employees', EmployeeController::class);
    Route::post('employees/{employee}/weekly-reminder', [EmployeeController::class, 'sendWeeklyReminder']);
    Route::post('employees/{employee}/bonuses', [EmployeeBonusController::class, 'store']);
    Route::put('employees/{employee}/bonuses/{bonus}', [EmployeeBonusController::class, 'update']);
    Route::get('employees/{employee}/stats', [EmployeeStatsController::class, 'show']);
    Route::get('employees/{employee}/files', [EmployeeFileController::class, 'index']);
    Route::post('employees/{employee}/files', [EmployeeFileController::class, 'store']);
    Route::get('employees/{employee}/files/{file}/download', [EmployeeFileController::class, 'download']);
    Route::delete('employees/{employee}/files/{file}', [EmployeeFileController::class, 'destroy']);

    // Catálogo de servicios
    Route::apiResource('services', ServiceController::class);

    // Cotizaciones
    Route::apiResource('quotes', QuoteController::class);
    Route::post('quotes/{quote}/services', [QuoteController::class, 'addService']);
    Route::put('quotes/{quote}/services/{quoteServiceId}', [QuoteController::class, 'updateService']);
    Route::delete('quotes/{quote}/services/{quoteServiceId}', [QuoteController::class, 'removeService']);
    Route::post('quotes/{quote}/parts', [QuoteController::class, 'addPart']);
    Route::put('quotes/{quote}/parts/{quotePartId}', [QuoteController::class, 'updatePart']);
    Route::delete('quotes/{quote}/parts/{quotePartId}', [QuoteController::class, 'removePart']);
    Route::patch('quotes/{quote}/status', [QuoteController::class, 'changeStatus']);
    Route::get('quotes/{quote}/pdf', [QuoteController::class, 'pdf']);
    Route::get('quotes/{quote}/whatsapp', [QuoteController::class, 'whatsappLink']);

    // Proveedores
    Route::apiResource('suppliers', SupplierController::class);
    Route::post('supplier-purchases/{supplierPurchase}/payments', [SupplierPaymentController::class, 'store']);

    // Órdenes de compra — inmutables una vez creadas, solo cambian de estado (recibir/cancelar)
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->except(['update']);
    Route::post('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
    Route::patch('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel']);
    Route::get('purchase-orders/{purchaseOrder}/files', [PurchaseOrderFileController::class, 'index']);
    Route::post('purchase-orders/{purchaseOrder}/files', [PurchaseOrderFileController::class, 'store']);
    Route::get('purchase-orders/{purchaseOrder}/files/{file}/download', [PurchaseOrderFileController::class, 'download']);
    Route::delete('purchase-orders/{purchaseOrder}/files/{file}', [PurchaseOrderFileController::class, 'destroy']);

    // Inventario
    Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('inventory/categories', [InventoryController::class, 'categories']);
    Route::apiResource('inventory', InventoryController::class);
    Route::post('inventory/{inventory}/adjust', [InventoryController::class, 'adjust']);
    Route::get('inventory/{inventory}/movements', [InventoryController::class, 'movements']);

    // Órdenes de trabajo
    Route::apiResource('work-orders', WorkOrderController::class);
    Route::post('work-orders/{workOrder}/services', [WorkOrderController::class, 'addService']);
    Route::put('work-orders/{workOrder}/services/{woServiceId}', [WorkOrderController::class, 'updateService']);
    Route::delete('work-orders/{workOrder}/services/{woServiceId}', [WorkOrderController::class, 'removeService']);
    Route::post('work-orders/{workOrder}/parts', [WorkOrderController::class, 'addPart']);
    Route::put('work-orders/{workOrder}/parts/{woPartId}', [WorkOrderController::class, 'updatePart']);
    Route::delete('work-orders/{workOrder}/parts/{woPartId}', [WorkOrderController::class, 'removePart']);
    Route::patch('work-orders/{workOrder}/status', [WorkOrderController::class, 'changeStatus']);
    Route::get('work-orders/{workOrder}/pdf', [WorkOrderController::class, 'pdf']);
    Route::get('work-orders/{workOrder}/notes', [WorkOrderController::class, 'notes']);
    Route::post('work-orders/{workOrder}/notes', [WorkOrderController::class, 'addNote']);

    // Facturación
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('invoices/generate/{workOrder}', [InvoiceController::class, 'generate']);
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    Route::get('invoices/{invoice}/whatsapp', [InvoiceController::class, 'whatsappLink']);

    // Pagos
    Route::apiResource('payments', PaymentController::class)->except(['update']);

    // Citas / Calendario
    Route::apiResource('appointments', AppointmentController::class);
    Route::post('appointments/{appointment}/reminder', [AppointmentController::class, 'sendReminder']);

    // Configuración del taller
    Route::get('settings', [SettingController::class, 'index']);
    Route::put('settings', [SettingController::class, 'update']);

    // Archivos generales
    Route::get('general-files', [GeneralFileController::class, 'index']);
    Route::post('general-files', [GeneralFileController::class, 'store']);
    Route::get('general-files/{generalFile}/download', [GeneralFileController::class, 'download']);
    Route::delete('general-files/{generalFile}', [GeneralFileController::class, 'destroy']);

    // Auditoría / historial de actividad
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    Route::get('activity-logs/log-names', [ActivityLogController::class, 'logNames']);
});
