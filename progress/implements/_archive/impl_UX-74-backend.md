# impl_UX-74-backend — Bug: no se puede registrar una visita con fecha de hoy

## Resumen del fix

En `apps/server/src/controllers/serviceRecordController.ts` (`createServiceRecord`), el guard
de "serviceDate no puede ser anterior a hoy" (UX-69) usaba `isBeforeCalendarDay(new Date(serviceDate), new Date(), tz)`.

`serviceDate` llega siempre como string date-only `'YYYY-MM-DD'` (input `type="date"` del
frontend, sin hora/offset). `new Date('YYYY-MM-DD')` ancla el instante a medianoche UTC; al
reformatear ese instante en la timezone del tenant (ej. Argentina, UTC-3) dentro de
`isBeforeCalendarDay`, el día calendario retrocedía uno (medianoche UTC del día X = 21:00 del
día X-1 en Argentina). Esto hacía que "hoy" se evaluara siempre como "ayer" y se rechazara el
registro de visitas con fecha actual.

Fix: se reemplazó la construcción de `Date` para este guard puntual por una comparación de
strings directa entre `serviceDate` (ya `'YYYY-MM-DD'`) y `toLocalDateString(new Date(), tz)`
(helper ya existente en `apps/server/src/utils/dateUtils.ts`, mismo import que ya usaba el
archivo para `isBeforeCalendarDay`). Al ser ambos strings en formato ISO `YYYY-MM-DD`, la
comparación lexicográfica (`<`) es equivalente a comparación cronológica de días calendario.

El guard de `nextTouchupDate` (UX-27, líneas ~65-73 de `createServiceRecord`, y su análogo en
`updateServiceRecord` ~264-270) **no se tocó**: ese campo sí llega con hora/offset real
(`new Date(...).toISOString()` desde el frontend, patrón UX-14/UX-17) y `isBeforeCalendarDay`
sigue siendo correcto ahí.

## Diff conceptual (antes/después)

**Import:**
```diff
-import { isBeforeCalendarDay } from '../utils/dateUtils';
+import { isBeforeCalendarDay, toLocalDateString } from '../utils/dateUtils';
```

**Guard de serviceDate (createServiceRecord):**
```diff
+        // UX-74: serviceDate llega SIEMPRE como string date-only 'YYYY-MM-DD' (input type="date").
+        // A diferencia de nextTouchupDate (que sí trae hora/offset real), `new Date(serviceDate)`
+        // ancla a medianoche UTC y, al reformatear en `tz` (ej. Argentina UTC-3), retrocede un día
+        // calendario — por eso NO se usa isBeforeCalendarDay acá: se compara el string directamente
+        // contra el día de hoy en la timezone del tenant.
         const backfillFlag = isBackfill === true || isBackfill === 'true';
+        const todayLocalStr = toLocalDateString(new Date(), tz);
+        const serviceDateStr = String(serviceDate);
         if (!backfillFlag) {
-            if (isBeforeCalendarDay(new Date(serviceDate), new Date(), tz)) {
+            if (serviceDateStr < todayLocalStr) {
                 return res.status(400).json({ error: 'La fecha del servicio no puede ser anterior al día de hoy' });
             }
         } else {
-            if (!isBeforeCalendarDay(new Date(serviceDate), new Date(), tz)) {
+            if (!(serviceDateStr < todayLocalStr)) {
                 return res.status(400).json({ error: 'Una visita pasada debe tener una fecha anterior a hoy' });
             }
         }
```

No se modificó nada más: el guard de `nextTouchupDate` (UX-27) y `updateServiceRecord` quedan
intactos, tal como especifica el acceptance criteria.

## Verificación mental del caso concreto

Tenant timezone `'America/Argentina/Buenos_Aires'` (UTC-3), `serviceDate = '2026-08-20'`
(enviado como "hoy"):
- `todayLocalStr = toLocalDateString(new Date(), tz)` → `'2026-08-20'` (asumiendo que "ahora" es
  20/08/2026 en esa timezone).
- `serviceDateStr = '2026-08-20'`.
- `serviceDateStr < todayLocalStr` → `'2026-08-20' < '2026-08-20'` → `false` → NO se rechaza.

Con el flujo `isBackfill=true` y `serviceDate` de un día anterior (ej. `'2026-08-19'`):
`'2026-08-19' < '2026-08-20'` → `true` → `!(true)` → `false` → NO se rechaza (comportamiento
correcto: visita pasada válida).

## Resultado del build

```
> @estetica/server@1.0.0 build
> tsc
```
Exit code 0.

## Archivos modificados

- `apps/server/src/controllers/serviceRecordController.ts`

---

## ADENDA — Fix de CHANGES_REQUESTED (reviewer, 2026-08-20)

### Qué estaba mal en el intento anterior

La premisa "`serviceDate` llega siempre como string date-only `'YYYY-MM-DD'`" al controller era
**falsa**. `apps/server/src/routes/serviceRecordRoutes.ts` aplicaba `.toDate()` como sanitizer de
`express-validator` sobre `serviceDate` en AMBAS rutas (`POST /` línea 71, `PUT /:id` línea 95),
mutando `req.body.serviceDate` a una instancia real de `Date` **antes** de que el controller la
viera. Por lo tanto `String(serviceDate)` en el guard producía la salida de
`Date.prototype.toString()` (ej. `"Wed Aug 19 2026 21:00:00 GMT-0300..."`), no `'YYYY-MM-DD'`.
Como ese string siempre arranca con una letra (día de semana) y `todayLocalStr` siempre arranca
con un dígito, la comparación lexicográfica `serviceDateStr < todayLocalStr` era estructuralmente
`false` para cualquier fecha — el guard no-backfill quedaba inutilizado (aceptaba cualquier fecha
pasada sin `isBackfill`) y el guard backfill quedaba roto al revés (rechazaba siempre, incluso con
fechas pasadas legítimas). `tsc` no detecta el bug porque `string < string` es válido en
TypeScript sin mirar el contenido en runtime.

### Fix real aplicado

Se eliminó el sanitizer `.toDate()` de los dos validators de `serviceDate` en
`apps/server/src/routes/serviceRecordRoutes.ts` (ambos siguen validando el formato con
`isISO8601()`, sin cambios ahí):

- Línea 71 (POST `/`): `body('serviceDate').isISO8601().withMessage('La fecha del servicio (serviceDate) es obligatoria y debe tener formato ISO 8601')` — sin `.toDate()`.
- Línea 95 (PUT `/:id`): `body('serviceDate').optional().isISO8601().withMessage('serviceDate debe tener formato ISO 8601')` — sin `.toDate()`.

El `.toDate()` de `nextTouchupDate` en ambas rutas **no se tocó** — ese campo sí necesita
convertirse a `Date` real porque el controller lo usa como instante contra `isBeforeCalendarDay`.

Con esto, `req.body.serviceDate` llega al controller como el string ISO original enviado por el
frontend (`'YYYY-MM-DD'`), y el guard de comparación de strings (`serviceDateStr < todayLocalStr`)
introducido en el intento anterior **ya no necesitaba cambios**: funciona correctamente ahora que
su precondición (input string) es real. Se revisó también el resto del controller
(`createServiceRecord` y `updateServiceRecord`) para confirmar que ningún otro punto asume
`serviceDate` como objeto `Date` antes de persistir: `new Date(serviceDate)` (línea ~115, cierre de
retoques pendientes) acepta tanto string como Date sin problema, y tanto `ServiceRecord.create({...
serviceDate ...})` como `updateData.serviceDate = serviceDate` dejan que Mongoose castee el string
ISO al tipo `Date` del schema (`serviceDate: { type: Date, required: true, index: true }` en
`apps/server/src/models/ServiceRecord.ts`) al guardar.

### Verificación empírica (no mental)

Build: `pnpm --filter @estetica/server build` → exit code 0.

Se corrió un script Node standalone (`express-validator` real de `apps/server/node_modules`,
borrado tras la verificación) que ejecuta la validation chain exacta de la ruta corregida
(`body('serviceDate').isISO8601().withMessage(...).run(req)`, sin `.toDate()`) contra los 4 casos
de negocio de la revisión, usando `toLocalDateString` (formato `en-CA` con `timeZone` fijo) para
derivar "hoy" en `America/Argentina/Buenos_Aires`:

```
todayLocalStr (tenant tz) = 2026-08-20
yesterday = 2026-08-19   tomorrow = 2026-08-21

CASO 1: hoy, isBackfill=false -> debe ACCEPT
  req.body.serviceDate tras validation chain: '2026-08-20' (string intacto, [object String])
  guard result: ACCEPT ✅

CASO 2: hace 1 año (2025-08-20), isBackfill=false -> debe REJECT
  req.body.serviceDate tras validation chain: '2025-08-20' (string intacto)
  guard result: REJECT(non-backfill: fecha pasada) ✅

CASO 3: ayer (2026-08-19), isBackfill=true -> debe ACCEPT
  req.body.serviceDate tras validation chain: '2026-08-19' (string intacto)
  guard result: ACCEPT ✅

CASO 4: hoy (2026-08-20), isBackfill=true -> debe REJECT
  req.body.serviceDate tras validation chain: '2026-08-20' (string intacto)
  guard result: REJECT(backfill: no es pasada) ✅
```

Los 4 casos verifican empíricamente el comportamiento esperado: (1) `isISO8601()` sin `.toDate()`
deja `req.body.serviceDate` como string intacto en todos los casos (confirmado con
`Object.prototype.toString.call(...)` → `[object String]`, no `[object Date]`); (2) con el string
real disponible, el guard de comparación lexicográfica funciona como estaba pensado en el diseño
original de UX-69/UX-74.

### Archivos modificados (adenda)

- `apps/server/src/routes/serviceRecordRoutes.ts` (quitado `.toDate()` de `serviceDate` en POST y PUT)
