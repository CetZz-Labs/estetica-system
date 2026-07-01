# Implementación — EP-17 (Stack 2: Ajustes > Notificaciones — SMTP + ventana de recordatorio, backend)

> Prerequisito de EP-17 (recordatorio de turno por mail). Esta entrega cubre únicamente el modelo + API de configuración por tenant. El envío de mail y el cron scheduler (Stack 3) se implementan en un paso posterior.

## Alcance
Sandbox: `apps/server/`. No se tocó `apps/client/`. No se instalaron dependencias nuevas (solo `crypto` nativo de Node).

## Archivos creados
- `apps/server/src/utils/crypto.ts` — `encryptSecret`/`decryptSecret` con AES-256-GCM. Clave derivada de `process.env.CREDENTIALS_ENCRYPTION_KEY` vía `scryptSync(secret, 'maison-salt', 32)`. IV aleatorio de 12 bytes por cifrado. Formato de salida `iv:authTag:ciphertext` (hex). Lanza error explícito si `CREDENTIALS_ENCRYPTION_KEY` no está seteada (nunca degrada a texto plano).
- `apps/server/src/controllers/notificationSettingsController.ts` — `getNotificationSettings` y `updateNotificationSettings`. Nunca devuelven `smtpPasswordEncrypted`; exponen `hasSmtpPassword: boolean`. El `PUT` solo re-cifra y persiste la contraseña si `smtpPassword` viene definido y no vacío (patrón "dejar en blanco para no cambiar", GOV-NOTIFY mandato 3). `$set` con spread condicional por campo, igual patrón que `updateDisponibilidad`.
- `apps/server/src/routes/notificationSettingsRoutes.ts` — `GET /` sin validación adicional (autenticación/tenant/rol se resuelven en `server.ts`), `PUT /` con `express-validator` (mismo patrón que `disponibilidadRoutes.ts`).
- `apps/server/.env.example` — no existía; creado con `PORT`, `DATABASE_URL`, `FRONTEND_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (nombres relevados de `apps/server/.env` existente, sin valores reales) + `CREDENTIALS_ENCRYPTION_KEY` con comentario explicativo (`openssl rand -hex 32`).

## Archivos modificados
- `apps/server/src/models/Tenant.ts` — agregado `INotificationSettings` (todos los campos opcionales, `reminderHoursBefore` con default conceptual 24) y sub-schema `notificationSettings` (`_id: false`, `reminderHoursBefore: { default: 24, min: 1, max: 168 }`), siguiendo el mismo estilo que `businessHours` (EP-16).
- `apps/server/src/server.ts` — import de `notificationSettingsRoutes` y montaje `app.use('/api/notificaciones', checkAdminAccess, checkTenantAccess, requireRole('ADMIN'), notificationSettingsRoutes)`, inmediatamente después del montaje de `/api/disponibilidad` (mismo patrón EP-16: middleware de auth/tenant/rol a nivel de `server.ts`, ruta sin `router.use(...)` propio).
- `docs/db-schema.md` — documentado el subdocumento `notificationSettings` en la sección `tenants`, con tabla de campos y nota explícita de que `smtpPasswordEncrypted` nunca se expone en texto plano vía API. Referencia cruzada a `governance-rules.md#gov-notify`.

## Decisiones técnicas / Hallazgos
- Se replicó el patrón de `disponibilidadController.ts`/`disponibilidadRoutes.ts` al pie de la letra (mismo estilo de `$set` condicional, `findByIdAndUpdate` con `req.tenantId` — nota: `Tenant` es el propio documento del tenant autenticado, `req.tenantId === tenant._id`, por eso `findById(req.tenantId)` es seguro aquí y no un anti-patrón P2/IDOR — mismo razonamiento ya aplicado en `disponibilidadController.ts` y `tenantController.ts`).
- `encryptSecret`/`decryptSecret` no se invocan aún desde ningún flujo de envío (Stack 3 pendiente); `decryptSecret` queda exportada y sin consumidor todavía — esperable en esta entrega parcial.
- No se agregó `reminderHoursBefore` como `required` para no romper tenants existentes sin `notificationSettings`; el default `24` se aplica tanto a nivel de schema (al crear un subdocumento nuevo) como en el controller (fallback `?? 24`) para tenants que aún no tienen el subdocumento en absoluto.

## Verificación
```
pnpm --filter @estetica/server build
```
Exit code: 0 (sin errores de TypeScript).

## Pendiente (fuera de este alcance)
- Stack 3: `Appointment.reminderSent`, `services/mailService.ts` (nodemailer), `services/reminderScheduler.ts` (node-cron), registro del cron, nuevas dependencias (requieren aprobación explícita del usuario).
- Frontend: `notificationSettingsApi.ts`, vista `Notificaciones.tsx`, ruta + entrada de sidebar (sandbox `apps/client/`, fuera del alcance de este implementer backend).
