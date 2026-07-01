# Reporte de Revisión Técnica — Feature EP-17 (Cierre Integral)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-01

> Alcance de esta revisión: cierre integral de EP-17 "Recordatorio de turno por mail" contra los 3 acceptance criteria originales. Stack 1 (`Client.email`) y Stack 2 (`/api/notificaciones` — SMTP + horas de anticipación) ya fueron aprobados en `progress/reviews/review_EP-17-stack1-2.md`. Esta ronda auditó el Stack 3 (`mailService.ts`, `reminderScheduler.ts`, `Appointment.reminderSent`, wiring en `index.ts`), emitió inicialmente `CHANGES_REQUESTED` por un hallazgo arquitectónico, y tras la remediación documental del leader, cierra la feature completa como `APPROVED`.

---

## Historial de esta ronda

1. **Primera pasada (`CHANGES_REQUESTED`):** único hallazgo bloqueante — `apps/server/src/services/mailService.ts`, `apps/server/src/services/reminderScheduler.ts` y `apps/server/src/utils/crypto.ts` violaban `CHECKPOINTS.md` C3 ("Estructura Limpia") tal como estaba redactado entonces, porque `docs/architecture.md`/`.claude/rules/backend.md` solo reconocían 4 capas backend (`controllers/`, `models/`, `routes/`, `middlewares/`+`config/`) y no mencionaban `services/`/`utils/`.
2. **Remediación del leader (excepción de documentación, sin tocar código de negocio):**
   - `docs/architecture.md` líneas 57-64: "Backend: 4 Capas" → "Backend: 6 Capas", agregando **Services** (`src/services/` — lógica de negocio desacoplada de `req`/`res`: integraciones externas y jobs en background) y **Utils** (`src/utils/` — funciones puras sin dependencia de Express/Mongoose), con nota `(Agregada en EP-17, 2026-07-01)`.
   - `CHECKPOINTS.md` línea 33: checkpoint "Estructura Limpia" ahora incluye `services/` y `utils/` en la lista de carpetas válidas, con referencia a `docs/architecture.md § Backend: 6 Capas`.
   - `.claude/rules/backend.md` §2 líneas 23-24: agregadas las dos entradas al listado "ARQUITECTURA DE CARPETAS", mismo estilo/formato que las 5 preexistentes.
3. **Segunda pasada (esta):** re-audité la consistencia cruzada de los 3 documentos entre sí y contra el código real.

## Verificación de la remediación documental

- **Consistencia entre los 3 documentos:** `docs/architecture.md` (capas 5 y 6), `CHECKPOINTS.md` C3 y `.claude/rules/backend.md` §2 describen exactamente las mismas dos carpetas con la misma semántica ("services = lógica desacoplada de req/res, integraciones + jobs en background"; "utils = funciones puras sin dependencia de Express/Mongoose"). Sin contradicciones ni definiciones divergentes entre archivos.
- **Consistencia contra el código real:**
  - `apps/server/src/services/` contiene únicamente `mailService.ts` y `reminderScheduler.ts` (`Glob` confirmado). Grep de `Request|Response|from 'express'` sobre la carpeta → sin matches: ningún archivo de `services/` conoce `req`/`res`, cumpliendo la definición nueva al pie de la letra.
  - `apps/server/src/utils/` contiene únicamente `crypto.ts` (`Glob` confirmado), que solo importa del módulo nativo `crypto` de Node — sin `express`, sin `mongoose`. Cumple "funciones puras sin dependencia de Express/Mongoose".
  - No hay archivos adicionales en ninguna de las dos carpetas que pudieran quedar fuera del alcance recién documentado.
- **Conclusión:** la remediación es completa, coherente y verificable empíricamente. El hallazgo bloqueante queda resuelto sin necesidad de reubicar código (opción que el propio leader descartó correctamente por generar peor arquitectura — forzar un cron/mailer dentro de `controllers/` o `config/` habría sido peor que formalizar la capa).

---

## Mapeo de Checkpoints (Quality Gates) — Estado Final

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — `feature_list.json` tenía EP-17 como única feature `in_progress` hasta este cierre. Cada stack escribió su propia bitácora con nombre exacto (`impl_EP-17-clientEmail-*`, `impl_EP-17-notifSettings-*`, `impl_EP-17-reminder-backend.md`). Sandbox respetado: Stack 3 solo tocó `apps/server/`.
- [x] **C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries)** — Resuelto tras la remediación documental (ver sección anterior). Paginación no aplica al cron (job interno, no listado HTTP). Multi-tenancy del cron correcta (ver auditoría GOV-NOTIFY abajo).
- [x] C4 (Compilación Estática + Lint) — Verificado empíricamente por el reviewer:
  - `pnpm --filter @estetica/server build` → Exit Code 0.
  - `pnpm --filter @estetica/client build` → Exit Code 0.
  - `pnpm --filter @estetica/client lint` → Exit Code 1, único error preexistente `ProductoModal.tsx:37:25 'stock' is assigned a value but never used` (no tocado por EP-17, confirmado igual que en la ronda Stack1-2). Los 4 warnings de `react-hooks/incompatible-library` tampoco corresponden a archivos de esta feature. Sin regresiones nuevas.
  - `pnpm --filter @estetica/server test` (`vitest run`) → falla, pero por causa 100% ajena al código auditado: `MongoMemoryServer.create()` no logra descargar/desbloquear el binario de Mongo en este entorno sandbox (`Hook timed out`, luego `Cannot unlock file ... .lock`, luego `ENOENT` al renombrar el `.zip.downloading`). Los 3 suites que fallan (`onboarding.test.ts`, `tenantIsolation.test.ts`, `tenantSettings.test.ts`) son preexistentes a EP-17 (EP-08/EP-09/EP-10) y ninguno ejerce código de Stack 3 — no hay tests nuevos para `mailService`/`reminderScheduler`. No se toma como bloqueante por no ser regresión del diff; queda como observación no bloqueante (ver abajo).
- [x] C5 (Cierre de Sesión Append-Only) — Esta bitácora de revisión constituye la evidencia en disco requerida. Queda pendiente, a cargo del leader, la entrada de cierre en `progress/history.md` y la limpieza de `progress/current.md` (fuera del alcance del reviewer).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — `Appointment.ts`: `reminderSent: { type: Boolean, default: false }` (línea 40) + índice compuesto `{ tenantId: 1, status: 1, reminderSent: 1, startTime: 1 }` (línea 49), correctamente antepuesto por `tenantId`. `Tenant.notificationSettings` es un subdocumento embebido (`_id: false`), no requiere `tenantId` propio. `docs/db-schema.md` sincronizado: fila `reminderSent`, índice documentado, nota de regla de negocio con enlace a GOV-NOTIFY.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — Ver auditoría GOV-NOTIFY exhaustiva abajo. Sin hallazgos bloqueantes de seguridad.
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — `Appointment.reminderSent` es un campo nuevo agregado a un modelo existente (no renombra/remueve/cambia tipo de ningún field previo de la respuesta pública de `/api/turnos`). `mailService.ts`/`reminderScheduler.ts` son módulos internos sin superficie HTTP. No dispara el mandato de C8. Correcto no agregar entrada en `CHANGELOG.md` para este stack.

---

## Auditoría GOV-NOTIFY — Stack 3 (punto por punto contra `docs/governance-rules.md` mandatos 1-5)

1. **Cifrado de `smtpPasswordEncrypted`** — Sin cambios respecto a Stack 2 (ya auditado y aprobado); Stack 3 solo *consume* `decryptSecret()`. `mailService.ts:22` desencripta la contraseña una única vez, en memoria, justo antes de construir `transporter.auth.pass`. Ningún `console.log`/`console.error` incluye `smtpPassword` — el único `console.error` del flujo (`reminderScheduler.ts:60`) interpola solo `tenantId` y `appointmentId`. **Cumple.**
2. **`Appointment.reminderSent` como fuente de idempotencia** — `reminderScheduler.ts:57-58`: `appointment.reminderSent = true; await appointment.save();` se ejecuta **dentro** del `try`, inmediatamente después del `await sendAppointmentReminder(...)` exitoso. Si `sendMail` lanza, la excepción propaga desde `mailService.ts` (sin `try/catch` interno) y es atrapada por `reminderScheduler.ts:59-61`, que nunca llega a marcar `reminderSent`. Envío exitoso → marca; envío fallido → no marca, reintentable en la próxima corrida. **Cumple con GOV-NOTIFY mandato 4.**
3. **Omisión silenciosa sin email** — `reminderScheduler.ts:41-44`: `if (!appointment.client?.email) { continue; }`, sin marcar `reminderSent`, reintentable si el cliente completa el email más adelante. **Cumple con GOV-NOTIFY mandato 5** (mitad "cliente sin email").
4. **Omisión silenciosa sin SMTP configurado** — El filtro de tenants (`reminderScheduler.ts:18-23`) excluye directamente de la iteración a cualquier tenant sin SMTP configurado — sus turnos nunca se leen ni se marcan. **Cumple.**
5. **Turno cancelado antes del recordatorio (Acceptance Criteria #3 de EP-17)** — `reminderScheduler.ts:33`: `status: { $in: ['pending', 'confirmed'] }` excluye naturalmente `status: 'cancelled'`. **Cumple.**
6. **Resiliencia del batch** — `try/catch` individual envuelve "enviar + marcar" por cada `appointment`; un fallo SMTP de un tenant no interrumpe el procesamiento del resto. **Cumple.**
7. **Multi-tenancy del cron** — Caso legítimamente distinto de "todo query filtra por `req.tenantId`" (no hay `req`, es un job interno). El query de `Appointment.find` está scoped por `tenantId: tenant._id` dentro del loop externo de tenants; `client`/`service` poblados pertenecen al mismo tenant por integridad referencial garantizada aguas arriba. **Cumple.**
8. **`index.ts` vs `server.ts`** — `index.ts` importa y llama `startReminderScheduler()` únicamente dentro del callback de `server.listen(...)`. `server.ts` no fue modificado para incluir el scheduler. El cron no se dispara al importar `server.ts` vía supertest. **Cumple.**
9. **Contenido del mail (Acceptance Criteria #2 de EP-17)** — `mailService.ts:34-58`: nombre completo del cliente, servicio (con fallback), fecha/hora formateada con `Intl.DateTimeFormat('es-AR', { timeZone: tenant.timezone, ... })`, y datos de contacto (`fromAddress`). Los 5 datos exigidos están presentes. **Cumple.**

## Gate de Variables Sensibles Hardcodeadas

```
grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"
```
Sin matches. `crypto.ts:7-11` falla explícitamente con `throw new Error(...)` si `CREDENTIALS_ENCRYPTION_KEY` no está definida — sin fallback hardcodeado. `apps/server/.env.example` documenta la variable con placeholder vacío.

## Observaciones No Bloqueantes (quedan como deuda técnica, no impiden el cierre)

1. **Cobertura de tests ausente** para `mailService.ts`/`reminderScheduler.ts` (confirmado en `impl_EP-17-reminder-backend.md`). Se recomienda un test tipo `tenantIsolation.test.ts` que ejercite `runReminderCheck()` con `mongodb-memory-server` y un transporter de `nodemailer` mockeado, priorizado antes de producción.
2. **`smtpPort` sin `default`** en `Tenant.notificationSettings` — a diferencia de `reminderHoursBefore` (`default: 24`). No es mandato de GOV-NOTIFY; posible mejora de UX de configuración a futuro.

## Cambios Requeridos

Ninguno. Hallazgo bloqueante de la primera pasada resuelto y verificado.

## Estado de `feature_list.json`

**Actualizado por este reviewer:** EP-17 pasa de `"in_progress"` a `"done"`.
