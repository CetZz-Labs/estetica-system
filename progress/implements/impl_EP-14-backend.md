# Implementación EP-14 — Backend (Appointments)

## Resumen

Se implementó el backend completo para la gestión de turnos (appointments) en Maison CRM, incluyendo modelo Mongoose, controlador CRUD con validación de superposición horaria, rutas protegidas y documentación de esquema.

## Archivos Modificados

1. **`apps/server/src/models/Service.ts`**
   - Añadido campo `duration: Number` (opcional, default 60) → duración del servicio en minutos, usado para calcular `endTime` del turno

2. **`apps/server/src/server.ts`**
   - Añadido import de `appointmentRoutes`
   - Añadida ruta `app.use('/api/turnos', checkAdminAccess, checkTenantAccess, appointmentRoutes)`

3. **`docs/db-schema.md`**
   - Añadida documentación completa de la colección `appointments` (campos, tipos, índices, reglas de negocio)
   - Añadidas relaciones al diagrama de referencias
   - Añadidos índices de appointments al resumen de índices
   - Actualizado contador de colecciones (6 → 7)

## Archivos Creados

4. **`apps/server/src/models/Appointment.ts`**
   - Modelo Mongoose con campos: `tenantId`, `client`, `service`, `professional`, `startTime`, `endTime`, `status` (enum), `notes`, `cancelReason`, `cancelledAt`, `cancelledBy`, `createdBy`, `isActive`
   - 3 índices compuestos para consultas de calendario, historial por cliente y validación de superposición

5. **`apps/server/src/controllers/appointmentController.ts`**
   - `createAppointment`: validación de campos, cálculo de `endTime` desde `service.duration`, overlap check con 409, creación con `createdBy`
   - `getAppointments`: filtro por rango de fechas, profesional, estado; populate de client/service/professional
   - `getAppointmentById`: find por id + tenantId, populate, 404 si no encontrado
   - `updateAppointment`: recálculo de `endTime` si cambia startTime/service, overlap check si cambia professional/startTime, $set whitelist
   - `cancelAppointment`: set status=cancelled, cancelReason, cancelledAt, cancelledBy
   - `getClientAppointments`: filtro por clientId + tenantId + status opcional, sort descendente

6. **`apps/server/src/routes/appointmentRoutes.ts`**
   - POST `/` → createAppointment (validación: isMongoId para client/service/professional, isISO8601 para startTime)
   - GET `/` → getAppointments (validación opcional: startDate, endDate, professional, status)
   - GET `/client/:clientId` → getClientAppointments
   - GET `/:id` → getAppointmentById
   - PUT `/:id` → updateAppointment
   - PATCH `/:id/cancel` → cancelAppointment
   - Todas las rutas protegidas con `checkAdminAccess` + `checkTenantAccess`

## Detalles Técnicos

- **Overlap check**: Query que busca appointments del mismo `tenantId` + `professional` + `isActive: true` + status `pending`/`confirmed` donde `startTime < newEndTime AND endTime > newStartTime`
- **Anti mass-assignment**: `updateAppointment` usa `$set` con whitelist explícita (no se pasa req.body directo)
- **endTime automático**: Se calcula como `startTime + service.duration * 60000` (milisegundos)
- **Ruta base**: `/api/turnos` (protegida con autenticación Clerk + aislamiento multi-tenant)
