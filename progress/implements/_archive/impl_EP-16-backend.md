# Bitácora de Implementación — EP-16 Backend

**Feature:** EP-16 — Configuración de disponibilidad del negocio
**Sandbox:** apps/server
**Fecha:** 2026-06-30

---

## Archivos modificados

| Acción | Archivo |
|--------|---------|
| Modificado | `apps/server/src/models/Tenant.ts` |
| Creado | `apps/server/src/controllers/disponibilidadController.ts` |
| Creado | `apps/server/src/routes/disponibilidadRoutes.ts` |
| Modificado | `apps/server/src/server.ts` |
| Modificado | `apps/server/src/controllers/appointmentController.ts` |

---

## Cambios por archivo

### `apps/server/src/models/Tenant.ts`
- Exportadas las interfaces `IDaySchedule`, `IBlockedDate`, `IBusinessHours`.
- Agregado `businessHours?: IBusinessHours` a la interfaz `ITenant`.
- Agregado el campo `businessHours` al `TenantSchema` con subdoc arrays `schedule` y `blockedDates`, ambos con `_id: false`.

### `apps/server/src/controllers/disponibilidadController.ts` (nuevo)
- Constante `DEFAULT_SCHEDULE` (Lun–Sáb 09:00–18:00, salvo Sáb 09:00–14:00, Dom cerrado).
- `getDisponibilidad` (GET): devuelve el horario guardado si `schedule.length === 7`, o el DEFAULT si no hay configuración.
- `updateDisponibilidad` (PUT): whitelist de campos, validación de `schedule.length === 7` con 400 descriptivo, `$set` de claves individuales `businessHours.schedule` / `businessHours.blockedDates`, devuelve el businessHours actualizado.

### `apps/server/src/routes/disponibilidadRoutes.ts` (nuevo)
- GET `/` → `getDisponibilidad`.
- PUT `/` con validación express-validator: `schedule` array `{min:7, max:7}`, campos de subdoc (`day` int 0–6, `isOpen` boolean, `openTime`/`closeTime` regex `HH:MM`), `blockedDates` array con `date` regex `YYYY-MM-DD`.

### `apps/server/src/server.ts`
- Import de `disponibilidadRoutes`.
- Montaje: `app.use('/api/disponibilidad', checkAdminAccess, checkTenantAccess, requireRole('ADMIN'), disponibilidadRoutes)` — mismo patrón que `/api/negocio`.

### `apps/server/src/controllers/appointmentController.ts`
- Import de `Tenant`.
- Helper privado `checkBusinessHours(tenantId, startDate, endDate)`: resuelve timezone del tenant, convierte horarios a minutos, verifica día abierto, rango horario y fechas bloqueadas. Retorna `string | null` (null = sin restricción configurada o schedule incompleto).
- `createAppointment`: llamada a `checkBusinessHours` con `req.tenantId!.toString()` justo antes de crear el `Appointment`.
- `updateAppointment`: llamada a `checkBusinessHours` después del overlap check, condicionada a `startTime && newEndTime`.

---

## Decisiones técnicas

1. **Fallback a DEFAULT_SCHEDULE:** si el tenant no tiene `businessHours` configurado (usuarios existentes), `getDisponibilidad` devuelve el horario por defecto en vez de 404, permitiendo que el frontend muestre un estado inicial coherente sin que el negocio deba configurar antes de usar turnos.

2. **`findByIdAndUpdate` en `updateDisponibilidad`:** el Tenant es el propio recurso del tenant autenticado (`req.tenantId`), por lo que no aplica el patrón anti-IDOR de `findOne({ _id, tenantId })`. El `tenantId` ya está resuelto por `checkTenantAccess`.

3. **Validación de `schedule.length === 7` en dos capas:** express-validator en la ruta (`isArray({ min: 7, max: 7 })`) y guard explícito en el controller como segunda línea de defensa.

4. **Helper `checkBusinessHours` como función privada (no exportada):** solo la consumen `createAppointment` y `updateAppointment` en el mismo archivo. Evita surface de API innecesaria y acoplamientos cruzados.

5. **`completeAppointment` no valida horario:** el turno ya existe cuando se completa; validar horario en completado no aporta valor de negocio y puede bloquear registros legítimos de servicios fuera de horario.

---

## Resultado del build

```
> @estetica/server@1.0.0 build
> tsc

EXIT_CODE: 0
```

Build completado sin errores TypeScript.
