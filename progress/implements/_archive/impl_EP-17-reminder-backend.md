# impl_EP-17-reminder-backend.md

## Feature
EP-17 — Recordatorio de turno por mail (Fase 4) — **Stack 3: Servicio de mail + cron scheduler**

## Alcance de este stack
Última pieza de EP-17: el envío efectivo del mail de recordatorio (`nodemailer`) y el job interno (`node-cron`) que detecta turnos próximos e idempotentemente marca el envío. Stacks previos (1: `Client.email`; 2: `Tenant.notificationSettings` + endpoints `/api/notificaciones`) ya fueron aprobados por el reviewer (`progress/reviews/review_EP-17-stack1-2.md`).

## Dependencias instaladas (aprobadas explícitamente por el usuario)
```
pnpm --filter @estetica/server add nodemailer node-cron
pnpm --filter @estetica/server add -D @types/nodemailer @types/node-cron
```
Resultado en `apps/server/package.json`:
- `dependencies`: `node-cron@4.5.0`, `nodemailer@9.0.3`
- `devDependencies`: `@types/node-cron@3.0.11`, `@types/nodemailer@8.0.1`

## Archivos modificados/creados

### 1. `apps/server/src/models/Appointment.ts` (modificado)
- `IAppointment.reminderSent: boolean` + campo de schema `reminderSent: { type: Boolean, default: false }`.
- Nuevo índice compuesto: `AppointmentSchema.index({ tenantId: 1, status: 1, reminderSent: 1, startTime: 1 })` — cubre la query del cron sin table scan.

### 2. `apps/server/src/services/mailService.ts` (nuevo)
- `sendAppointmentReminder(tenant: ITenant, appointment: ReminderAppointment): Promise<void>`.
- Lanza error descriptivo si falta `smtpHost`/`smtpUser`/`smtpPasswordEncrypted` en `tenant.notificationSettings` (el caller decide cómo manejarlo — no hace `process.exit`).
- Desencripta la contraseña con `decryptSecret()` de `utils/crypto.ts` (ya existente de Stack 2).
- Transporter `nodemailer.createTransport({ host, port, secure: smtpSecure ?? false, auth: { user, pass } })`.
- `from` = `"${fromName || tenant.name}" <${fromEmail || smtpUser}>`, `subject` = `"Recordatorio de tu turno en ${tenant.name}"`.
- Cuerpo texto plano + HTML: nombre completo del cliente, `service?.name ?? 'tu turno'`, fecha/hora formateada con `Intl.DateTimeFormat('es-AR', { timeZone: tenant.timezone, dateStyle: 'full', timeStyle: 'short' })`, y vía de contacto (`fromEmail`/`smtpUser` + nombre del negocio).
- Los errores de `sendMail` propagan sin capturar (el caller — el scheduler — los captura por turno).

### 3. `apps/server/src/services/reminderScheduler.ts` (nuevo)
- `runReminderCheck(): Promise<void>` — lógica de negocio testeable/invocable independientemente del cron:
  1. `Tenant.find({ isActive: true, 'notificationSettings.smtpHost/smtpUser/smtpPasswordEncrypted': { $exists: true, $ne: '' } })`.
  2. Por tenant: ventana `[now, now + (reminderHoursBefore ?? 24)h]`.
  3. `Appointment.find({ tenantId, isActive: true, status: { $in: ['pending','confirmed'] }, reminderSent: false, startTime: { $gte, $lte } }).populate('client', 'firstName lastName email').populate('service', 'name')`.
  4. Turno sin `client.email` → `continue` sin marcar `reminderSent` (GOV-NOTIFY mandato 5, omisión silenciosa reintentable).
  5. `try/catch` individual por turno alrededor de `sendAppointmentReminder`; en catch, `console.error` con `tenantId` + `appointmentId` de contexto y sigue con el siguiente turno (un SMTP caído no frena el batch).
  6. Envío exitoso → `appointment.reminderSent = true; await appointment.save();`.
  7. Iteración secuencial (`for...of`), sin paralelismo agresivo — prioriza legibilidad a escala de CRM chico.
  - Nota documentada en el código: esta función itera tenants por diseño (job interno, no request de usuario), por eso no aplica la regla de "todo query filtra por `req.tenantId` de un usuario autenticado".
- `startReminderScheduler(): void` — registra `cron.schedule('*/15 * * * *', () => { runReminderCheck().catch(err => console.error('Error en reminderScheduler:', err)); })` y loguea `'Reminder scheduler iniciado (cada 15 min)'` al arrancar.

### 4. `apps/server/src/index.ts` (modificado)
- Import de `startReminderScheduler` desde `./services/reminderScheduler`.
- Llamado dentro del callback de `server.listen(...)`, **no** en `server.ts` (evita que el cron arranque durante tests con supertest, que importan `server.ts` directamente).

### 5. `docs/db-schema.md` (modificado, documentación canónica)
- Fila `reminderSent` agregada a la tabla de `appointments`.
- Nuevo índice compuesto documentado en la tabla de índices de `appointments` y en el "Resumen de Índices" global.
- Nota de regla de negocio explicando el flujo del cron y enlace a `governance-rules.md#gov-notify`.
- Justificación: `db-schema.md` es "documentación canónica inmutable" con mandato explícito de actualizarse "en el mismo commit" que evoluciona el schema — no se alteró ningún otro documento fuera de ese contrato.

## Verificación de build
```
pnpm --filter @estetica/server build
```
Exit Code: **0** (dos corridas: una tras crear los servicios, otra final tras wiring en `index.ts`). Sin errores de TypeScript.

## Decisiones técnicas / notas para el reviewer
- `cron.schedule` se importa como `import cron from 'node-cron'` (default import sintetizado vía `esModuleInterop`, ya activo en `tsconfig.json`) — el paquete solo declara exports nombrados (`schedule`, `validate`, `getTasks`), pero TS lo resuelve correctamente como default por interop de CJS. Compiló sin error.
- El resultado de `.populate('client', ...).populate('service', ...)` se castea explícitamente a una interfaz local `PopulatedReminderAppointment` en `reminderScheduler.ts`, porque el tipo estático de `IAppointment.client`/`service` sigue siendo `Types.ObjectId` (Mongoose no infiere el tipo poblado automáticamente). Es un patrón local, no se promovió al catálogo por ser un caso puntual (un solo lugar del código lo usa).
- No se tocó `apps/server/src/server.ts` — el cron se arranca únicamente desde `index.ts`, cumpliendo el mandato de no arrancarlo durante los tests con supertest.
- No se agregaron tests automatizados para `runReminderCheck`/`sendAppointmentReminder` en este stack — no estaba en el alcance de la tarea entregada; queda a criterio del reviewer/leader si se requiere cobertura antes de marcar EP-17 completo como `"done"`.
- El campo `_id` de `ITenant`/`PopulatedReminderAppointment` se interpola en `console.error`/mensajes de error vía template string (Mongoose `ObjectId` tiene `toString()` implícito) — sin `any` explícito.

## Estado
Feature `EP-17` sigue en `"in_progress"` en `feature_list.json` (sin cambios de estado — corresponde al reviewer/leader cerrar el ciclo tras auditar los 3 stacks). No se marcó `"done"`.
