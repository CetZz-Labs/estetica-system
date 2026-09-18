# impl_UX-78-backend

## Feature
UX-78 — Revertir UX-70: al registrar una visita directa (`POST /api/registros` →
`createServiceRecord`) con "Próximo Retoque" completado, se vuelve a crear
automáticamente un `Appointment` en la agenda, además del `ServiceRecord`.

## Archivo modificado
`apps/server/src/controllers/serviceRecordController.ts` (único archivo tocado)

## Diff resumido

1. **Import restaurado** (junto al resto de imports de modelos, antes de
   `Professional`):
   ```ts
   import { Appointment } from '../models/Appointment';
   ```

2. **Bloque de auto-creación restaurado**, insertado inmediatamente después de
   `const savedRecord = await newRecord.save();` y antes de
   `return res.status(201).json(savedRecord);` dentro de `createServiceRecord`:
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

Se usaron exactamente las variables ya existentes en el scope actual de
`createServiceRecord` (confirmadas por lectura directa del archivo antes de
editar, no solo por el diff histórico de `ae1328a`):
- `finalNextTouchupDate` (línea ~39, `const finalNextTouchupDate = nextTouchupDate;`)
- `foundService` (línea ~23, `Service.findOne({ _id: service, tenantId })`)
- `tenantId` (línea ~14, `const tenantId = req.tenantId;`)
- `client`, `service`, `professional` (destructurados de `req.body`)
- `req.adminInfo!._id`

No se derivó ningún "effective service/professional" (a diferencia de
`completeAppointment`) porque en este flujo `service` y `professional` ya son
obligatorios y validados más arriba en la misma función. No se agregó
validación de solapamiento de agenda ni de horario de atención — mismo
criterio que el bloque análogo ya existente en `completeAppointment`.

El contrato de respuesta de `POST /api/registros` no cambió: sigue
devolviendo `savedRecord` directamente.

## Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```

Exit code: **0**

## Confirmación de aislamiento

`apps/server/src/controllers/appointmentController.ts` — **no modificado**.
Verificado con `git status --porcelain` sobre ambos controllers: solo
`serviceRecordController.ts` aparece en el diff.
