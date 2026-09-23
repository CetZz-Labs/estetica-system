# Reporte de Revisión Técnica — Feature UX-78

**Feature:** Sección de recordatorios manuales de turnos por WhatsApp
**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-09-23

## Evidencia Empírica de Build/Lint/Tests (re-ejecutada por el reviewer, no solo confiada a la bitácora)

```
pnpm --filter @estetica/server build   → Exit Code 0
pnpm --filter @estetica/client build   → Exit Code 0 (bundle >500kB warning preexistente, sin relación a UX-78)
pnpm --filter @estetica/client lint    → Exit Code 0, 4 warnings preexistentes (ProfesionalModal.tsx, RegistroModal.tsx,
                                          Negocio.tsx, Turnos.tsx — react-hooks/incompatible-library por watch() de RHF).
                                          Ninguno en apps/client/src/utils/phone.ts ni apps/client/src/views/Recordatorios.tsx.
pnpm --filter @estetica/server test    → 4 tests fallidos en tenantIsolation.test.ts (POST /api/registros — 400 vs 404
                                          esperado por falta de `professional` en el body). Deuda preexistente ya
                                          documentada en progress/current.md § Bloqueos, ajena a appointmentController.ts::
                                          getAppointments (único punto tocado por esta feature). Sin regresiones nuevas.
```

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`; `impl_UX-78-backend.md` e
      `impl_UX-78-frontend.md` en disco; `progress/current.md` describe únicamente UX-78; sandbox respetado
      (backend solo tocó `apps/server/src/controllers/appointmentController.ts`, frontend solo `apps/client/`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries)
  - Backend: cambio de 1 línea en `getAppointments` (`appointmentController.ts:151`), dentro de `controllers/`.
    Filtro `tenantId: req.tenantId` intacto (línea 139) — no se tocó el filtrado por tenant.
  - Sin endpoint nuevo, sin paginación requerida: la vista está acotada a "turnos de hoy" — exención explícita
    equivalente a widgets de dashboard (criterio de aceptación de UX-78 y `docs/patterns-backend.md` § exenciones).
  - Frontend: `Recordatorios.tsx` consume vía `getAppointments()` de `api/appointmentApi.ts` (ya existente, no
    llamadas HTTP directas en el componente) + TanStack Query (`queryKey: ['appointments', 'recordatorios', start, end]`,
    `queryKey: ['tenant']` reusa cache de `Negocio.tsx`). Filtrado `pending`/`confirmed` en memoria está justificado
    (dataset ya acotado a un solo día por el backend, precedente en `docs/patterns-frontend.md:455`, documentado con
    comentario inline) — no es el patrón prohibido de traer la colección completa y paginar/buscar client-side.
- [x] C4 (Compilación Estática + Lint) — build server, build client y lint client con Exit Code 0 (ver evidencia arriba).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de ejecución por el leader tras este veredicto (history.md,
      current.md, archivado de impl/explore); no bloquea el veredicto de auditoría de código.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se modificó ningún modelo Mongoose;
      `Client.phone` ya existía en el schema, sin cambios de schema en esta feature.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404)
  - SEC-A: `appointmentRoutes.ts:19` aplica `router.use(checkAdminAccess)` — sin rutas nuevas, endpoint reusado ya protegido.
  - SEC-B: `getAppointments` sigue filtrando `{ tenantId: req.tenantId, isActive: true }` — sin cambio de comportamiento IDOR.
  - SEC-D/E: sin cambios de CORS ni de validadores (no hay POST/PUT nuevo).
  - SEC-G: sin `dangerouslySetInnerHTML` en `Recordatorios.tsx`.
  - SEC-H: `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin matches, sin secretos
    hardcodeados introducidos por este cambio.
  - Ruta `/recordatorios` sin `ProtectedRoute` de rol, pero SÍ detrás de auth: `AppLayout.tsx:91-93` redirige a `/login`
    si `!userId` (Clerk) — coincide con el criterio de aceptación ("protegida por auth", sin restricción de rol,
    decisión de producto documentada en `explore_UX-78.md` § 3.3 y confirmada en `impl_UX-78-frontend.md`).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — el cambio es puramente aditivo (agrega `phone`
      al `.populate('client', ...)`; el tipo `Appointment.client.phone?: string` en `apps/client/src/types/index.ts:103`
      ya lo declaraba opcional antes de esta feature). No es rename/remove/cambio de tipo — no aplica el gate de
      CHANGELOG.md (C8 solo lo exige para esos tres casos).

## Verificación de Criterios de Aceptación Específicos (feature_list.json → UX-78)

1. **Botón WhatsApp con mensaje/placeholders correctos** — `Recordatorios.tsx:14-18` (`buildReminderMessage`):
   arma `Hola {cliente}! Te recordamos tu turno para "{servicio}" el {fecha/hora} en {negocio}. Te esperamos!`
   con `formatFullDateTime(appointment.startTime)` (helper compartido correcto para timestamp real, no
   `formatCalendarDate`) y `businessName` desde `getTenant()` (`queryKey: ['tenant']`, dedup con `Negocio.tsx`).
   Tono consistente con `mailService.ts::sendAppointmentReminder` (mismo saludo, misma estructura "Te recordamos tu
   turno para X el Y"). Link armado en `Recordatorios.tsx:56`: `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
   — `encodeURIComponent` presente, teléfono normalizado vía `toWhatsAppPhone`.
2. **Cliente sin teléfono → botón deshabilitado con trifecta** — `Recordatorios.tsx:116-134`: `disabled={!waPhone}`,
   clase `disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted` (color), ícono `FiPhoneOff` visible
   (no oculto), texto visible "Sin teléfono" en el propio botón (no solo `aria-label`/`title`) — trifecta completa
   sobre la fila, no un tooltip mudo. Cumple GOV-ACCESS.
3. **4 estados** — loading: skeleton `animate-pulse` (`Recordatorios.tsx:60-68`); error: `useEffect` dispara
   `handleApiError` → toast (mensaje específico del backend) + bloque genérico inline con trifecta
   (`FiAlertCircle` + `text-alert-text` + texto genérico distinto al del toast, sin duplicar el mismo mensaje);
   empty: `FiCalendar` + texto "No hay turnos para hoy." (trifecta); data: tabla. Los 4 estados están presentes y
   no hay duplicación literal del mismo string de error en div+toast.
4. **HTML semántico** — `<button type="button">` en `Recordatorios.tsx:116-122`, clase `cursor-pointer` presente
   (con `disabled:cursor-not-allowed` como excepción correcta cuando `disabled`). Sin `<div onClick>`.
5. **Ruta y ubicación en sidebar** — `router.tsx:77`: `<Route path="/recordatorios" element={<Recordatorios />} />`
   dentro de `<Route element={<AppLayout />}>`, sin `ProtectedRoute` de rol (igual que `/turnos:76`).
   `AppLayout.tsx:152`: `<SidebarNavLink to="/recordatorios">` ubicado inmediatamente después de "Turnos" (línea 151)
   y antes de "Historial de Visitas" (línea 153), fuera del bloque `role === 'ADMIN'` de "Configuración" (líneas
   165-172). Cumple el criterio literal.
6. **Filtrado hoy + pending/confirmed, sin romper Turnos.tsx** — `appointmentController.ts:150-154`: único cambio
   es `phone` agregado al populate de `client`; `filter` (tenantId/isActive/startDate/endDate/professional/status)
   intacto. `Turnos.tsx` sigue llamando a `getAppointments` igual (`Turnos.tsx:91,216`) e ignora el campo `phone`
   nuevo sin romper tipos (ya era opcional en `types/index.ts:103`) ni runtime. Confirmado con build+lint verdes
   sobre `Turnos.tsx` sin cambios en el diff (`git diff --stat` no lo incluye).
7. **No se tocó notificaciones existentes** — `git status`/`git diff --stat` confirman que
   `pushReminderScheduler.ts` y `reminderScheduler.ts` no aparecen en el diff; `apps/server/src/services/`
   sin cambios (`git status --porcelain apps/server/src/services/` vacío).
8. **Sin dependencias nuevas, sandbox respetado** — `git diff --stat` muestra solo
   `apps/client/src/layouts/AppLayout.tsx`, `apps/client/src/router.tsx`,
   `apps/server/src/controllers/appointmentController.ts` como modificados + `apps/client/src/utils/phone.ts` y
   `apps/client/src/views/Recordatorios.tsx` como nuevos (además de `feature_list.json`/`progress/current.md`,
   responsabilidad del leader). Sin cambios a `package.json` de ningún workspace. Backend solo tocó
   `apps/server/`, frontend solo `apps/client/`.

## Cambios Requeridos (Si aplica)

Ninguno. No se detectaron violaciones bloqueantes.

## Nota operativa (no bloqueante)

`docs/patterns-backend.md` § exenciones de paginación no menciona explícitamente vistas "acotadas a hoy" como
categoría textual (solo "widgets de dashboard, catálogos cortos, rankings top-N y agregaciones/KPIs"); el criterio
de aceptación de `feature_list.json` para UX-78 sí declara esta exención de forma explícita y es la fuente de
verdad para esta feature puntual, por lo que no se marca como violación. Se sugiere al leader evaluar en una
futura sesión de mantenimiento documental si vale la pena ampliar la lista de exenciones en
`docs/patterns-backend.md` para cubrir este patrón (turnos/eventos "del día") de forma reutilizable — no bloquea
esta feature.
