# Reporte de Revisión Técnica — UX-03

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer (con verificación de builds re-confirmada por el Leader)
**Fecha:** 2026-06-17

## Resumen de la Auditoría

UX-03 es una decisión de negocio (no figura en `feature_list.json`) que revierte parcialmente UX-01/UX-02: elimina la hora obligatoria del "próximo retoque" y delega el auto-cálculo de horario al backend usando el último turno completado del cliente.

Se auditó código real (no solo bitácoras) en:
- `apps/server/src/controllers/serviceRecordController.ts` (`createServiceRecord`)
- `apps/server/src/controllers/appointmentController.ts` (`completeAppointment`)
- `apps/client/src/components/RegistroModal.tsx`
- `apps/client/src/api/serviceRecordApi.ts`
- `apps/client/src/api/appointmentApi.ts`

## Hallazgos

- Búsqueda de `nextTouchupTime` sobre `apps/` → 0 resultados. Sin guards 400 ni referencias residuales.
- `createServiceRecord`: consulta `Appointment.findOne({ tenantId, client, status: 'completed' }).sort({ startTime: -1 })`, correctamente filtrada por `tenantId`, usa `getHours()/getMinutes()` del último turno completado. Fallback a medianoche si no hay turno previo (riesgo conocido y aceptado, documentado en `progress/current.md`). La query está respaldada por el índice compuesto preexistente `{ tenantId: 1, client: 1, startTime: -1 }` en `Appointment.ts`.
- `completeAppointment`: usa directamente `serviceDate` (= `appointment.startTime`) sin queries adicionales, ya que el turno que se completa es por construcción el último turno del cliente.
- `RegistroModal.tsx`: sin restos de `showTimeField`, `timeError`, `hasAutoTouchup`, `requiresTimeField`, botón "+ Agregar solo hora", aviso de retoque automático ni input `type="time"`. `nextTouchupDate` quedó como único input opcional (`datetime-local`), sin validación de hora. `onSubmit` y `mutationFn` simplificados.
- `serviceRecordApi.ts` y `appointmentApi.ts`: sin `nextTouchupTime` en ningún tipo/interfaz.
- Multi-tenancy: la única query nueva a `Appointment` incluye `tenantId` explícitamente.
- Sin `console.log`, `debugger` ni `TODO` colgante introducidos.

## Verificación de Builds (re-ejecutada por el Leader)

```
pnpm --filter @estetica/server build → tsc → Exit Code 0
pnpm --filter @estetica/client build → tsc -b && vite build → Exit Code 0
pnpm --filter @estetica/client lint → 1 error preexistente (ProductoModal.tsx:37, ya documentado en progress/history.md sesión EP-14) + 2 warnings preexistentes no relacionados (Negocio.tsx, Turnos.tsx). Sin errores nuevos.
```

## Mapeo de Checkpoints

- [x] **C3 (Fidelidad Arquitectónica):** Backend respeta capas controllers/models, try/catch con 404/500. Frontend usa TanStack Query, funciones API, `export default`, tipado explícito, sin llamadas HTTP directas en componente.
- [x] **C4 (Compilación Estática):** Server build Exit 0, client build Exit 0, lint sin errores nuevos.
- [x] **C7 (Security Gate):** SEC-D — la query nueva a `Appointment` está correctamente acotada por `tenantId`. Sin `dangerouslySetInnerHTML`.

## Cambios Requeridos

Ninguno. No se detectaron violaciones bloqueantes.
