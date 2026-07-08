# Reporte de Revisión Técnica — Feature EP-17-b

**Veredicto Final:** APPROVED (ver re-revisión al final del documento; el veredicto original de la primera pasada fue CHANGES_REQUESTED)
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-08

## Resumen de la Auditoría

Se auditó `git diff` completo sobre ambos sandboxes (backend: `mailConfig.ts` nuevo, `mailService.ts`, `Tenant.ts`, `reminderScheduler.ts`, `notificationSettingsController.ts`, `notificationSettingsRoutes.ts`, `.env.example`; frontend: `notificationSettingsApi.ts`, `Negocio.tsx`, `Notificaciones.tsx` eliminado, `router.tsx`, `AppLayout.tsx`) más `docs/governance-rules.md` y `docs/db-schema.md`. Se corrieron ambos builds y el lint del frontend. La implementación técnica es sólida y el contrato entre los dos implementers paralelos quedó correctamente sincronizado, pero falta un artefacto de gobernanza obligatorio (C8) que ninguno de los dos implementers generó.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** una sola feature `in_progress` (`EP-17-b`) en `feature_list.json`. Ambos implementers respetaron su sandbox: backend tocó solo `apps/server/` + `docs/governance-rules.md`/`docs/db-schema.md` (permiso explícito documentado en su propia bitácora), frontend tocó solo `apps/client/`. Nota no bloqueante: `git status` muestra además `apps/client/src/components/RegistroModal.tsx` y `apps/client/src/views/Turnos.tsx` modificados — confirmado por `git diff` que corresponden a los fixes de portal de **UX-24**/**UX-26** (features previas ya cerradas, evidencia en `progress/implements/_archive/impl_UX-24-frontend.md` e `impl_UX-26-frontend.md`), simplemente no commiteados aún. No forman parte del diff de EP-17-b y no fueron tocados por sus implementers.
- [x] **C3 (Fidelidad Arquitectónica):** capas respetadas (`mailConfig.ts` en `config/`, sin lógica de negocio de Express/Mongoose). `notificationSettingsRoutes.ts` conserva `body('reminderHoursBefore').isInt({min:1,max:168})` + `validateRequest` como último elemento. `server.ts:65` (sin cambios) sigue montando `checkAdminAccess, checkTenantAccess, requireRole('ADMIN')` sobre `/api/notificaciones`. Frontend: `Negocio.tsx` usa TanStack Query/mutation con `handleApiError`/`toast.success`, tipado explícito (`useQuery<NotificationSettings>`), `export default function Negocio()`, botones `type="submit"`/`cursor-pointer`. No aplica paginación (no es listado) ni filtrado client-side.
- [x] **C4 (Compilación Estática + Lint):** verificado por el reviewer en este sandbox:
  - `pnpm --filter @estetica/server build` → **Exit Code 0**.
  - `pnpm --filter @estetica/client build` → **Exit Code 0** (solo warning preexistente de chunk size).
  - `pnpm --filter @estetica/client lint` → 1 error preexistente (`ProductoModal.tsx:37`, deuda ya conocida) + 4 warnings `react-hooks/incompatible-library` (incluye `Negocio.tsx:83`, mismo `watch('logo')` ya existente antes del cambio, solo desplazado de línea). **Sin errores/warnings nuevos** introducidos por esta feature — coincide con lo reportado en `impl_EP-17-b-frontend.md`.
- [x] **C5 (Cierre de Sesión Append-Only):** no aplica todavía — el veredicto es `CHANGES_REQUESTED`, por lo que el circuito de cierre (marcar `"done"`, entrada en `history.md`, `current.md` restaurado) queda pendiente hasta resolver el punto de C8.
- [x] **C6 (Capa de Datos):** `Tenant.ts` — los 7 subcampos SMTP eliminados de `INotificationSettings` y `TenantSchema.notificationSettings` (interfaz y schema en paralelo, correcto). `reminderHoursBefore` conservado intacto (`default: 24, min: 1, max: 168`). `Tenant` sigue sin `tenantId` propio (excepción correcta documentada — es la entidad raíz del tenant).
- [x] **C7 (Security Gate):**
  - SEC-A: middleware de auth intacto en `server.ts:65` (no tocado).
  - SEC-B: `Tenant.findByIdAndUpdate(req.tenantId, ...)` — sin aceptar `tenantId` del body, patrón preexistente correcto.
  - SEC-E: `express-validator` presente con `validateRequest` al final.
  - SEC-H: `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → **sin resultados**, ningún secreto hardcodeado. `mailConfig.ts` lee `process.env.SMTP_*` con fallback a `''`/`587`/`false` (no son valores secretos hardcodeados, son defaults vacíos) y emite `console.warn` si faltan — no hace `throw`. Esto **no** viola `GOV-ENV` (`docs/governance-rules.md:153`), que enumera explícitamente solo `CLERK_SECRET_KEY`, `MONGODB_URI`, `VITE_CLERK_PUBLISHABLE_KEY` como variables que deben abortar el arranque; `SMTP_*` no está en esa lista y el comportamiter anterior (`mailService.ts` pre-EP-17-b) tampoco crasheaba el proceso por falta de SMTP (validaba en runtime por-llamada). Comportamiento consistente, no es regresión.
  - `utils/crypto.ts` (`encryptSecret`/`decryptSecret`): confirmado por grep propio (`apps/server/src`) que no tiene consumidores fuera de su propio archivo tras el cambio. Decisión de no eliminarlo está razonablemente justificada y documentada en `GOV-NOTIFY` mandato 6 y en `impl_EP-17-b-backend.md` — no es una regla dura violada.
- [ ] **C8 (Estabilidad de API — CHANGELOG):** **VIOLACIÓN.** `GET`/`PUT /api/notificaciones` cambiaron su forma de request/response: se removieron 7 campos (`smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `fromEmail`, `fromName`, `hasSmtpPassword`) de ambos endpoints (`apps/server/src/controllers/notificationSettingsController.ts`, confirmado por `git diff`). Esto encaja exactamente en el criterio de C8 ("field removido") y en el precedente ya sentado por el propio proyecto para cambios equivalentes (ver `CHANGELOG.md` líneas 18-23, donde EP-11/EP-12/UX-10/UX-16 documentaron cada breaking change de forma de respuesta). `CHANGELOG.md` no tiene ninguna entrada para `EP-17-b` (`grep -i "EP-17-b\|notificaciones\|SMTP" CHANGELOG.md` → sin resultados) y `git diff --stat -- CHANGELOG.md` confirma que el archivo no fue tocado por ninguno de los dos implementers. El cambio es un breaking change permitido (feature `in_progress`, ver `CHECKPOINTS.md` C8 "Deprecation vs. Breaking"), pero **igual requiere la entrada documentada** bajo `## [Unreleased]` — no está.

## Cambios Requeridos

1. **`CHANGELOG.md` (`## [Unreleased]` → sección `Changed` o nueva entrada `[BREAKING]`):** agregar una entrada para `EP-17-b` documentando que `GET /api/notificaciones` y `PUT /api/notificaciones` dejaron de exponer/aceptar `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `fromEmail`, `fromName`, `hasSmtpPassword` — ambos endpoints ahora solo devuelven/aceptan `{ reminderHoursBefore }`. Justificación: `CHECKPOINTS.md` C8 exige "si la feature modifica la estructura de respuesta (field renombrado, tipo cambiado, field removido), existe entrada en CHANGELOG.md bajo `## [Unreleased]` con descripción clara" — esto no ocurrió pese a que ambas bitácoras (`progress/implements/impl_EP-17-b-backend.md`, `progress/implements/impl_EP-17-b-frontend.md`) documentan el recorte de campos en detalle. Puede redactarse siguiendo el mismo estilo que las entradas `[BREAKING]` ya existentes en `CHANGELOG.md:18-20` para mantener la homogeneidad del documento.

Una vez agregada esa entrada, el resto de la implementación (backend, frontend, `docs/governance-rules.md`, `docs/db-schema.md`, sincronización de contrato entre ambos implementers, builds y lint) está en condiciones de ser aprobada sin objeciones adicionales.

---

## Re-revisión — 2026-07-08 (segunda pasada)

**Veredicto Final:** APPROVED

### Verificación del único cambio pendiente (C8)

- `git diff --stat HEAD` confirma que, desde la pasada anterior, el único archivo tocado es `CHANGELOG.md` (`1 file changed, 3 insertions(+)`). Ningún archivo de `apps/client/src`, `apps/server/src` o `docs/` cambió después del cierre de la ronda anterior — verificado por mtime: `docs/db-schema.md` (20:00:54) y `docs/governance-rules.md` (20:00:03) quedaron congelados antes de que se escribiera `review_EP-17-b.md` (20:08:21); `CHANGELOG.md` tiene mtime 20:08:52, posterior a la revisión, consistente con el fix aplicado por el leader después del veredicto `CHANGES_REQUESTED`.
- `git diff -- CHANGELOG.md` muestra la entrada nueva bajo `## [Unreleased]`:
  - `### Changed`: `[BREAKING] (permitido — feature in_progress) EP-17-b: GET/PUT /api/notificaciones dejan de exponer/aceptar smtpHost, smtpPort, smtpSecure, smtpUser, fromEmail, fromName y hasSmtpPassword — la forma de request/response queda reducida a { reminderHoursBefore }` + detalle de la migración a variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`), el nuevo criterio de elegibilidad de `reminderScheduler.ts` (todos los tenants `isActive: true`, sin filtro por SMTP propio) y la aclaración de que `fromName` sigue siendo `tenant.name`.
  - `### Removed`: `EP-17-b: vista Notificaciones.tsx y su ruta/entrada de menú eliminadas ... El campo reminderHoursBefore se fusionó a la sección "Mi Negocio" (Negocio.tsx, EP-10)`.
- Esto cubre punto por punto el hallazgo bloqueante original: (1) contrato recortado documentado con el listado completo de campos removidos, (2) migración SMTP global vía env vars documentada, (3) criterio de elegibilidad del scheduler documentado, (4) `fromName = tenant.name` documentado explícitamente, (5) eliminación de `Notificaciones.tsx` y fusión a `Negocio.tsx` documentada en `Removed`. No queda ningún aspecto del cambio de contrato sin cubrir.
- El resto de los checkpoints (C2, C3, C4, C6, C7) ya habían sido marcados `[x]` sin objeciones en la primera pasada y no requieren re-auditoría — no hay diff de código nuevo que los afecte. C5 pasa ahora a `[x]`: con el veredicto APPROVED corresponde completar el circuito de cierre (marcar `"done"` en `feature_list.json`, entrada en `progress/history.md`, restaurar `progress/current.md`).

### Mapeo final de Checkpoints

- [x] C2 (Coherencia de Estados y Enfoque Atómico)
- [x] C3 (Fidelidad Arquitectónica)
- [x] C4 (Compilación Estática + Lint)
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de ejecución por el leader (history.md + current.md), sin objeción de este auditor.
- [x] C6 (Capa de Datos)
- [x] C7 (Security Gate)
- [x] C8 (Estabilidad de API — CHANGELOG) — **resuelto**, entrada agregada bajo `## [Unreleased]`.

**Acción tomada por este reviewer:** `feature_list.json` → `EP-17-b.status` actualizado a `"done"`.
