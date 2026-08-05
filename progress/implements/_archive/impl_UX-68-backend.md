# impl_UX-68-backend — Notificaciones push (PWA): backend

**Feature:** UX-68 — Notificaciones push (PWA) en celular: turnos y retoques del día
**Sandbox:** `apps/server/` (implementer backend)
**Fecha:** 2026-08-04

---

## Archivos creados

- `apps/server/src/models/PushSubscription.ts` — modelo Mongoose `PushSubscription` (interfaz `IPushSubscription`), sin `isActive` (divergencia intencional, ya documentada en `docs/db-schema.md`). Campos: `tenantId`, `adminId`, `endpoint` (unique), `keys.p256dh`, `keys.auth`. Índice compuesto `{ tenantId: 1, adminId: 1 }`.
- `apps/server/src/config/pushConfig.ts` — lee `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` de `process.env`, `console.warn` si falta alguna (no crashea el proceso), mismo patrón que `mailConfig.ts`.
- `apps/server/src/controllers/pushSubscriptionController.ts` — `saveSubscription` (upsert por `endpoint`) y `deleteSubscription` (anti-IDOR: solo borra si `tenantId` + `adminId` coinciden con el request).
- `apps/server/src/routes/pushSubscriptionRoutes.ts` — router con `checkAdminAccess` + `checkTenantAccess` (sin `requireRole`, ver decisión abajo) y validators `express-validator`.
- `apps/server/src/services/pushReminderScheduler.ts` — cron diario `node-cron` (`0 8 * * *`), exporta `runPushReminderCheck` (lógica testeable) y `startPushReminderScheduler`.

## Archivos modificados

- `apps/server/src/server.ts` — import de `pushSubscriptionRoutes`; montado en `app.use('/api/notificaciones/push-subscription', pushSubscriptionRoutes)` **antes** del mount genérico `app.use('/api/notificaciones', ..., requireRole('ADMIN'), notificationSettingsRoutes)`.
- `apps/server/src/index.ts` — import y llamada a `startPushReminderScheduler()` junto a `startReminderScheduler()`.
- `apps/server/.env.example` — agregadas 3 variables placeholder: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (vacías, con comentario de cómo generarlas).
- `apps/server/package.json` — nueva dependency `web-push` (ya aprobada por el usuario) + devDependency `@types/web-push` (el paquete `web-push` no trae tipos propios).

---

## Contrato de API (para el implementer de frontend)

### `POST /api/notificaciones/push-subscription`

Auth: `checkAdminAccess` + `checkTenantAccess` (cualquier rol: ADMIN/PROFESSIONAL/RECEPTIONIST). `tenantId` y `adminId` se resuelven server-side, **nunca** se aceptan del body.

**Request body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BN4Gv...",
    "auth": "tBHI..."
  }
}
```
Validación: `endpoint` string no vacío (no se usa `.isURL()` — algunos push services no son URLs estándar verificables); `keys.p256dh` y `keys.auth` strings no vacíos.

**Response:**
- `201 Created` si es una suscripción nueva, `200 OK` si actualiza una existente (mismo `endpoint`, upsert). Body: el documento `PushSubscription` completo (`_id`, `tenantId`, `adminId`, `endpoint`, `keys`, `createdAt`, `updatedAt`).
- `400 Bad Request` con `{ errors: [...] }` (formato express-validator) si falla la validación.
- `401`/`403` si no autenticado / sin admin válido.

### `DELETE /api/notificaciones/push-subscription`

Auth: igual que arriba.

**Request body:**
```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/..." }
```

**Response:**
- `200 OK` con `{ "message": "Suscripción eliminada correctamente" }` si existía y pertenecía al tenant+admin del request.
- `404 Not Found` con `{ "error": "Suscripción no encontrada" }` si no existe o pertenece a otro tenant/admin (anti-IDOR — nunca 403 para no revelar existencia).
- `400 Bad Request` si `endpoint` falta o está vacío.

### VAPID public key para el frontend

El frontend necesita la VAPID **public key** para `pushManager.subscribe({ applicationServerKey: ... })`. Esta API **no expone un endpoint** para leerla — se distribuye como variable de entorno del cliente (`VITE_VAPID_PUBLIC_KEY`), igual al par generado abajo. El implementer de frontend debe pedirle al usuario humano que cargue `VITE_VAPID_PUBLIC_KEY` en `apps/client/.env` con el mismo valor público que el usuario carga en `apps/server/.env` como `VAPID_PUBLIC_KEY`.

---

## Par de claves VAPID generado (para cargar en `.env` real — NO COMMITEAR)

Generado una sola vez con `webpush.generateVAPIDKeys()` desde `apps/server` (dependencia ya instalada):

```
VAPID_PUBLIC_KEY=BJ5eEYJK9ZuhqstBHNjkZ0tKMusSbu_pI9jMynAxhaF7qHKOoDDgH5Cg7QGopkuYrqp6k9g3qWg8YK8xBelzdQg
VAPID_PRIVATE_KEY=vA2eEO0HSFVnGdGrf_bUdw3MRSxNXVeHNAUIuqrEe4Q
VAPID_SUBJECT=mailto:<reemplazar por un email de contacto real del negocio>
```

**Acción requerida del usuario humano:** cargar estas 3 líneas en `apps/server/.env` (no versionado) y, para el frontend, `VITE_VAPID_PUBLIC_KEY=BJ5eEYJK9ZuhqstBHNjkZ0tKMusSbu_pI9jMynAxhaF7qHKOoDDgH5Cg7QGopkuYrqp6k9g3qWg8YK8xBelzdQg` en `apps/client/.env`. Reemplazar `VAPID_SUBJECT` por un `mailto:` real (requerido por el protocolo, no puede quedar como placeholder en producción).

---

## Decisiones técnicas

1. **Montaje de rutas — router hermano, no anidado.** `/api/notificaciones` ya está montado en `server.ts` con `requireRole('ADMIN')` (config SMTP/negocio, EP-17). Push-subscription debe ser accesible para **cualquier** admin autenticado (un `PROFESSIONAL` o `RECEPTIONIST` también debe poder suscribir su propio celular), así que no puede anidarse dentro de ese router sin heredar el gate de rol. Se montó como router hermano en `app.use('/api/notificaciones/push-subscription', pushSubscriptionRoutes)`, colocado **antes** del mount genérico de `/api/notificaciones` en `server.ts` — Express hace matching de prefijo en orden de registro, así que el path más específico debe declararse primero o el request cae en el router genérico (que además no define esa subruta, resultaría en 404 después de pasar por `requireRole('ADMIN')` innecesariamente). El propio `pushSubscriptionRoutes.ts` aplica `checkAdminAccess` + `checkTenantAccess` a nivel de router (patrón P3/P8), sin `requireRole`.

2. **Upsert por `endpoint`.** `POST` hace `findOne` (para determinar 200 vs 201) + `findOneAndUpdate({ endpoint }, { $set: {...} }, { upsert: true, new: true })`. Cubre el caso de que el mismo navegador/dispositivo se vuelva a suscribir (idempotencia) o cambie de cuenta/tenant en el mismo browser (actualiza `tenantId`/`adminId`).

3. **Horario del cron:** `0 8 * * *` (08:00, hora del proceso servidor) — fijo, no configurable por tenant en esta primera versión.

4. **Día calendario sin `tenant.timezone` (simplificación de alcance deliberada).** El cálculo de "turnos de hoy" y "retoques pendientes" usa el día calendario del **proceso servidor** (`new Date().getFullYear()/getMonth()/getDate()` con horas 0 y 23:59:59), no `tenant.timezone` vía `toLocalDateString` (patrón P10 de `patterns-backend.md`). Esto difiere del patrón canónico de "día calendario del tenant" usado en `appointmentController.ts`/`serviceRecordController.ts`. Se documenta como decisión de alcance razonable para esta primera versión: `reminderScheduler.ts` (el cron de email existente) tampoco varía su cadencia por tenant, solo la ventana de anticipación vía `reminderHoursBefore`; el push diario sigue el mismo criterio de simplicidad. Riesgo aceptado: en la ventana horaria donde el día calendario del proceso (probablemente UTC en producción) difiere del día calendario del tenant (ej. `America/Argentina/Buenos_Aires`, UTC-3), el resumen podría subestimar/sobreestimar turnos/retoques cerca de la medianoche. No bloqueante para un push de resumen diario a las 08:00 AM (fuera de esa ventana de riesgo en la práctica), pero queda anotado para una futura iteración si se requiere precisión por tenant.

5. **Resumen único por tenant, no por evento.** Se cuenta `turnosHoy` (`Appointment.countDocuments`) y `retoquesPendientes` (`ServiceRecord.countDocuments`) una sola vez por tenant; si la suma es `> 0`, se envía **un solo** push por cada `PushSubscription` del tenant (no un push por turno/retoque), evitando spam. Mismo mensaje para todos los admins/dispositivos del tenant (no personalizado por admin en esta versión).

6. **Limpieza de suscripciones caducadas.** Si `webpush.sendNotification` lanza un error con `statusCode` 410 o 404, se borra esa `PushSubscription` (`deleteOne`). Otros errores: `console.error` + continúa con la siguiente suscripción (no frena el loop, mismo patrón defensivo que `reminderScheduler.ts`). El loop de tenants también está envuelto en su propio `try/catch` por tenant, para que un error en un tenant no aborte el procesamiento del resto.

7. **Guard de configuración VAPID.** Si `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` no están configuradas, `runPushReminderCheck` hace `console.warn` y retorna temprano sin intentar enviar nada (no crashea el proceso, mismo criterio que `mailConfig.ts`).

8. **Dependencias instaladas (ya aprobadas):** `web-push@3.6.7` (dependency) y `@types/web-push` (devDependency — el paquete no trae tipos propios, mismo patrón que `@types/node-cron`/`@types/nodemailer`).

---

## Resultado build/tests

```
pnpm --filter @estetica/server build
```
Exit code 0, sin errores de TypeScript.

```
pnpm --filter @estetica/server test
```
`Test Files  1 failed | 2 passed (3)` — `Tests  4 failed | 31 passed (35)`. Los 4 fallos son los **preexistentes documentados** en `src/__tests__/tenantIsolation.test.ts` (falta `professional` en el body de los tests de `POST /api/registros`, no relacionado con este cambio). No se introdujeron fallos nuevos.

---

## Pendiente para el implementer de frontend

- `apps/client/public/manifest.json` + ícono(s), `apps/client/public/sw.js` (listener `push` → `showNotification`), registro condicional del Service Worker, UI de opt-in (`Notification.requestPermission()` → `pushManager.subscribe(...)`), consumo de `POST`/`DELETE /api/notificaciones/push-subscription` vía `src/api/`, y `VITE_VAPID_PUBLIC_KEY` como env var del cliente.
- Comunicar al usuario la limitación de iOS Safari (push solo funciona si la PWA está "agregada a pantalla de inicio", no en pestaña de navegador normal — ya documentado en `progress/explores/explore_UX-68.md`).
