# Implementación — UX-27 (backend)

**Feature:** UX-27 — Bug: el campo "próximo retoque" al registrar una visita acepta fechas pasadas
**Sandbox:** `apps/server/` (backend)
**Estado al cierre:** implementación completa, build en verde. Pendiente de `reviewer` para pasar a `"done"`.

## Archivos modificados

1. `apps/server/src/controllers/serviceRecordController.ts`
   - `createServiceRecord`: se agregó bloque de validación inmediatamente después de `const finalNextTouchupDate = nextTouchupDate;` (antes línea 38, ahora líneas 40-49 tras la inserción). Corre **antes** del descuento de stock, para fallar rápido sin efectos secundarios.
   - `updateServiceRecord`: se agregó el mismo bloque de validación justo después de la destructuración `const { serviceDate, notes, nextTouchupDate, touchupStatus } = req.body;` y antes de construir `updateData` (antes línea 172-177, ahora expandido). Se chequea explícitamente `nextTouchupDate !== undefined && nextTouchupDate !== null` porque en el update el campo es opcional-por-ausencia (whitelist pattern).

2. `apps/server/src/controllers/appointmentController.ts`
   - `completeAppointment`: se agregó el mismo bloque de validación justo después de `let finalNextTouchupDate = nextTouchupDate;` (antes línea 305) y antes del bloque de "Stock deduction", por la misma razón de fail-fast.

## Validación aplicada (idéntica en los 3 puntos)

```typescript
if (finalNextTouchupDate) { // o nextTouchupDate !== undefined && !== null en update
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (new Date(finalNextTouchupDate).getTime() < startOfToday.getTime()) {
        return res.status(400).json({ error: 'La fecha de próximo retoque no puede ser anterior al día de hoy' });
    }
}
```

## Decisiones técnicas

- **Eje de comparación:** contra "ahora" (día calendario actual), no contra `serviceDate` de la visita — regla de negocio cerrada explícitamente por el usuario en el prompt de la tarea, diverge de la recomendación original del explorer (que sugería comparar contra `serviceDate`). Se siguió la instrucción del usuario, no la del explorer.
- **Mismo día permitido:** se usa `startOfToday` (00:00:00.000 local del proceso) como umbral, y se rechaza solo si `nextTouchupDate < startOfToday`. Esto permite guardar una fecha de retoque en el día de hoy aunque la hora exacta ya haya pasado.
- **Estilo replicado de UX-12:** status 400 + `{ error: '...' }` inline en el controller (no en la ruta con `express-validator`), igual que `appointmentController.ts` líneas ~81-84/192-195. No se reutilizó la comparación de UX-12 (`Date.now()` estricto) porque el eje pedido para UX-27 es "día calendario", un chequeo distinto.
- **No se tocó:** `handleUseSuggestedDate` (frontend, fuera de sandbox), la lógica de auto-completado de retoques UX-13 (`updateMany` con `nextTouchupDate: { $lte: ... }`), `checkBusinessHours`, ni la validación de fecha pasada de UX-12 sobre `startTime` de turnos.
- **Placement fail-fast:** en los 3 controllers la validación se insertó antes de cualquier mutación de stock/DB, para que un `nextTouchupDate` inválido no descuente stock ni cierre retoques antes de rechazar la request.

## Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```
Exit code 0, sin errores ni warnings de TypeScript.

## Pendiente (fuera de este sandbox)

- Frontend (`RegistroModal.tsx`): validación inline + mensaje sin duplicar en toast — corresponde a un implementer de frontend, no incluido en esta tarea.

## Fix post-review: timezone

**Veredicto del reviewer:** CHANGES_REQUESTED (`progress/reviews/review_UX-27.md`).

### Diagnóstico

La validación original calculaba "hoy" con `new Date(); setHours(0,0,0,0)`. Este patrón ancla el día calendario a la **zona horaria del proceso Node del servidor** (UTC en despliegues típicos, ej. Vercel), no a `tenant.timezone` (`apps/server/src/models/Tenant.ts`, default `'America/Argentina/Buenos_Aires'`). El propio `appointmentController.ts` ya resolvía este mismo problema en `checkBusinessHours` (líneas 10-24) usando `tenant.timezone` + `toLocaleDateString('en-CA', { timeZone: tz })`, patrón que la validación de UX-27 no reutilizó.

**Reproducción del reviewer:** con el servidor en `TZ=UTC`, durante la ventana ~21:00-23:59 hora Argentina el calendario UTC del servidor ya cruzó la medianoche pero el del tenant no. Un `nextTouchupDate` = "hoy" para el tenant (con hora ya pasada) se rechazaba erróneamente como si fuera "ayer", violando la regla de negocio #2 ("mismo día calendario permitido").

### Corrección aplicada

1. **Nuevo util puro** `apps/server/src/utils/dateUtils.ts`:
   - `toLocalDateString(date, timezone)`: envuelve `date.toLocaleDateString('en-CA', { timeZone: timezone })` (mismo patrón que `checkBusinessHours`), devuelve `YYYY-MM-DD`.
   - `isBeforeCalendarDay(date, referenceDate, timezone)`: compara los dos `YYYY-MM-DD` resultantes como strings (`dateStr < referenceStr`), evitando comparar instantes `Date`/`setHours`. Sin dependencias de Express/Mongoose — cumple la convención de `src/utils/` del §2 de `backend.md`.
   - Se extrajo a un util compartido (en vez de repetir el patrón 3 veces) porque los 3 call sites viven en 2 archivos distintos (`serviceRecordController.ts`, `appointmentController.ts`) y la lógica de comparación de día calendario es idéntica en los tres.

2. **`apps/server/src/controllers/serviceRecordController.ts`:**
   - Import agregado: `import { Tenant } from '../models/Tenant';` y `import { isBeforeCalendarDay } from '../utils/dateUtils';`.
   - `createServiceRecord`: ya tenía `const tenantId = req.tenantId;` en scope (usado para los lookups de `Client`/`Service`/`Professional`) — no se duplicó ninguna query nueva de más de lo necesario; se agregó `const tenant = await Tenant.findById(tenantId);` inmediatamente dentro del bloque `if (finalNextTouchupDate)` (no incondicional, para no pagar el costo de la query cuando no hay `nextTouchupDate`).
   - `updateServiceRecord`: no había ningún `tenant`/`tenantId` en variable local previa (solo `req.tenantId` inline en el `findOneAndUpdate` final) — se agregó `const tenant = await Tenant.findById(req.tenantId);` dentro del bloque condicional de validación.
   - Ambos puntos reemplazan `new Date(); setHours(0,0,0,0)` + comparación de `.getTime()` por `isBeforeCalendarDay(new Date(nextTouchupDate/finalNextTouchupDate), new Date(), tz)`, con `tz = tenant?.timezone || 'America/Argentina/Buenos_Aires'` (mismo fallback que `checkBusinessHours`).

3. **`apps/server/src/controllers/appointmentController.ts`:**
   - Import agregado: `import { isBeforeCalendarDay } from '../utils/dateUtils';` (`Tenant` ya estaba importado para `checkBusinessHours`).
   - `completeAppointment`: no llama a `checkBusinessHours` (esa función solo se invoca desde `createAppointment` y `updateAppointment`, confirmado por grep — no hay `tenant` disponible en este flujo), así que se agregó `const tenant = await Tenant.findById(req.tenantId);` dentro del bloque `if (finalNextTouchupDate)`, sin duplicar ninguna query preexistente.

4. **Regla de negocio intacta:** en los 3 puntos se sigue comparando contra "ahora" (`new Date()`), no contra `serviceDate`; "mismo día calendario" sigue siendo válido aunque la hora ya haya pasado — solo cambió la zona horaria de referencia del cálculo de "hoy" y de `nextTouchupDate` (ambos ahora evaluados en `tenant.timezone` en vez de la TZ del proceso).

### Verificación del caso límite (script ad-hoc, no persistido en el repo)

Se ejecutó un script Node temporal (`TZ=UTC`) replicando el escenario del reviewer: `nowUTC = 2026-07-11T01:50:00.000Z` (22:50 Argentina del 10/07), `nextTouchupDate = 2026-07-10T11:00:00.000Z` (08:00 Argentina del 10/07, "hoy" para el tenant).

```
process.env.TZ = UTC
nowUTC                = 2026-07-11T01:50:00.000Z
todayLocal (tenant)   = 2026-07-10
nextTouchupDate       = 2026-07-10T11:00:00.000Z
nextTouchupLocal      = 2026-07-10
Rejected (bug if true)? -> false
PASS: nextTouchupDate = hoy (tenant) se acepta aunque el servidor ya cruzó medianoche UTC.
Control (ayer real, debe rechazar) -> true
```

Resultado: el caso límite ya no se rechaza (antes daba `true`/bug); el caso de control (fecha genuinamente pasada para el tenant) sigue rechazándose correctamente.

### Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```
Exit code 0, sin errores de TypeScript.

### Archivos modificados en este fix

- `apps/server/src/utils/dateUtils.ts` (nuevo)
- `apps/server/src/controllers/serviceRecordController.ts` (imports + `createServiceRecord` + `updateServiceRecord`)
- `apps/server/src/controllers/appointmentController.ts` (import + `completeAppointment`)
