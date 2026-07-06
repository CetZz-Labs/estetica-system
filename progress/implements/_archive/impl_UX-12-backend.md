# impl_UX-12-backend.md — Validación de fecha/hora al crear turnos (Backend)

## Feature
UX-12 — Validación de fecha/hora al crear turnos. Alcance backend: bloquear creación y edición de turnos con fecha/hora anterior al momento actual. No se tocó la lógica de superposición existente (correcta, limitación conocida ya aceptada como riesgo de producto: no corre sin `professional` asignado).

## Archivo modificado
- `apps/server/src/controllers/appointmentController.ts`

## Cambios

### 1. `createAppointment` (tras calcular `startDate`/`endDate`, antes del chequeo de solapamiento)
```typescript
const startDate = new Date(startTime);
const endDate = new Date(startDate.getTime() + duration * 60000);

// Regla de negocio (UX-12): no se puede agendar un turno en el pasado.
if (startDate.getTime() < Date.now()) {
    return res.status(400).json({ error: 'No se puede agendar un turno en una fecha u hora pasada' });
}

// Verificar solapamiento solo si hay profesional asignada.
```

### 2. `updateAppointment` (justo después del chequeo de existencia del turno, antes de validar profesional/servicio)
```typescript
const existing = await Appointment.findOne({ _id: id, tenantId: req.tenantId, isActive: true });
if (!existing) {
    return res.status(404).json({ error: 'Turno no encontrado' });
}

// Regla de negocio (UX-12): no se puede reprogramar un turno a una fecha u hora pasada.
if (startTime && new Date(startTime).getTime() < Date.now()) {
    return res.status(400).json({ error: 'No se puede reprogramar un turno a una fecha u hora pasada' });
}

// EP-11: si se reasigna la profesional, validar pertenencia al tenant + activa
```

`startTime` es opcional en `updateAppointment` (solo se valida cuando el body lo incluye — actualizar solo `notes`/`status`/etc. sigue funcionando sin este chequeo).

## Decisión técnica: dónde vive la validación
Se optó por dejar la validación **en el controller** (no en `express-validator`/`appointmentRoutes.ts`), por consistencia con el chequeo de solapamiento existente en el mismo archivo (mismo estilo: regla de negocio → `400` descriptivo dentro del controller, siguiendo el patrón P7 de `docs/patterns-backend.md`). `express-validator` en las rutas solo valida formato (`isISO8601()`), no reglas de negocio dependientes de `Date.now()` en tiempo de request — mantenerlo así evita duplicar lógica de negocio entre capas.

## `completeAppointment` — nota para el reviewer (ambigüedad, no se tocó)
`completeAppointment` (línea ~268) crea un turno de retoque automático (`touchupAppointment`, línea ~352) usando `finalNextTouchupDate`, que puede venir del body (`nextTouchupDate`) al registrar la visita. Ese campo es ingresado por el usuario al completar el turno actual (no es "siempre futuro" por construcción — nada impide que un usuario cargue una fecha de retoque pasada por error). Sin embargo, **no apliqué la validación UX-12 acá** porque:
1. Está fuera del alcance explícito de la tarea (creación/edición de turnos vía `createAppointment`/`updateAppointment`).
2. `nextTouchupDate` en este flujo es conceptualmente un dato de "próximo retoque sugerido", no una acción directa de agendar/reprogramar un turno por el usuario en el calendario.

Si el criterio de aceptación quisiera cubrir también este caso, se necesitaría una decisión de producto explícita (mensaje adicional, y confirmar que no rompe registros retroactivos de visitas con retoques ya vencidos que el usuario quiera marcar manualmente).

## Build
```
pnpm --filter @estetica/server build
```
Resultado: **Exit Code 0**, sin errores de compilación.

## Multi-tenancy
No se tocaron queries de `tenantId` — la validación agregada es puramente temporal (`Date.now()`), no involucra lookups de negocio.
