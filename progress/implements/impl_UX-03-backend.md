# Implementación UX-03 — Backend

> Decisión de negocio: quitar hora obligatoria para el próximo retoque y auto-asignar el horario del último turno realizado por el cliente. Ver `progress/current.md`.

## Archivos modificados

### `apps/server/src/controllers/serviceRecordController.ts` (`createServiceRecord`)
- Se quitó `nextTouchupTime` de la destructuración del body.
- Se eliminó el guard `400` que exigía `nextTouchupTime`.
- Cuando se auto-calcula `nextTouchupDate` (no fue enviado por el usuario) y el servicio tiene `defaultTouchupDays > 0`: se busca con `Appointment.findOne({ tenantId, client, status: 'completed' }).sort({ startTime: -1 })` el último turno completado de ese cliente y se usan sus `getHours()`/`getMinutes()` para fijar la hora de la fecha calculada.
- Si no existe ningún turno previo completado, la fecha queda sin hora explícita (fallback de medianoche, comportamiento aceptado — ver riesgos conocidos en `progress/current.md`).

### `apps/server/src/controllers/appointmentController.ts` (`completeAppointment`)
- Se quitó `nextTouchupTime` de la destructuración del body.
- Se eliminó el guard `400` "La hora del próximo retoque es obligatoria...".
- El cálculo de `finalNextTouchupDate` ahora usa directamente `serviceDate.getHours()` / `serviceDate.getMinutes()` (`serviceDate` es `appointment.startTime`, el turno que se completa — por construcción es el último turno del cliente), sin necesidad de consultar la base de datos.

## Verificación

```
pnpm --filter @estetica/server build
> tsc
Exit Code: 0
```

## Nota de proceso

El agente implementador aplicó los cambios de código correctamente pero no tuvo permiso de herramienta Bash en su sesión para correr el build. El Leader verificó el diff línea por línea contra el plan y ejecutó el build exitosamente, dejando esta bitácora en su nombre.
