# Explore Digest — UX-70 (Registrar retoque sin crear turno duplicado en agenda)

**Fecha:** 2026-08-04 · **Autor:** leader (lectura directa, sin subagente explorer — hallazgos ya verificados línea por línea)

## Código relevante

- `apps/server/src/controllers/serviceRecordController.ts`
  - `createServiceRecord` (líneas 1-135). El bloque a eliminar es exactamente:
    ```ts
    // Auto-create next touchup appointment in calendar
    if (finalNextTouchupDate) {
        const touchupStart = new Date(finalNextTouchupDate);
        const duration = foundService.duration || 60;
        const touchupEnd = new Date(touchupStart.getTime() + duration * 60000);
        await Appointment.create({
            tenantId, client, service, professional,
            startTime: touchupStart, endTime: touchupEnd,
            status: 'pending',
            notes: 'Retoque programado automáticamente',
            createdBy: req.adminInfo!._id,
            isActive: true,
        });
    }
    ```
    (líneas 108-127, justo antes de `return res.status(201).json(savedRecord);`).
  - El import de `Appointment` (línea 6) queda sin otros usos en este archivo tras el borrado — verificar si se puede quitar (no rompe nada más porque no hay otro `Appointment.` en el resto del controller).
  - El resto de la función (validaciones de tenant, stock, auto-completado de retoques anteriores, creación del `ServiceRecord`) NO se toca.

## Efecto colateral (hallazgo importante, no obvio)

`apps/server/src/services/reminderScheduler.ts` (`runReminderCheck`) es el cron (cada 15 min) que manda el recordatorio por mail 24h antes de un turno. Consulta **exclusivamente** `Appointment.find({ status: {$in:['pending','confirmed']}, reminderSent:false, startTime: {$gte: now, $lte: windowEnd} })`. No sabe nada de `ServiceRecord`/retoques.

Hoy, cada retoque generado desde `createServiceRecord` crea un `Appointment` con `status:'pending'` → ese Appointment SÍ entra en la ventana de `reminderScheduler` y el cliente recibe un mail recordatorio 24h antes de su retoque, igual que si fuera un turno agendado manualmente.

**Si se borra el bloque de creación del Appointment sin más cambios, se pierde silenciosamente el recordatorio por mail de los retoques** (GOV-NOTIFY). Los turnos agendados manualmente NO se ven afectados (siguen creando su propio Appointment vía el flujo de agenda normal).

Este trade-off debe confirmarse con el usuario antes de cerrar la feature — ver pregunta pendiente en `progress/current.md`.

## Verificación de no-regresión a correr tras el cambio

- `Turnos.tsx` / `GET /api/turnos`: ya no debe aparecer ningún evento "Retoque programado automáticamente" tras registrar una visita con próximo retoque.
- `Dashboard.tsx` y `ProfileClient.tsx` ("Próximos Retoques", `getUpcomingTouchups`): sin cambios, siguen leyendo de `ServiceRecord`, no de `Appointment`.
- `apps/server/src/__tests__/tenantIsolation.test.ts` referencia `Appointment` — revisar si hay algún test que dependa de la creación automática de este Appointment (no confirmado en esta exploración, el implementer debe correr la suite).

## Patrón a seguir

Ninguno nuevo — es una eliminación acotada de código existente. No aplica `docs/patterns-backend.md`.
