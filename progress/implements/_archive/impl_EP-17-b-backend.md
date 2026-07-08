# Implementación — EP-17-b (Backend) — Migrar SMTP por-tenant a SMTP global de la app

**Sandbox:** `apps/server/` únicamente. No se tocó `apps/client/`.

## Archivos modificados

1. `apps/server/.env.example` — agregadas variables SMTP globales de la app: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, cada una con comentario descriptivo.
2. `apps/server/src/config/mailConfig.ts` (**nuevo**) — centraliza lectura de las variables de entorno SMTP y exporta `mailConfig: IMailConfig` (host, port, secure, user, pass, fromEmail). Si falta alguna variable crítica, hace `console.warn` sin crashear el proceso (entornos de desarrollo sin SMTP configurado).
3. `apps/server/src/services/mailService.ts` — reemplazado el armado de `nodemailer.createTransport()` desde `tenant.notificationSettings` por `mailConfig`. El `transporter` ahora se crea **una sola vez a nivel de módulo** (ya no por-llamada). El nombre visible del remitente sigue siendo `tenant.name`; la dirección real es `mailConfig.fromEmail`. Resto de la lógica de contenido (formateo de fecha/hora con timezone del tenant, texto/html del recordatorio) intacta.
4. `apps/server/src/models/Tenant.ts` — eliminados de `INotificationSettings` y `TenantSchema.notificationSettings` los 7 subcampos SMTP (`smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPasswordEncrypted`, `fromEmail`, `fromName`). Se conserva `reminderHoursBefore` (default 24, min 1, max 168) intacto como campo por-tenant.
5. `apps/server/src/services/reminderScheduler.ts` — el filtro de tenants elegibles pasó de "tiene SMTP completo" a simplemente `Tenant.find({ isActive: true })`. Se ajustó la numeración del comentario de "omisión silenciosa" (ahora GOV-NOTIFY mandato 4, ya no menciona falta de SMTP).
6. `apps/server/src/controllers/notificationSettingsController.ts` — recortado a exponer/actualizar únicamente `reminderHoursBefore` en `GET`/`PUT`. Eliminados los 7 campos SMTP de request/response, `hasSmtpPassword` y el import de `encryptSecret`.
7. `apps/server/src/routes/notificationSettingsRoutes.ts` — recortada la validación `express-validator` a solo `reminderHoursBefore` (ahora requerido en el `PUT`, ya que es el único campo del endpoint).
8. `docs/governance-rules.md` (sección `GOV-NOTIFY`, antes líneas ~117-131) — reescrita completa: SMTP global vía variables de entorno, todos los tenants activos elegibles, `fromName` = `tenant.name`, nueva lista de mandatos (incluye el mandato 6 documentando que `utils/crypto.ts` queda sin consumidores en este flujo pero se conserva).
9. `docs/db-schema.md` (sección `notificationSettings` del modelo `Tenant`) — actualizada para reflejar el subdocumento recortado a solo `reminderHoursBefore`, con nota de que el SMTP es ahora config global vía `src/config/mailConfig.ts`.

## Decisiones técnicas

### `utils/crypto.ts` (`encryptSecret`/`decryptSecret`) — NO se elimina
Grep confirmado (`apps/server/src`): tras los cambios de esta feature, `encryptSecret`/`decryptSecret` **no tienen ningún consumidor** fuera de su propio archivo de definición (`crypto.ts`). Quedan huérfanos. Decisión: **no se borra el archivo** en esta feature — es un utilitario puro (AES-256-GCM genérico, no acoplado a SMTP) que podría reutilizarse para cifrar cualquier otro secreto en reposo en el futuro cercano. Documentado explícitamente en `GOV-NOTIFY` mandato 6 como "sin consumidores actuales, se conserva". La variable de entorno `CREDENTIALS_ENCRYPTION_KEY` en `.env.example` también queda intacta por la misma razón (crypto.ts sigue dependiendo de ella si algo la vuelve a usar).

### `notificationSettingsController.ts`/`notificationSettingsRoutes.ts` — se mantienen como módulo separado (NO se fusiona a `Tenant`/`Negocio`)
Decisión: mantener el endpoint `/api/notificaciones` (montado en `server.ts:65`, sin cambios en ese archivo) sirviendo únicamente `reminderHoursBefore`, en vez de mover ese campo al controller/rutas de `Tenant`. Motivo: la tarea indica que el implementer de frontend fusiona la UI visualmente en `Negocio.tsx`, pero puede seguir golpeando este mismo endpoint — mover el campo a otro controller habría forzado una coordinación de contrato API en paralelo con el otro implementer trabajando en simultáneo sobre la misma feature, con riesgo de romper su integración si ya asumió `/api/notificaciones` como endpoint de lectura/escritura. Mantener el endpoint separado (aunque ahora de un solo campo) es el cambio de menor superficie y menor riesgo de colisión entre ambos sandboxes. `server.ts` no requirió cambios (el montaje de la ruta ya era correcto: `checkAdminAccess` + `checkTenantAccess` + `requireRole('ADMIN')`).

## Verificación

```
pnpm --filter @estetica/server build
```
Resultado: **Exit Code 0** (solo `tsc`, sin errores ni warnings de compilación). Ejecutado dos veces para confirmar.

## Pendiente / fuera de alcance de este implementer
- El frontend (`apps/client/src/api/notificationSettingsApi.ts`, `apps/client/src/views/Notificaciones.tsx`/`Negocio.tsx`) debe recortarse en paralelo para dejar de enviar los 7 campos SMTP eliminados — lo hace el otro implementer, no se tocó nada en `apps/client/`.
- No se migraron datos existentes de `Tenant.notificationSettings.smtp*` en Mongo — Mongoose simplemente ignora esos subcampos huérfanos en documentos ya persistidos (no rompen validación ni lectura), no se requiere backfill/limpieza para que el build o el runtime funcionen correctamente.
