# Implementación — UX-13 (Backend)

**Feature:** UX-13 — Retoques futuros ocultos cuando existe un retoque pendiente
**Sandbox:** `apps/server/` (exclusivo backend)
**Timestamp:** 2026-07-06

## Diagnóstico de partida

Ver `progress/explores/explore_UX-13.md`. Causa raíz: el `updateMany` de auto-completado de retoques pendientes (cliente+servicio) en dos controllers no comparaba `nextTouchupDate` contra la fecha de la nueva visita, cerrando también retoques futuros legítimos.

## Archivos modificados

### 1. `apps/server/src/controllers/serviceRecordController.ts`

Función `createServiceRecord`, bloque de auto-completado (línea ~61-76 tras el cambio). Se agregó `nextTouchupDate: { $lte: new Date(serviceDate) }` al filtro del `updateMany`, comparando contra la `serviceDate` de la nueva visita (viene del body, string ISO — se envuelve en `new Date(...)` para la comparación Mongo).

```typescript
// ⭐️ 3. LÓGICA DE AUTO-COMPLETADO DE RETOQUES (NUEVO)
// Buscamos si el cliente tenía retoques pendientes para este mismo servicio y los cerramos.
// UX-13: solo se auto-completan los retoques cuya fecha (nextTouchupDate) ya fue superada
// por esta nueva visita (anterior o igual a serviceDate). Un retoque pendiente con fecha
// futura respecto a esta visita debe permanecer intacto ('pending').
await ServiceRecord.updateMany(
    {
        tenantId: tenantId,
        client: client,
        service: service,
        touchupStatus: 'pending',
        nextTouchupDate: { $lte: new Date(serviceDate) }
    },
    {
        $set: { touchupStatus: 'completed' }
    }
);
```

### 2. `apps/server/src/controllers/appointmentController.ts`

Función `completeAppointment`, bloque de auto-completado (línea ~324-336 tras el cambio). Se agregó `nextTouchupDate: { $lte: serviceDate }`, donde `serviceDate` ya es `appointment.startTime` (objeto `Date` nativo, resuelto más arriba en la función — no requiere wrap adicional).

```typescript
// Auto-complete previous pending touchups for this client+service
// UX-13: solo se auto-completan los retoques cuya fecha (nextTouchupDate) ya fue superada
// por esta visita (anterior o igual a serviceDate). Un retoque pendiente con fecha futura
// respecto a esta visita debe permanecer intacto ('pending').
await ServiceRecord.updateMany(
    {
        tenantId: req.tenantId,
        client: appointment.client,
        service: effectiveService,
        touchupStatus: 'pending',
        nextTouchupDate: { $lte: serviceDate }
    },
    { $set: { touchupStatus: 'completed' } }
);
```

## Comportamiento verificado por lectura de código

- Retoque pendiente con `nextTouchupDate` anterior o igual a la fecha de la nueva visita → se auto-completa (comportamiento previo preservado, criterio EP-05 intacto).
- Retoque pendiente con `nextTouchupDate` posterior a la fecha de la nueva visita → queda `pending`, sigue visible en `getUpcomingTouchups` (dashboard).
- No se tocó ninguna otra lógica: multi-tenancy (`tenantId` en ambos filtros, sin cambios), cálculo de `finalNextTouchupDate`, descuento de stock, creación del nuevo `ServiceRecord`/`Appointment` de retoque automático.

## Build

```
pnpm --filter @estetica/server build
```
Resultado: exit code 0 (`tsc` sin output, sin errores).

## Dudas / notas para el reviewer

1. **Nombre del campo de fecha difiere entre controllers pero es equivalente:** en `serviceRecordController.ts` es `serviceDate` (string ISO del body, se envuelve con `new Date(...)`); en `appointmentController.ts` es la variable local `serviceDate = appointment.startTime` (ya `Date`). Ambos representan "la fecha de la visita que se está registrando", consistente con el criterio de aceptación.
2. **Caso borde `nextTouchupDate` null/undefined en registros `pending` existentes:** noté (leyendo `createServiceRecord`, línea ~84-86 antes del cambio) que un `ServiceRecord` nuevo se crea con `touchupStatus: 'pending'` **incluso si `finalNextTouchupDate` es `undefined`** (no hay validación previa que lo exija). Con el filtro `$lte` agregado, esos registros `pending` sin `nextTouchupDate` **ya no serán auto-completados nunca** por una visita posterior (antes sí se cerraban, sin importar la fecha). Esto es consistente con la letra del criterio de aceptación de UX-13 ("solo se auto-completan... cuya fecha... sea anterior o igual"), pero es un cambio de comportamiento observable que no estaba explícitamente contemplado en el diagnóstico. Si el reviewer considera que esto genera retoques "pending" huérfanos sin fecha que ya no se pueden cerrar automáticamente, podría ser candidato a una feature separada (validar que `nextTouchupDate` sea obligatorio cuando `touchupStatus` nace `pending`), fuera del alcance quirúrgico de este fix.
3. **No se extrajo a un service compartido** (`src/services/`) pese a que el `explorer` lo sugería como mejora — se mantuvo el alcance "ajuste quirúrgico en ambos lugares" según instrucción explícita de la tarea, para no exceder el criterio de aceptación #3 ("El fix se aplica de forma consistente en ambos controllers", sin mencionar refactor). Si se desea eliminar la duplicación, sugiero tratarlo como tech-debt item separado.
4. **No se agregó test automatizado** para el escenario (b) mencionado en el explore (dos registros mismo cliente+servicio, uno vencido y otro futuro) — no estaba en el alcance de la tarea asignada (solo backend, filtro quirúrgico). Queda como sugerencia para el reviewer o una feature de testing futura.
