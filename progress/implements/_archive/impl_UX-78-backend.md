# Implementación — UX-78 (backend)

**Feature:** UX-78 — Sección de recordatorios manuales de turnos por WhatsApp
**Sandbox:** `apps/server/` (exclusivo)
**Timestamp:** 2026-09-23

## Cambio realizado

Archivo: `apps/server/src/controllers/appointmentController.ts`
Función: `getAppointments` (línea ~151)

Diff conceptual (una sola línea):

```
- .populate('client', 'firstName lastName')
+ .populate('client', 'firstName lastName phone')
```

Justificación: la nueva vista `/recordatorios` (implementada en paralelo por el frontend) necesita el teléfono del cliente para armar el link `wa.me`. `getAppointments` es el único endpoint reutilizado por esa vista (turnos acotados a "hoy" vía `startDate`/`endDate`), y hasta ahora solo populaba `firstName lastName` de `client`.

## Verificación de no-ruptura (según `explore_UX-78.md`, confirmada antes de tocar código)

- `getAppointmentById` y `getClientAppointments` tienen sus propios `.populate('client', ...)` independientes en el mismo archivo — no se tocaron, no se ven afectados.
- `getUpcomingAppointments` (línea ~483) ya populaba `firstName lastName phone` desde antes de este cambio — sin cambios.
- `apps/client/src/types/index.ts` ya declara `Appointment.client.phone?: string` como opcional — el consumidor actual de `getAppointments` (`Turnos.tsx`) ignora el campo nuevo sin romper tipos ni runtime.
- No se agregaron query params nuevos ni se modificó el contrato de filtrado (`startDate`, `endDate`, `professional`, `status` — este último sigue aceptando un solo valor, no `$in`; el filtro pending/confirmed para "hoy" queda resuelto client-side según lo acordado con el implementer de frontend).
- No se tocó ningún otro controller, modelo, ruta ni middleware.
- No se modificó `docs/db-schema.md` (no hay cambio de schema: `Client.phone` ya existía).

## Archivos modificados

- `apps/server/src/controllers/appointmentController.ts` (1 línea)

## Resultado del build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```

Exit code 0. Sin errores de TypeScript.

## Estado

Listo para revisión (`reviewer`). No se cambió el `status` de `UX-78` en `feature_list.json` (queda en `in_progress`, tarea del reviewer si el veredicto es verde). Pendiente: la parte frontend de esta feature la implementa otro subagente en paralelo (no dependemos de su archivo, ni él del nuestro salvo por este contrato de `populate`).
