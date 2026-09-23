# Implementación — UX-78 (frontend)

**Feature:** UX-78 — Sección de recordatorios manuales de turnos por WhatsApp
**Sandbox:** `apps/client/` (exclusivo)
**Timestamp:** 2026-09-23

## Resumen

Nueva vista `/recordatorios` (sin `ProtectedRoute`, análoga a `/turnos`) que lista los turnos
de HOY del tenant (`status` `pending`/`confirmed`, ordenados por hora) con un botón por fila
para enviar un recordatorio manual por WhatsApp vía link `wa.me`. Reutiliza `GET /api/turnos`
(sin endpoint nuevo) y el `phone` recién agregado al `.populate('client', ...)` por el
implementer de backend (`impl_UX-78-backend.md`).

## Archivos creados

- `apps/client/src/utils/phone.ts` — función pura `toWhatsAppPhone(rawPhone): string | null`,
  heurística exacta acordada con el usuario (dígitos → quita `0` inicial → quita `54`/`540` →
  antepone `9` si falta → prefija `54`). Comentario de una línea documenta la limitación conocida
  del formato viejo "código de área + 15 + número" (no se intenta resolver, riesgo aceptado
  porque el envío es manual).
- `apps/client/src/views/Recordatorios.tsx` — vista nueva con los 4 estados obligatorios:
  - **Loading:** skeleton `animate-pulse` (4 filas).
  - **Error:** `useEffect([isError, error])` dispara `handleApiError(error, fallback)` → toast;
    el render solo muestra un bloque genérico con trifecta (color `text-alert-text` + icono
    `FiAlertCircle` + texto genérico), sin duplicar el mensaje específico del backend (ya va al
    toast) — instrucción explícita del encargo ("sin duplicar en un div inline").
  - **Vacío:** "No hay turnos para hoy" con trifecta (`text-muted` + `FiCalendar` + texto).
  - **Data:** tabla (cliente, servicio, horario, profesional, botón de recordatorio).
  - Botón de WhatsApp: `<button type="button">` semántico con `cursor-pointer`, ícono
    `FiMessageCircle` (react-icons/fi), abre `window.open('https://wa.me/' + tel + '?text=' +
    encodeURIComponent(mensaje), '_blank')`.
  - Sin teléfono: mismo `<button>` pero `disabled`, con `disabled:cursor-not-allowed` +
    estilo apagado (`disabled:bg-surface-2 disabled:text-muted`) + ícono `FiPhoneOff` + texto
    visible "Sin teléfono" (trifecta completa en la fila, no solo `title`/tooltip, por GOV-ACCESS).
  - Mensaje predefinido: plantilla exacta acordada, `formatFullDateTime` de `utils/dates.ts` para
    la fecha/hora del turno (no `formatCalendarDate`/`formatDateTime`), nombre del negocio vía
    `getTenant()` con `queryKey: ['tenant']` (mismo key que `Negocio.tsx`, dedup por TanStack Query
    — no se duplica la llamada de red).
  - Rango "hoy": `getLocalDayRangeISO(getTodayDateString())` de `utils/timeSlots.ts` (mismo
    helper/criterio ya usado por `Turnos.tsx` para computar el día local), pasado como
    `startDate`/`endDate` a `getAppointments` (sin endpoint ni función de API nuevos — se reutiliza
    la función existente en `appointmentApi.ts` sin modificarla).
  - Filtro `status === 'pending' || status === 'confirmed'` resuelto en memoria (client-side)
    porque `GET /api/turnos` solo acepta `status` como valor único, no `$in` — precedente
    documentado en `docs/patterns-frontend.md:455`. Comentario de una línea en el código explica
    la excepción a P1/P3 (vista acotada a "hoy" por diseño, mismo criterio que los widgets de
    Dashboard).

## Archivos modificados

- `apps/client/src/router.tsx` — import + `<Route path="/recordatorios" element={<Recordatorios />} />`
  dentro de `<Route element={<AppLayout />}>`, sin `ProtectedRoute` (mismo patrón que `/turnos`).
- `apps/client/src/layouts/AppLayout.tsx` — `<SidebarNavLink to="/recordatorios">Recordatorios</SidebarNavLink>`
  agregado entre "Turnos" e "Historial de Visitas", fuera del bloque `role === 'ADMIN'` de
  "Configuración" (visible para todos los roles autenticados, sin gate).

## Archivos NO tocados (confirmado dentro de alcance)

- `apps/client/src/api/appointmentApi.ts` — no requirió cambios, `getAppointments` ya acepta
  `startDate`/`endDate`.
- `apps/client/src/types/index.ts` — `Appointment.client.phone?: string` ya estaba declarado.
- Ningún archivo de `apps/server/`.

## Resultado del build y lint

```
pnpm --filter @estetica/client build
```
`tsc -b && vite build` → **Exit code 0**. Bundle generado sin errores (warning preexistente de
tamaño de chunk >500kB, no relacionado con esta feature).

```
pnpm --filter @estetica/client lint
```
`eslint .` → **Exit code 0**, 4 warnings preexistentes (`react-hooks/incompatible-library` en
`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, por `watch()` de
react-hook-form — ninguno en archivos tocados por esta feature). Sin warnings/errores nuevos.

## Estado

Listo para revisión (`reviewer`). No se cambió el `status` de `UX-78` en `feature_list.json`
(sigue `in_progress`). Ambos implementers (backend y frontend) completaron su parte; el
`reviewer` puede auditar el circuito completo.
