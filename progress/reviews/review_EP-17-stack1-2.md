# Reporte de Revisión Técnica — Feature EP-17 (Stack 1 + Stack 2)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-01

> Alcance de esta revisión: Stack 1 (campo `email` opcional en `Client`) y Stack 2 (Ajustes > Notificaciones — SMTP + horas de anticipación por tenant). El Stack 3 (envío real de mail + cron) **no** se audita en esta ronda; `feature_list.json` permanece en `"status": "in_progress"` — no se toca.

---

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — `feature_list.json` tiene exactamente 1 feature `in_progress` (EP-17). Sandbox respetado: backend solo tocó `apps/server/`, frontend solo `apps/client/`, cada implementer escribió su propia bitácora `-backend`/`-frontend` con nombre exacto.
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — Estructura de capas respetada. `Client.email` no requiere paginación (extiende un modelo ya paginado). `/api/notificaciones` es un recurso singleton de configuración por tenant, exención correcta (no es un listado). Todos los queries de `notificationSettingsController.ts` y `clientController.ts` usan `req.tenantId`.
- [x] C4 (Compilación Estática + Lint) — Verificado empíricamente por el reviewer (no solo confiado en bitácoras):
  - `pnpm --filter @estetica/server build` → Exit Code 0.
  - `pnpm --filter @estetica/client build` → Exit Code 0.
  - `pnpm --filter @estetica/client lint` → Exit Code 1, pero el único `error` es el preexistente `ProductoModal.tsx:37:25 'stock' is assigned a value but never used` (confirmado con `git log`/`git diff` que no fue tocado por esta feature). Los 4 `warning` de `react-hooks/incompatible-library` (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) también son preexistentes y no involucran archivos de EP-17. Ningún archivo de esta feature (`crypto.ts`, `notificationSettingsController.ts`, `notificationSettingsRoutes.ts`, `Notificaciones.tsx`, `notificationSettingsApi.ts`, `ClienteModal.tsx`, `CargaMasivaClientesModal.tsx`, `Client.ts`, `clientController.ts`, `clientRoutes.ts`) introduce error o warning nuevo.
- [x] C5 (Cierre de Sesión Append-Only) — No aplica cierre todavía (feature sigue `in_progress`, falta Stack 3). No se exige entrada de cierre en `progress/history.md` en esta ronda parcial.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — `Client.ts` ya tenía `tenantId` (sin cambios en ese campo); `email` agregado como `String, trim, lowercase`, sin `required`, sin `unique` (coherente con la decisión documentada de no colisionar con `admins.email` único global). `Tenant.ts` agrega `INotificationSettings`/`notificationSettings` como subdocumento (`_id: false`) del propio tenant — no requiere `tenantId` propio porque vive embebido en el documento `Tenant`, no es una colección nueva.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — Ver detalle exhaustivo de GOV-NOTIFY abajo. Ningún hallazgo bloqueante.
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — `Client.email` es un campo **nuevo y opcional** agregado a la respuesta (no renombra, no remueve, no cambia tipo de ningún field existente); `GET/PUT /api/notificaciones` son **endpoints nuevos**. Ninguno de los dos dispara el mandato de C8 (que aplica a rename/type-change/removal). No se requiere entrada en `CHANGELOG.md` para esta sub-entrega.

---

## Auditoría GOV-NOTIFY (punto por punto, contra `docs/governance-rules.md`)

1. **`apps/server/src/utils/crypto.ts`** — AES-256-GCM correcto (`createCipheriv('aes-256-gcm', ...)`). IV aleatorio de 12 bytes (`randomBytes(IV_LENGTH)`) generado **en cada llamada** a `encryptSecret` (línea 17), nunca reutilizado ni derivado de forma determinística. La clave se deriva con `scryptSync(secret, SALT, 32)` (línea 12) — nunca se usa `process.env.CREDENTIALS_ENCRYPTION_KEY` crudo como clave AES. `getEncryptionKey()` lanza `Error` explícito si la env var falta (línea 9-11) — no hay fallback ni degradación silenciosa. Formato de salida `iv:authTag:ciphertext` en hex, `authTag` se verifica en `decryptSecret` vía `setAuthTag` antes de descifrar. **Cumple.**
2. **GET — fuga de contraseña** — `getNotificationSettings` (líneas 16-25) construye el objeto de respuesta campo por campo explícitamente; `smtpPasswordEncrypted` **no aparece en ningún camino**. Solo se expone `hasSmtpPassword: Boolean(settings?.smtpPasswordEncrypted)` (línea 24). Mismo patrón en el `return` de `updateNotificationSettings` (líneas 75-84). **Cumple.**
3. **PUT — patrón "vacío = no cambiar"** — Línea 55: `if (smtpPassword !== undefined && smtpPassword !== '')` — solo si viene un valor no vacío se llama `encryptSecret(smtpPassword)` (línea 56) y se agrega a `updates`. Si `smtpPassword` es `undefined` o `''`, `notificationSettings.smtpPasswordEncrypted` simplemente no entra en el `$set`, preservando el valor persistido. Nunca se persiste texto plano — el cifrado ocurre **antes** de construir el objeto `updates` que se pasa a `findByIdAndUpdate`. **Cumple.**
4. **Multi-tenancy** — `getNotificationSettings`/`updateNotificationSettings` usan `Tenant.findById(req.tenantId)` / `Tenant.findByIdAndUpdate(req.tenantId, ...)`. Confirmé contra `middlewares/authMiddleware.ts` (líneas 61-71): `checkTenantAccess` resuelve `req.tenantId = req.adminInfo.tenantId`, exclusivamente desde el admin autenticado — nunca del body. El controller de `updateNotificationSettings` desestructura únicamente `smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, fromEmail, fromName, reminderHoursBefore` del body — **no hay whitelist bypasseable, `tenantId` no se lee del body en ningún punto**. El patrón `findById(req.tenantId)` es idéntico al ya auditado en `disponibilidadController.ts` (`getDisponibilidad`/`updateDisponibilidad`, líneas 16 y 58) — es correcto porque `Tenant._id === req.tenantId` (el propio documento del tenant autenticado, no un recurso de terceros referenciado por ID externo), por lo que no hay superficie de IDOR cross-tenant aquí. **Cumple.**
5. **Rutas** — `server.ts` línea 65: `app.use('/api/notificaciones', checkAdminAccess, checkTenantAccess, requireRole('ADMIN'), notificationSettingsRoutes)`, montado inmediatamente después de `/api/disponibilidad` (línea 63) con idéntica cadena de middlewares. **Cumple.**
6. **Frontend `Notificaciones.tsx`** — `useForm` con `defaultValues.smtpPassword: ''` (línea 34); el `useEffect` de `reset()` (líneas 41-54) fija `smtpPassword: ''` explícitamente en cada refresh de `data`, nunca `data.smtpPassword` (que además nunca existe en la respuesta del backend). `onSubmit` (líneas 65-71) hace `delete payload.smtpPassword` si el campo quedó vacío antes de mutar. Trifecta de accesibilidad para el indicador de contraseña: `FiCheckCircle` + `text-maison-green` + "Contraseña configurada" vs. `FiAlertCircle` + `text-gray-500` + "Sin contraseña configurada" (líneas 198-206). **Cumple.**
7. **`.env.example`** — Documenta `CREDENTIALS_ENCRYPTION_KEY` con comentario explicativo (`openssl rand -hex 32`) y valor vacío, sin exponer ningún secreto real. **Cumple.**

## Gate de Variables Sensibles Hardcodeadas

```
grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"
```
Sin matches. No hay secretos hardcodeados en ningún archivo tocado por esta feature ni en el resto de `apps/server/src/`.

## Auditoría Stack 1 (`Client.email`)

- `apps/server/src/models/Client.ts` línea 20: `email: { type: String, trim: true, lowercase: true }` — sin `required`, sin `unique`. Confirmado opcional, no colisiona con el índice compuesto existente (`{ tenantId, isActive, lastName }`).
- Validación de formato con `express-validator` presente en creación (`clientRoutes.ts:27`), edición (`clientRoutes.ts:70`) y carga masiva (`clientRoutes.ts:42`): `body('email').optional({ checkFalsy: true }).isEmail()...normalizeEmail()`.
- Frontend captura el campo en `ClienteModal.tsx` (líneas 128-137, con badge "Opcional" consistente con "Notas Médicas") y en `CargaMasivaClientesModal.tsx` (columna `Email` en la plantilla descargable línea 36, mapeo `email` línea 91, guía de formato visible línea 156).
- `docs/db-schema.md` actualizado con la fila `email` en la tabla de `clients` (línea 87).

## Cambios Requeridos (Si aplica)

Ninguno. Sin hallazgos bloqueantes en ninguno de los dos stacks.

## Observaciones no bloqueantes (no requieren acción antes de continuar con Stack 3)

1. `apps/server/src/controllers/clientController.ts:167` — `catch (error: any)` en `createBulkClients` viola la convención "Prohibido `any`" de `docs/conventions.md`. **No es un hallazgo de esta feature**: confirmado con `git diff HEAD~8` que la función completa (incluido el `catch` tipado `any`) fue introducida en el commit `c49f067` (UX-10), previo a EP-17. Los implementers de EP-17 no tocaron esa línea. Queda como deuda preexistente fuera de alcance — si se retoca `createBulkClients` en Stack 3 (ej. para el flujo de `email`+recordatorios), sería el momento de corregirlo.
2. `Tenant.notificationSettings.smtpPort`/`smtpSecure`/`fromEmail` no tienen validación cruzada (ej. exigir `smtpHost` si se envía `smtpPassword`) — aceptable en esta sub-entrega porque el envío real (Stack 3) es quien primero necesitará esa validación de "configuración completa antes de habilitar cron"; no es un requisito de GOV-NOTIFY para Stack 2.
