# impl_EP-11-fix-backend

## Resumen del cambio

Corrige una asimetría de API en `professionalController.ts`: la baja de una profesional vía
`PUT /api/profesionales/:id` (con `isActive: false`) no verificaba turnos futuros
pendientes/confirmados antes de desactivarla, a diferencia de `DELETE /api/profesionales/:id`
que sí lo hacía. Ahora ambos caminos comparten la misma lógica de guard.

### Cambios

1. **Factorización:** se extrajo la query inline de `deleteProfessional` (turnos futuros con
   `status` en `['pending','confirmed']`, `isActive: true`, `startTime >= new Date()`, populate
   de `client`/`service`) a una función privada reutilizable:

   ```typescript
   const findFutureAppointments = async (tenantId: Types.ObjectId | undefined, professionalId: string) => {
       const futureAppointments = await Appointment.find({
           tenantId,
           professional: professionalId,
           isActive: true,
           status: { $in: ['pending', 'confirmed'] },
           startTime: { $gte: new Date() }
       })
           .select('_id client service startTime')
           .populate('client', 'firstName lastName')
           .populate('service', 'name')
           .sort({ startTime: 1 });

       return futureAppointments.map((appt) => ({
           _id: appt._id,
           client: appt.client,
           service: appt.service,
           startTime: appt.startTime
       }));
   };
   ```

   Definida justo después de los imports (líneas ~9-28), antes de `createProfessional`.

2. **`deleteProfessional`** (líneas ~229-262): el bloque inline de la query fue reemplazado por
   una llamada a `findFutureAppointments(req.tenantId, id)`. Comportamiento sin cambios (mismo
   shape de respuesta 409, mismo flag `confirm`).

3. **`updateProfessional`** (líneas ~165-227): se agregó:
   - `const confirm = req.body?.confirm === true;` (leído por separado, no persistido, igual que
     en `deleteProfessional`).
   - Guard nuevo justo después de desestructurar el body y antes de la validación de
     `linkedAdmin`:
     ```typescript
     if (isActive === false && !confirm) {
         const futureAppointments = await findFutureAppointments(req.tenantId, id);
         if (futureAppointments.length > 0) {
             return res.status(409).json({
                 error: 'La profesional tiene turnos futuros asignados. Reasignalos o confirmá la baja.',
                 futureAppointments
             });
         }
     }
     ```
   - Usa comparación estricta (`isActive === false`), por lo que `isActive` ausente o `true`
     (reactivación) no dispara el guard — comportamiento sin cambios en esos casos.
   - El resto del flujo (whitelist a `$set` con `name`, `color`, `linkedAdmin`, `isActive`,
     `findOneAndUpdate` con `{ _id, tenantId }`) queda intacto; `confirm` nunca se agrega al
     `$set`.

### Import agregado

- `import { Types } from 'mongoose';` — para tipar el parámetro `tenantId` del helper como
  `Types.ObjectId | undefined` (coincide con `req.tenantId` declarado en
  `middlewares/authMiddleware.ts`).

## Archivos modificados

- `apps/server/src/controllers/professionalController.ts`

## Resultado del build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```

Exit code 0. Sin errores de TypeScript.

## Notas para el reviewer

- No se tocó `deleteProfessionalRoutes` ni ninguna ruta — el whitelist anti mass-assignment y el
  patrón `findOne`/`findOneAndUpdate` con `{ _id, tenantId }` se mantienen sin cambios.
- No se agregaron dependencias nuevas (solo un import de un módulo ya presente en el workspace,
  `mongoose`).
- El frontend hoy no manda `isActive: false` por PUT (solo usa DELETE), por lo que este fix no
  debería alterar comportamiento observable actual — es una corrección de defensa en profundidad
  de la API.
