# Prueba en DreamHost (shared hosting)

Guía para una prueba/trial del sistema en un plan compartido de DreamHost.
**No es la ruta recomendada para producción final** (ver `DEPLOY.md` para eso,
con VPS) — esto es para validar que el despliegue completo funciona, barato.

Diferencia clave respecto al VPS: sin procesos persistentes, así que
`QUEUE_CONNECTION=sync` en vez de `database` (el job de recordatorios corre
directo dentro del cron, sin necesitar un worker aparte).

## 1. Cuenta y dominio

1. Crea la cuenta / plan compartido en DreamHost y agrega tu dominio (o usa un subdominio tipo `taller.tudominio.com` para la prueba).
2. **Panel → Users → Manage Users**: activa **shell/SSH access** para tu usuario (no viene activado por defecto).
3. **Panel → Websites → Manage Websites**: en tu dominio, activa **SSL** (Let's Encrypt gratis, un clic).

## 2. Base de datos

1. **Panel → Databases → MySQL Databases**: crea una base de datos nueva y un usuario, anota host/nombre/usuario/contraseña — los vas a necesitar para el `.env`.

## 3. Configurar el "web directory" del dominio (paso crítico)

Laravel necesita que el servidor sirva `public/`, **no** la raíz del proyecto:

1. **Panel → Websites → Manage Websites → Edit** en tu dominio.
2. Cambia el **"Web directory"** para que apunte a `taller-backend/public` (vas a subir el proyecto completo por fuera de esa carpeta pública; solo `public/` queda expuesto al navegador).

## 4. Subir el código

Por SSH (una vez tengas el acceso activado):

```bash
ssh tu_usuario@tu_dominio.com
cd ~
git clone <tu-repositorio> taller
cd taller/taller-backend
```

(Si no usas git, sube los archivos por SFTP a la misma ruta.)

## 5. PHP y dependencias

1. **Panel → Websites → Manage Websites → Edit**: selecciona **PHP 8.1 o superior** para el dominio.
2. Verifica que estén habilitadas las extensiones `gd`, `pdo_mysql`, `mbstring` (en la misma sección de configuración de PHP del panel).
3. Por SSH:

```bash
cd ~/taller/taller-backend
composer install --optimize-autoloader --no-dev
```

## 6. Variables de entorno

```bash
cp .env.production.example .env
nano .env
```

Rellena:
- `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://tu-dominio.com`
- `DB_*` con los datos de la sección 2
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (tu usuario admin real)
- **`QUEUE_CONNECTION=sync`** ← distinto al `.env.production.example` original, es el único cambio obligatorio por ser shared hosting

```bash
php artisan key:generate
```

## 7. Base de datos y storage

```bash
php artisan migrate --force
php artisan db:seed --force        # solo crea el admin, seguro en producción
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 8. Cron (recordatorios de citas)

**Panel → Advanced → Cron Jobs → Add New Cron Job**:

- Comando:
  ```
  cd /home/tu_usuario/taller/taller-backend && php artisan schedule:run >> /dev/null 2>&1
  ```
- Frecuencia: cada minuto (`* * * * *`, DreamHost lo deja elegir por menú)

## 9. Frontend

En tu máquina local (no en DreamHost):

```bash
cd taller-frontend
cp .env.production.example .env.production
# Editar VITE_API_URL si el frontend va en dominio/subdominio distinto al backend
npm install
npm run build
```

Sube el contenido de `taller-frontend/dist/` por SFTP a un directorio servido
por el mismo dominio (fuera de `taller-backend/`), o a un subdominio aparte
apuntando ahí — ajusta `VITE_API_URL` según cuál elijas antes de compilar.

## 10. Verificación final

1. Entra a `https://tu-dominio.com` — deberías ver el login.
2. Inicia sesión con el `ADMIN_EMAIL`/`ADMIN_PASSWORD` del `.env` y **cambia la contraseña** desde el sistema.
3. Ve a **Configuración** y llena los datos reales del taller y del CAI (o déjalo con datos de prueba si esto es solo un trial, no producción real).
4. Prueba generar una cotización, una OT y una factura de prueba para confirmar que los PDFs se generan bien (usa `gd` — si falla, revisa el paso 5.2).
