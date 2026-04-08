# CodeFlow Studio API

Backend serverless para el formulario y el panel privado usando Cloudflare Workers + D1.

## Qué resuelve

- Guardar mensajes del sitio en una base real.
- Login admin con contraseña validada en el backend.
- Listar, marcar como leído, borrar y guardar borradores de respuesta.
- Mantener el frontend en GitHub Pages y mover la lógica sensible fuera del navegador.

## Pasos de despliegue

1. Instala Wrangler y autentícate con Cloudflare.
2. En `backend/wrangler.jsonc`, reemplaza `REPLACE_WITH_D1_DATABASE_ID` por el ID real de tu base D1.
3. Crea los secretos del Worker:
   - `wrangler secret put ADMIN_PASSWORD`
   - `wrangler secret put SESSION_SECRET`
4. Aplica las migraciones remotas de D1 con `npm run db:migrate`.
5. Despliega el Worker con `npm run deploy`.
6. Copia la URL final del Worker y pégala en `site-config.js` como `apiBaseUrl`.

## Deploy automático con GitHub Actions

El repo incluye `.github/workflows/deploy-backend.yml` para que cada `push` a `main` despliegue el backend si cambias algo dentro de `backend/`.

Antes de que funcione, agrega estos secrets al repositorio:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

El workflow:

- aplica las migraciones remotas de D1
- despliega el Worker automáticamente
- se salta solo mientras `backend/wrangler.jsonc` siga con `REPLACE_WITH_D1_DATABASE_ID`

Además, el Worker debe tener ya configurados en Cloudflare estos secrets de runtime:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Puedes cargarlos una sola vez desde el dashboard de Cloudflare o con `wrangler secret put`. Como `backend/wrangler.jsonc` declara `secrets.required`, el deploy fallará si esos valores no existen todavía.

Después del primer deploy, deja la URL del Worker en `site-config.js` para que la web pública y `admin.html` usen la API real.

## Notas

- `ALLOWED_ORIGINS` debe incluir el origen real del frontend.
- Si `apiBaseUrl` queda vacío, el sitio vuelve al modo local del navegador.
- La contraseña del admin no debe quedarse solo en `site-config.js`; el valor real para producción vive en el secret `ADMIN_PASSWORD`.
- Si quieres mantener el mismo acceso en modo fallback y en modo API, usa el mismo valor en `site-config.js` y en el secret `ADMIN_PASSWORD`.
