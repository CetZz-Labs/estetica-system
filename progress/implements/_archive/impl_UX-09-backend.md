# Bitácora Backend — UX-09

## Feature en curso
UX-09 — Control de retoque: eliminar auto-cálculo de `nextTouchupDate` y exponer endpoint de próximos turnos.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `apps/server/src/controllers/serviceRecordController.ts` | Cambio A |
| `apps/server/src/controllers/appointmentController.ts` | Cambio B + C.1 |
| `apps/server/src/routes/appointmentRoutes.ts` | Cambio C.2 |

## Detalle de cambios

### Cambio A — `serviceRecordController.ts`
Eliminado el bloque `if (!finalNextTouchupDate && foundService.defaultTouchupDays > 0)` completo (incluía lookup de `lastAppointment` para copiar la hora). Reemplazado por asignación directa:
```typescript
const finalNextTouchupDate = nextTouchupDate;
```
Todo el flujo posterior (descuento de stock, `updateMany` de retoques, creación del `ServiceRecord`, creación del `Appointment` de retoque cuando `finalNextTouchupDate` existe) permanece intacto.

### Cambio B — `appointmentController.ts` / `completeAppointment`
Eliminado el bloque `if (!finalNextTouchupDate && serviceDoc && serviceDoc.defaultTouchupDays > 0)` (líneas ~249-254 del original). La línea `let finalNextTouchupDate = nextTouchupDate;` se mantiene. Todo lo que sigue (stock, ServiceRecord, completion, auto-create touchup appointment) permanece intacto.

### Cambio C.1 — `appointmentController.ts` / nueva función
Agregada al final del archivo:
```typescript
export const getUpcomingAppointments = async (req: Request, res: Response) => { ... }
```
Devuelve turnos `pending`/`confirmed` con `startTime` entre ahora y +30 días, ordenados ASC, límite 7. Filtra por `tenantId`. Popula `client`, `service` y `professional`.

### Cambio C.2 — `appointmentRoutes.ts`
- Añadido `getUpcomingAppointments` al import destructurado del controller.
- Agregada ruta `GET /proximos` **antes** de `GET /:id` para evitar que el param dinámico la intercepte:
```typescript
router.get('/proximos', getUpcomingAppointments);
```

## Verificaciones post-edición

- Grep `if (!finalNextTouchupDate && .*defaultTouchupDays` en `apps/server/src/controllers/`: **0 matches** — bloques eliminados correctamente.
- Grep `getUpcomingAppointments` en `apps/server/src/`: aparece en `appointmentController.ts` (definición, línea 377) y en `appointmentRoutes.ts` (import línea 13, ruta línea 80).

## Build
No ejecutado por instrucción explícita del Leader (delegado al reviewer).
