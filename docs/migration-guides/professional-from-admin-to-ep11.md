# Migración: `professional` de admin autenticado → seleccionable (EP-11/12)

## Contexto

Durante EP-14 (Fase 4), el campo `professional` del modelo `Appointment` se asigna automáticamente con `req.adminInfo!._id` (el admin autenticado). Esto es correcto temporalmente porque EP-11/12 (Gestión de usuarios y roles) no existe aún — solo hay un usuario por tenant.

Cuando se implemente EP-11/12, el sistema tendrá múltiples profesionales (estilistas) por tenant, y el creador del turno (recepcionista) deberá poder seleccionar quién realiza el servicio.

## Qué cambiar en EP-11/12

### Backend

1. **`apps/server/src/controllers/appointmentController.ts`**
   - Línea actual: `const professionalId = req.adminInfo!._id;`
   - Debe cambiarse a: leer `professional` del body (como venía en el request)
   - Agregar validación de que el `professional` existe y tiene rol `PROFESSIONAL` o `ADMIN` en el mismo tenant

2. **`apps/server/src/routes/appointmentRoutes.ts`**
   - Agregar de vuelta `body('professional').isMongoId()` en POST
   - Ya existe en PUT (se mantiene igual)

### Frontend

3. **`apps/client/src/views/Turnos.tsx`**
   - Agregar un selector de profesional en el formulario de creación/edición de turnos
   - El selector debe listar admins con rol `PROFESSIONAL` o `ADMIN` del tenant actual

4. **`apps/client/src/api/appointmentApi.ts`**
   - Agregar `professional: string` de vuelta a `AppointmentFormData`

### Validaciones adicionales

5. El overlap check (`appointmentController.ts`) ya filtra por `professional` — funcionará correctamente cuando el valor sea seleccionable.

6. El filtro por profesional en el calendario (`Turnos.tsx` línea con `professionalFilter`) — debería listar los nombres reales de los profesionales, no solo emails extraídos de appointments existentes.

## Referencias

- Modelo: `apps/server/src/models/Appointment.ts` → campo `professional` (ref Admin)
- Controller: `apps/server/src/controllers/appointmentController.ts` → `const professionalId = req.adminInfo!._id;`
- Frontend: `apps/client/src/views/Turnos.tsx` → form oculta el selector de professional
