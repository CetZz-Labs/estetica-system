# Bitácora de Implementación — UX-02 (Backend)

**Agente:** implementer (backend) + Leader (cierre de verificación, ver nota de bloqueo abajo)
**Feature:** UX-02 — Validar hora obligatoria cuando el retoque se auto-calcula (no está en `feature_list.json`, es bugfix puntual)

## Problema
`createServiceRecord` y `completeAppointment` auto-calculaban `nextTouchupDate` sumando `defaultTouchupDays` a la fecha del servicio/turno cuando el usuario no enviaba `nextTouchupDate`, pero solo aplicaban `nextTouchupTime` a la hora resultante SI llegaba — si no llegaba, la fecha quedaba con una hora arbitraria sin avisar ni bloquear.

## Cambios

### `apps/server/src/controllers/serviceRecordController.ts` — `createServiceRecord` (líneas ~26-36)
- Se agregó `nextTouchupTime` a la destructuración del body.
- Dentro del bloque de auto-cálculo (`!finalNextTouchupDate && foundService.defaultTouchupDays > 0`), si `!nextTouchupTime` se responde `400` con `{ error: 'La hora del próximo retoque es obligatoria cuando el servicio tiene retoque automático configurado' }` antes de aplicar `setHours`.
- Se eliminó el `if (nextTouchupTime)` condicional alrededor de `date.setHours(...)`, ya que ahora es garantizado que `nextTouchupTime` existe en ese punto (por el guard anterior).
- Este guard ocurre antes del bloque de descuento de stock, por lo que no hay efectos secundarios a medias si la request se rechaza.

### `apps/server/src/controllers/appointmentController.ts` — `completeAppointment` (líneas ~211-246)
- Se adelantó la búsqueda de `serviceDoc` (antes solo se hacía dentro del bloque de auto-cálculo, después del descuento de stock) a justo después de obtener `serviceDate`.
- Se agregó el mismo guard de validación 400 (`!finalNextTouchupDate && serviceDoc?.defaultTouchupDays > 0 && !nextTouchupTime`) **antes** del bloque "Stock deduction".
- Se eliminó la segunda búsqueda redundante de `serviceDoc` que existía más abajo (para calcular `duration` del turno de retoque auto-creado); ahora se reutiliza la variable del scope superior (`serviceDoc?.duration || 60`).

## Verificación (ejecutada por el Leader — ver nota de bloqueo)
```
pnpm --filter @estetica/server build
> tsc
```
**Resultado: Exit Code 0.**

## Nota de bloqueo de herramientas
El implementer backend completó el código vía `Edit` (que sí tenía permitido), pero las herramientas `Bash` y `Write` (archivo nuevo) le fueron denegadas en su sesión, por lo que no pudo correr el build ni escribir esta bitácora. El Leader verificó el diff línea por línea, ejecutó el build con resultado Exit 0, y escribió esta bitácora en su lugar para no bloquear el cierre del ciclo.

## Archivos modificados
- `apps/server/src/controllers/serviceRecordController.ts`
- `apps/server/src/controllers/appointmentController.ts`
