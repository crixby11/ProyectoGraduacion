# Despliegue a producción — Taller Automotriz Hermanos Juárez

Runbook para llevar el sistema a un servidor real. Arquitectura recomendada:
**un solo dominio** sirviendo el frontend (React build estático) y la API de
Laravel bajo `/api/v1` — evita configurar CORS por completo.

## 1. Requisitos del servidor

- PHP 8.1+ con extensiones: `mbstring`, `pdo_mysql`, `bcmath`, `gd` (PDFs), `xml`, `ctype`, `tokenizer`, `openssl`, `curl`
- MySQL 8 / MariaDB
- Nginx o Apache
- Composer 2
- Node.js 18+ (solo para compilar el frontend, no hace falta en el servidor tras el build)
- Certificado SSL (Let's Encrypt / Certbot)

## 2. Backend

```bash
cd taller-backend
composer install --optimize-autoloader --no-dev
cp .env.production.example .env
# Rellenar .env: APP_KEY, DB_*, ADMIN_EMAIL, ADMIN_PASSWORD, APP_URL
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force        # solo crea el usuario admin — seguro en producción
php artisan storage:link           # necesario para servir PDFs y archivos adjuntos
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Apunta el document root del servidor web a `taller-backend/public`.

### Cron (obligatorio)

El sistema ya tiene programado el envío de recordatorios de citas
(`app/Console/Kernel.php`, todos los días 10am). Sin esto, esa tarea nunca corre:

```
* * * * * cd /ruta/a/taller-backend && php artisan schedule:run >> /dev/null 2>&1
```

### Worker de colas (obligatorio)

`QUEUE_CONNECTION=database` — los recordatorios se encolan en la tabla `jobs`
y necesitan un worker corriendo, si no se quedan encolados sin enviarse nunca:

```bash
php artisan queue:work --daemon --tries=3
```

Configúralo con Supervisor o systemd para que se reinicie solo si se cae.

> Si no vas a usar WhatsApp automatizado (Twilio) para recordatorios de citas,
> el worker igual debe correr — sin `TWILIO_SID`/`TWILIO_TOKEN` el job simplemente
> no logra enviar y el recordatorio queda pendiente (no falla, no bloquea nada).

## 3. Frontend

```bash
cd taller-frontend
cp .env.production.example .env.production
npm install
npm run build
```

Sirve el contenido de `taller-frontend/dist/` como estático en la raíz del
dominio (Nginx/Apache), con el proxy de `/api/v1` apuntando al backend Laravel.

## 4. Después de desplegar — antes de facturar de verdad

1. Inicia sesión con el `ADMIN_EMAIL`/`ADMIN_PASSWORD` que configuraste y
   **cambia la contraseña** desde el sistema.
2. Ve a **Configuración** y llena los datos reales del taller: nombre, RTN,
   dirección, teléfono, logo.
3. En **Configuración → Facturación (CAI)**: CAI real, rango autorizado real,
   fecha límite de emisión real, y el **próximo correlativo correcto** según
   el talonario físico que estás reemplazando — si esto queda mal, las
   facturas reales van a fallar o van a repetir/saltar números.
4. Revisa que no quede ningún dato de prueba (clientes, vehículos, OTs
   ficticias) — con los seeders ya corregidos, una instalación nueva en
   producción no trae nada de eso por defecto.

## 5. Backups

- Base de datos: backup automático diario como mínimo (es el sistema de
  facturación real del negocio).
- `storage/app/public`: PDFs y archivos adjuntos (empleados, proveedores,
  órdenes de compra).
