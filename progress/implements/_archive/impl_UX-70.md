# impl_UX-70 — Registrar retoque sin crear turno duplicado en agenda

## Feature
`UX-70` — Eliminar la creación automática de un `Appointment` al registrar un `ServiceRecord` con `nextTouchupDate`, para no duplicar el retoque entre "Próximos Retoques" (Dashboard) y la Agenda.

## Archivo modificado
- `apps/server/src/controllers/serviceRecordController.ts`

## Cambios realizados

1. **Eliminado el bloque de auto-creación de turno** en `createServiceRecord`, ubicado entre `const savedRecord = await newRecord.save();` y `return res.status(201).json(savedRecord);` (antiguas líneas ~108-127):

```ts
// Auto-create next touchup appointment in calendar
if (finalNextTouchupDate) {
    const touchupStart = new Date(finalNextTouchupDate);
    const duration = foundService.duration || 60;
    const touchupEnd = new Date(touchupStart.getTime() + duration * 60000);

    await Appointment.create({
        tenantId,
        client,
        service,
        professional,
        startTime: touchupStart,
        endTime: touchupEnd,
        status: 'pending',
        notes: 'Retoque programado automáticamente',
        createdBy: req.adminInfo!._id,
        isActive: true,
    });
}
```

   Resultado: tras el `save()` del `ServiceRecord`, la función retorna directamente `res.status(201).json(savedRecord)`. El `ServiceRecord` sigue guardando `nextTouchupDate` y `touchupStatus: 'pending'` exactamente igual que antes (esa lógica no fue tocada).

2. **Eliminado el import muerto** `import { Appointment } from '../models/Appointment';` (línea 6 original). Se verificó con grep que `Appointment` no se usaba en ningún otro lugar del archivo (`getServiceRecords`, `getClientRecords`, `getUpcomingTouchups`, `updateServiceRecord`, `deleteServiceRecord`, `getRecentRecords` no lo referencian).

## Decisiones técnicas

- Se conservó `foundService` (declarado en la validación 0.b) porque sigue teniendo un uso legítimo: la validación `if (!foundService) return 404`. Ya no se usa para `foundService.duration` (eso solo se necesitaba para calcular `touchupEnd` del Appointment eliminado), pero al seguir usado en el `if`, TypeScript no lo marca como variable sin uso — no requirió ningún cambio adicional.
- No se tocó la lógica de auto-completado de retoques anteriores (`ServiceRecord.updateMany`), ni las validaciones de tenant/stock, ni `updateServiceRecord`, `getClientRecords`, `getUpcomingTouchups`, `deleteServiceRecord`, `getRecentRecords`, `getServiceRecords`.
- No se tocó `reminderScheduler.ts` ni `mailService.ts` (efecto colateral ya aceptado explícitamente por el usuario: los retoques dejan de recibir el mail recordatorio de 24h porque ese cron solo consulta `Appointment`).
- No se agregaron dependencias nuevas ni comentarios explicativos adicionales fuera de lo estrictamente necesario.

## Build

```
pnpm --filter @estetica/server build
```

Resultado: **exit code 0** (`tsc` compiló sin errores).

## Alcance

- Solo se modificó `apps/server/src/controllers/serviceRecordController.ts`.
- No se tocó `apps/client/` ni ningún otro archivo del backend fuera del descrito.
