# Reporte de Revisión Técnica — Feature UX-68

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-04

## Resumen ejecutivo

La implementación backend↔frontend de UX-68 (notificaciones push PWA) es sólida: los 10 `acceptance_criteria` funcionales/de seguridad/de accesibilidad se verificaron con evidencia concreta en el código real (no solo en las bitácoras), la integración de contrato (`endpoint`, `keys.p256dh/auth`, nombres de endpoint y de env vars) coincide exactamente entre ambos sandboxes, no hay secretos hardcodeados ni claves VAPID filtradas fuera de la bitácora del implementer, el anti-IDOR del `DELETE` es correcto (404, nunca 403 revelador), la trifecta de accesibilidad está presente en el toggle real (`<button role="switch">`, no un `<div onClick>`), y los 4 comandos de verificación (`build` server, `build` client, `lint` client, `test` server) dan el resultado esperado sin regresiones nuevas.

Se detectó **un solo hallazgo bloqueante**: falta la entrada en `CHANGELOG.md` bajo `### Added` para los dos endpoints nuevos (`POST`/`DELETE /api/notificaciones/push-subscription`), siguiendo el mismo precedente ya aplicado en la ronda anterior de `review_UX-69.md` (Cambio Requerido #2, mismo tipo de hallazgo C8).

## Checklist de Acceptance Criteria (`feature_list.json`, id `UX-68`)

1. **[x]** Dependencia `web-push` bloqueada hasta aprobación explícita del usuario humano — ya aprobada antes de esta ronda (no es un hallazgo de esta revisión). Evidencia: `apps/server/package.json` (`"web-push": "3.6.7"`, `"@types/web-push": "3.6.4"`).

2. **[x]** `apps/client/public/manifest.json` + `apps/client/public/sw.js` nuevos; `index.html` enlaza el manifest; SW se registra solo si `'serviceWorker' in navigator`.
   Evidencia: `apps/client/public/manifest.json` (íconos, `theme_color`/`background_color` coherentes con el sistema de diseño); `apps/client/public/sw.js` líneas 1-9 (listener `push` → `showNotification`); `apps/client/index.html` líneas 6-7 (`<link rel="manifest" ...>` + `<meta name="theme-color">`); `apps/client/src/main.tsx` líneas 25-31 (`if ('serviceWorker' in navigator) { window.addEventListener('load', ...) }`). El ícono referenciado (`/shear-favicon.png`) existe realmente en `apps/client/public/` (verificado con `ls`, 136 KB, no un archivo inventado).

3. **[x]** UI de opt-in explícito (no autopedir permiso al cargar la app), dispara `Notification.requestPermission()` → si concedido, `pushManager.subscribe(...)` con VAPID public key vía `VITE_VAPID_PUBLIC_KEY` (nunca hardcodeada).
   Evidencia: `apps/client/src/views/Negocio.tsx` líneas 124-211 (`handleTogglePush` es la única vía de entrada, solo se dispara por click de usuario en el `<button role="switch">`; el registro del SW en `main.tsx` NO pide permiso ni suscribe). Línea 182: `const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;` — leída de env, con guard explícito (`if (!vapidPublicKey) { toast.error(...); return; }`) si falta.

4. **[x]** `POST`/`DELETE /api/notificaciones/push-subscription` autenticados (`checkAdminAccess` + `checkTenantAccess`), scopeados a `tenantId`+`adminId` server-side, whitelist estricta del body (sin aceptar `tenantId` del body).
   Evidencia: `apps/server/src/routes/pushSubscriptionRoutes.ts` líneas 12-13 (middlewares a nivel de router); `apps/server/src/controllers/pushSubscriptionController.ts` líneas 9, 17-18 (`const { endpoint, keys } = req.body` — destructuring explícito, nunca `...req.body`; `tenantId: req.tenantId, adminId: req.adminInfo!._id` resueltos server-side) y líneas 38-46 (`DELETE`: `findOneAndDelete({ endpoint, tenantId: req.tenantId, adminId: req.adminInfo!._id })` → `404` si no matchea, nunca `403` revelador — anti-IDOR correcto, SEC-B).

5. **[x]** Modelo `PushSubscription` documentado en `docs/db-schema.md` antes de crearse.
   Evidencia: `docs/db-schema.md` líneas 211-234 (sección `pushsubscriptions`, con la divergencia de `isActive` justificada explícitamente). El modelo real (`apps/server/src/models/PushSubscription.ts`) coincide campo por campo con el esquema documentado (`tenantId`, `adminId`, `endpoint` único, `keys.p256dh`/`keys.auth`, índice compuesto `{ tenantId: 1, adminId: 1 }`).

6. **[x]** Cron diario que por tenant activo calcula turnos de hoy + retoques pendientes y envía un único push resumen por suscripción.
   Evidencia: `apps/server/src/services/pushReminderScheduler.ts` líneas 35-64: `Tenant.find({ isActive: true })`, `Appointment.countDocuments({ tenantId, isActive: true, status: { $in: ['pending','confirmed'] }, startTime: {$gte/$lte} })` + `ServiceRecord.countDocuments({ tenantId, touchupStatus: 'pending', nextTouchupDate: { $lte: endOfDay } })`, `if (total === 0) continue`, un solo `payload` por tenant enviado a cada suscripción del tenant (no un push por evento). `startPushReminderScheduler` línea 93: `cron.schedule('0 8 * * *', ...)`.

7. **[x]** Suscripciones con error 410/404 se eliminan automáticamente.
   Evidencia: `pushReminderScheduler.ts` líneas 75-82 (`catch (sendError)` → `if (statusCode === 410 || statusCode === 404) { await PushSubscription.deleteOne(...) }`).

8. **[x]** Trifecta de accesibilidad (GOV-ACCESS) en la UI de opt-in.
   Evidencia: `Negocio.tsx` líneas 401-457 — color (`text-primary`/`text-destructive`/`text-muted-foreground` según estado) + ícono (`FiBell`/`FiBellOff`) + texto (`'Notificaciones activadas'`/`'...desactivadas'`/`'...bloqueadas por el navegador'`/etc.) simultáneos en todos los estados. El control es un `<button type="button" role="switch" aria-checked={...} aria-label={...}>` real (líneas 421-431), no un `<div onClick>`, con `cursor-pointer` (clase Tailwind en línea 428) y `disabled:cursor-not-allowed` cuando corresponde (vía `disabled:opacity-50` + `disabled` real). Estado `'denied'` agrega mensaje inline adicional con `FiAlertCircle` (línea 439).

9. **[ ] (pendiente, no bloqueante para este veredicto — ver nota)** Documentar en `progress/history.md` la limitación de iOS.
   `grep -n "UX-68" progress/history.md` no devuelve resultados — la entrada aún no existe. **No la cuento como Cambio Requerido bloqueante** porque el propio protocolo de cierre de `CLAUDE.md` (paso 3, "Escribir entrada en `progress/history.md`") ubica esta escritura **después** del veredicto del reviewer, a cargo del leader — mismo orden verificado empíricamente en el cierre de `UX-69` (`progress/history.md` línea ~1325, escrita por el leader tras el `APPROVED` del reviewer). Queda como acción pendiente explícita para el leader al cerrar esta sesión, no resuelta por mí (no soy el orquestador y mi rol no es escribir minutas de cierre).

10. **[x]** `pnpm --filter @estetica/server build` y `pnpm --filter @estetica/client build` + `lint` pasan con exit code 0.
    Verificado empíricamente en esta ronda (ver sección siguiente), no solo declarado por los implementers.

## Integración backend↔frontend (contrato)

- Endpoint: `/api/notificaciones/push-subscription` idéntico en `apps/server/src/server.ts` línea 68 (montado **antes** del genérico `/api/notificaciones` con `requireRole('ADMIN')`, confirmado con `git diff` — el router específico intercepta correctamente) y `apps/client/src/api/pushNotificationApi.ts` líneas 10 y 16 (`api.post('/notificaciones/push-subscription', ...)`, `api.delete('/notificaciones/push-subscription', { data: { endpoint } })`).
- Shape del body: `{ endpoint: string, keys: { p256dh: string, auth: string } }` idéntico en `pushSubscriptionRoutes.ts` (validators `body('endpoint')`, `body('keys.p256dh')`, `body('keys.auth')`) y `pushNotificationApi.ts` (`interface PushSubscriptionPayload`).
- Env vars: `VAPID_PUBLIC_KEY` (backend, `apps/server/src/config/pushConfig.ts` línea 8) y `VITE_VAPID_PUBLIC_KEY` (frontend, `Negocio.tsx` línea 182) — mismo valor público esperado, documentado explícitamente en `impl_UX-68-backend.md` como acción pendiente del usuario humano en ambos `.env`. Confirmado con `grep` que el valor real generado (par VAPID) **no** aparece en ningún archivo del repo salvo la bitácora `impl_UX-68-backend.md` (referencia para carga manual en `.env`, no versionado — verificado que `apps/server/.env`/`apps/client/.env` están en `.gitignore`).

## Auditoría de Variables Sensibles (Gate Bloqueante)

```
grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"
```
Sin matches. `pushConfig.ts` lee `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` de `process.env` con `?? ''` (no un fallback con valor secreto real, un string vacío que dispara `console.warn`) — mismo patrón no-crash ya usado en `mailConfig.ts` para SMTP (feature opcional, no crítica de arranque como `CLERK_SECRET_KEY`/`MONGODB_URI`, que sí están fuera del alcance de esta feature y no fueron tocadas). No constituye una violación de GOV-ENV: las 3 variables listadas ahí como "críticas que deben tumbar el arranque" son explícitamente `CLERK_SECRET_KEY`, `MONGODB_URI`, `VITE_CLERK_PUBLISHABLE_KEY` (`docs/governance-rules.md` línea 153) — VAPID no está en esa lista y sigue el criterio de simplicidad ya aplicado a SMTP.

## Verificación de Builds / Lint / Tests (ejecutados en esta ronda, no solo declarados)

```
pnpm --filter @estetica/server build   → Exit 0
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build)
pnpm --filter @estetica/client lint    → Exit 0 (0 errores, 4 warnings preexistentes react-hooks/incompatible-library — RegistroModal.tsx x2, Negocio.tsx, Turnos.tsx — ninguno nuevo introducido por esta feature)
pnpm --filter @estetica/server test    → Test Files 1 failed | 2 passed (3), Tests 4 failed | 31 passed (35)
```
Los 4 fallos residen únicamente en `src/__tests__/tenantIsolation.test.ts` (bloque preexistente, no relacionado — falta `professional` en el body de esos tests), idénticos a los documentados en `impl_UX-68-backend.md`. Sin fallos nuevos.

## Cambios Requeridos (Bloqueante)

1. **C8 — Falta entrada en `CHANGELOG.md` bajo `### Added` para los dos endpoints nuevos.**
   - `CHANGELOG.md`, sección `## [Unreleased] → ### Added`: no tiene ninguna entrada para UX-68 (verificado con `grep -n "UX-68\|push" CHANGELOG.md`, sin resultados).
   - Esta feature introduce dos endpoints nuevos (`POST`/`DELETE /api/notificaciones/push-subscription`) y un modelo Mongoose nuevo (`PushSubscription`). Aunque no es un *breaking change* de un contrato existente, el propio estilo del proyecto documenta features nuevas bajo `### Added` (ver entradas `EP-16`, `EP-11` en `CHANGELOG.md` líneas 9-10) y la ronda anterior de `UX-69` estableció precedente explícito de tratar la ausencia de entrada como hallazgo bloqueante (`progress/reviews/review_UX-69.md`, Cambio Requerido #2).
   - **Corrección esperada (no la implemento — señalo el punto de ajuste, fuera de mi sandbox de auditor):** agregar bajo `## [Unreleased] → ### Added` una línea describiendo `POST`/`DELETE /api/notificaciones/push-subscription` (auth, scope tenant+admin) y el modelo `PushSubscription`, siguiendo el formato de las entradas `EP-16`/`EP-11`.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` en `feature_list.json` (verificado, ninguna otra); `impl_UX-68-backend.md`/`impl_UX-68-frontend.md` presentes; sandbox hermético (los archivos modificados de `apps/client`/`apps/server` fuera de `push*`/`Negocio.tsx`/`main.tsx`/`index.html`/`server.ts`/`index.ts`/`.env.example`/`package.json` corresponden a `UX-69`, feature ya cerrada `"done"` con su propia `progress/reviews/review_UX-69.md`, no generados por esta ronda).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — no aplica paginación (no es un listado de negocio); `tenantId` presente en todos los queries de negocio del cron (`Appointment.countDocuments`, `ServiceRecord.countDocuments`, `PushSubscription.find`) y en el controller (`saveSubscription`/`deleteSubscription`). Router hermano montado en el orden correcto (verificado con `git diff` sobre `server.ts`, path específico antes del genérico).
- [x] C4 (Compilación Estática + Lint) — los 3 comandos dan exit 0, ejecutados empíricamente en esta ronda.
- [ ] C5 (Cierre de Sesión Append-Only) — no aplica todavía (feature no se cierra en este veredicto); la entrada de `progress/history.md` (incluyendo la limitación de iOS, acceptance criterion #9) queda pendiente para cuando el leader cierre la sesión tras un veredicto APPROVED.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — `PushSubscription.ts` con `tenantId`/`adminId` indexados, `timestamps: true`, documentado en `docs/db-schema.md` antes de su creación (verificado).
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — SEC-A (middlewares presentes), SEC-B (`DELETE` anti-IDOR real, 404 nunca 403), SEC-E (`express-validator` + `validateRequest`), SEC-H (sin secretos hardcodeados, `.env` en `.gitignore`, claves VAPID reales no filtradas fuera de la bitácora).
- [ ] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — **falla**, ver Cambio Requerido #1.

## Veredicto Final: CHANGES_REQUESTED

`feature_list.json` **no se modificó** — `UX-68.status` permanece `"in_progress"`, tal como estaba antes de esta revisión. Corresponde exclusivamente al `reviewer` marcarla `"done"` una vez resuelto el Cambio Requerido #1 (entrada en `CHANGELOG.md`).

`git stash list` verificado vacío al cierre de esta revisión (no se usó `git stash` en ninguna etapa de esta auditoría).

---

## Segunda pasada — 2026-08-04

**Contexto:** el leader agregó la entrada faltante en `CHANGELOG.md` bajo `### Added` (único hallazgo bloqueante de la primera pasada). Se verifica exclusivamente ese cambio y que nada más se haya tocado desde la primera pasada.

### 1. Confirmación de que no hubo cambios fuera de `CHANGELOG.md`

`git status --short` sigue mostrando el mismo conjunto de archivos modificados/nuevos que ya existía antes de escribir la primera pasada (mezcla de trabajo de `UX-68`, `UX-69` y `UX-70`, todos sin commitear). Para aislar si algo cambió **después** de la primera revisión, se comparó el `mtime` de cada archivo modificado contra el `mtime` de `progress/reviews/review_UX-68.md` en su versión de la primera pasada (`2026-08-04 20:55:27`):

```
progress/reviews/review_UX-68.md   → 20:55:27 (primera pasada, ya escrita)
CHANGELOG.md                        → 20:55:53 (único archivo con mtime posterior)
```

Todos los demás archivos listados en `git status --short` (incluidos `feature_list.json`, `progress/history.md`, `docs/db-schema.md`, `pnpm-lock.yaml`, los controllers/rutas/vistas de `UX-68`/`UX-69`/`UX-70`) tienen `mtime` **anterior** a las 20:55:27 — es decir, ya estaban en ese estado cuando se escribió el veredicto de la primera pasada y no fueron tocados en el ciclo de corrección. `CHANGELOG.md` es el único archivo con `mtime` posterior, consistente con la instrucción de que el leader corrigió únicamente ese archivo. Confirmado.

### 2. Precisión de la entrada agregada en `CHANGELOG.md`

Entrada agregada (`## [Unreleased] → ### Added`):
> `- UX-68: Notificaciones push (PWA) de turnos/retoques. Nueva entidad PushSubscription (tenantId, adminId, endpoint único, keys.p256dh/auth — sin soft delete, es un token de dispositivo). Nuevos endpoints POST/DELETE /api/notificaciones/push-subscription (cualquier rol autenticado, resuelve tenantId/adminId server-side). Cron diario (0 8 * * *) que envía un push resumen ("Hoy: N turnos, M retoques pendientes") por admin suscripto cuando hay actividad del día, con limpieza automática de suscripciones caducadas (410/404). Requiere variables de entorno nuevas VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT (backend) y VITE_VAPID_PUBLIC_KEY (frontend) — ver apps/server/.env.example. UI de opt-in explícito en Configuración → Mi Negocio (/configuracion/negocio). Limitación conocida: en iOS Safari requiere instalar la PWA a la pantalla de inicio.`

Contrastada contra el código real (no solo contra el texto):
- **Modelo `PushSubscription`** (`apps/server/src/models/PushSubscription.ts` líneas 17-30): `tenantId`, `adminId`, `endpoint` (`unique: true`), `keys.p256dh`/`keys.auth`, sin campo `isActive` — comentario explícito en línea 20-21 justificando la ausencia de soft-delete ("token de dispositivo efímero, no un registro de negocio"). Coincide exactamente.
- **"Cualquier rol autenticado"** (`apps/server/src/routes/pushSubscriptionRoutes.ts` líneas 9-13): comentario explícito en el código ("Sin `requireRole`: cualquier admin autenticado (ADMIN/PROFESSIONAL/RECEPTIONIST)...") + solo `checkAdminAccess`/`checkTenantAccess`, sin `requireRole(...)`. Coincide.
- **Ruta de la UI** (`apps/client/src/router.tsx` línea 86-89): `path="/configuracion/negocio"` renderiza `<Negocio />`. Coincide con "Configuración → Mi Negocio (/configuracion/negocio)".
- **Limitación de iOS** (`apps/client/src/views/Negocio.tsx` líneas 451-453 + `apps/client/src/utils/webPush.ts` líneas 18-21): bloque condicional `{isIOS() && (...)}` con el texto "En iPhone, agregá esta app a tu pantalla de inicio... para poder recibir notificaciones." Coincide.
- Endpoints, cron `0 8 * * *`, limpieza 410/404 y env vars: ya verificados con evidencia de código en la primera pasada (puntos 4, 6, 7 del checklist); sin cambios desde entonces.

### 3. Formato

Consistente con las entradas vecinas `EP-16`/`EP-11` (mismo nivel de bullet bajo `### Added`, mismo estilo "`- <ID>: <descripción>. <detalle de endpoints>. <detalle de modelo>. <env vars>. <ubicación UI>. <limitación>.`"). Sin errores de sintaxis Markdown, sin romper la lista.

### Veredicto de la segunda pasada

El único hallazgo bloqueante de la primera pasada quedó resuelto con evidencia verificada en código real, sin efectos colaterales en el resto del working tree.

**Veredicto Final (actualizado):** **APPROVED**

## Mapeo de Checkpoints (Quality Gates) — actualizado

- [x] C2 (Coherencia de Estados y Enfoque Atómico)
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries)
- [x] C4 (Compilación Estática + Lint)
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de ejecución por el leader (entrada en `progress/history.md`, incluida la limitación de iOS), no bloqueante para este veredicto: corresponde al paso 3 del Protocolo de Cierre de Sesión, posterior al veredicto `APPROVED` del reviewer.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades)
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404)
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — resuelto en esta segunda pasada.

`feature_list.json`: `UX-68.status` actualizado de `"in_progress"` a `"done"` por mí (reviewer) en esta segunda pasada, tarea exclusiva del subagente validador.

`git stash list` verificado vacío al cierre de esta segunda pasada (no se usó `git stash`).
