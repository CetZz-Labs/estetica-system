# Explore Digest — UX-68 (Notificaciones push PWA: turnos y retoques)

**Fecha:** 2026-08-04 · **Autor:** leader (investigación de factibilidad, sin subagente explorer)

## Hallazgo principal: no hay infraestructura PWA en el repo

- `apps/client` es una SPA Vite estándar (`vite.config.ts` sin `vite-plugin-pwa` ni plugin equivalente).
- No existe `manifest.json`, `sw.js`, ni ningún registro de `navigator.serviceWorker` en todo `apps/client`.
- `apps/client/index.html` no enlaza ningún manifest.
- Esto es trabajo greenfield, no una extensión de algo existente.

## Infraestructura de notificaciones existente (NO tocar, es un canal distinto)

- `GOV-NOTIFY` (`docs/governance-rules.md` líneas 117-131): recordatorios por **email** (nodemailer) a los **clientes del salón** (no al admin), vía `reminderScheduler.ts` (`node-cron`, cada 15 min) + `mailService.ts`. SMTP centralizado por variables de entorno (`process.env.SMTP_*`), config en `mailConfig.ts`.
- Este pedido (UX-68) es un canal nuevo y separado: **push al navegador/celular del admin logueado** (no email, no al cliente del salón).

## Viabilidad técnica (Web Push API estándar)

- Soportado nativamente en Chrome/Edge/Firefox (desktop y Android) sin instalar la PWA.
- **iOS Safari**: soportado desde 16.4+ pero **solo si la PWA fue agregada a la pantalla de inicio** (instalada) — si el usuario solo la tiene abierta en el navegador, no recibe push. Limitación de plataforma, no de la implementación — comunicar al usuario.
- No requiere backend de terceros (Firebase, OneSignal, etc.) — el protocolo VAPID + Push API cubre el caso de uso sin dependencias externas de pago.

## Piezas a construir (todas nuevas)

1. **Frontend (sin dependencias nuevas — APIs nativas del navegador):**
   - `apps/client/public/manifest.json` + ícono(s) para instalabilidad.
   - `apps/client/public/sw.js`: listener de evento `push` → `self.registration.showNotification(...)`.
   - Registro del Service Worker condicionado a `'serviceWorker' in navigator`.
   - UI de opt-in explícito (acción del usuario, no autopedido) que llama `Notification.requestPermission()` → si concedido, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID public key> })`.
   - `VITE_VAPID_PUBLIC_KEY` como env var del cliente (GOV-CLIENT: nunca hardcodear).

2. **Backend:**
   - **Dependencia nueva bloqueada:** `web-push` (npm) implementa el protocolo VAPID de firma/envío. No está en `apps/server/package.json` hoy. Regla dura `.claude/rules/backend.md` §1 prohíbe instalar sin aprobación explícita del usuario humano — **blocker real, no delegable a un implementer**.
   - VAPID keypair (se genera una vez, ej. `web-push generate-vapid-keys`) → `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en `.env` (GOV-ENV, nunca en Mongo).
   - Modelo nuevo `PushSubscription` (tenantId, adminId, endpoint, keys.p256dh, keys.auth, timestamps) — **leer `docs/db-schema.md` antes de crearlo** (backend.md §8) y documentarlo ahí primero.
   - Endpoint `POST /api/notificaciones/push-subscription` (guardar) + `DELETE` (desuscribir), autenticado + tenant-scoped, whitelist estricta.
   - Cron diario nuevo (reusar `node-cron`, ya es dependencia existente) — NO extender `reminderScheduler.ts` (es email-específico y su cadencia de 15 min no aplica a un resumen diario); crear un servicio separado, ej. `pushReminderScheduler.ts`, corriendo una vez por día a una hora fija (considerar timezone por tenant, mismo patrón que `Tenant.timezone` ya usado en `serviceRecordController.ts`).
   - Lógica del cron: por tenant activo, por cada admin con suscripción activa, contar turnos de hoy (`Appointment`, status pending/confirmed) + retoques pendientes (`ServiceRecord`, touchupStatus:'pending', nextTouchupDate <= hoy) → si total > 0, un único push resumen (evitar spamear un push por evento).
   - Limpieza: suscripciones que devuelven 410/404 al enviar se borran (suscripción caducada del navegador).

## Bloqueo activo

Esta feature no puede pasar a `in_progress` hasta que el usuario apruebe explícitamente agregar `web-push` a `apps/server`. Ver pregunta pendiente en `progress/current.md`.
