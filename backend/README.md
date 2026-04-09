# CodeFlow Studio API

Backend serverless para el formulario y el panel privado usando Cloudflare Workers + D1.

## Qué resuelve

- Guardar mensajes del sitio en una base real.
- Login admin con contraseña validada en el backend.
- Listar leads, cambiar estados comerciales, ver historial, guardar notas internas, definir proximos pasos, borrar y guardar borradores de respuesta.
- Mantener el frontend en GitHub Pages y mover la lógica sensible fuera del navegador.
- Preparar notificaciones automáticas por webhook, WhatsApp o email API.

## Pasos de despliegue

1. Instala Wrangler y autentícate con Cloudflare.
2. En `backend/wrangler.jsonc`, deja configurado el `database_id` real de tu base D1.
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
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

El workflow:

- aplica las migraciones remotas de D1
- despliega el Worker automáticamente
- requiere que `backend/wrangler.jsonc` tenga un `database_id` real configurado
- sincroniza `ADMIN_PASSWORD` y `SESSION_SECRET` desde GitHub Secrets al Worker durante el deploy

Después del primer deploy, deja la URL del Worker en `site-config.js` para que la web pública y `admin.html` usen la API real.

## Notas

- `ALLOWED_ORIGINS` debe incluir el origen real del frontend.
- Si `apiBaseUrl` queda vacío, el sitio vuelve al modo local del navegador.
- La contraseña del admin no debe quedarse solo en `site-config.js`; el valor real para producción vive en el secret `ADMIN_PASSWORD`.
- Si quieres mantener el mismo acceso en modo fallback y en modo API, usa el mismo valor en `site-config.js` y en el secret `ADMIN_PASSWORD`.
- El CRM crea una columna `status` en `messages`, una tabla `message_status_history` para guardar el pipeline del lead y campos `internal_notes` / `next_step` para seguimiento comercial.
- Las notificaciones automáticas se activan configurando alguno de estos valores en el Worker:
  - `NOTIFY_WEBHOOK_URL`
  - `NOTIFY_WHATSAPP_WEBHOOK_URL`
  - `NOTIFY_WHATSAPP_TO`
  - `TWILIO_WHATSAPP_FROM`
  - `NOTIFY_EMAIL_FROM`
  - `NOTIFY_EMAIL_TO`
  - secret `RESEND_API_KEY`
- Si eliges Twilio para WhatsApp, además necesitas los secrets `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`.
- Si no configuras esos valores, el panel sigue funcionando normal y solo muestra los canales como listos para activar.
