# Reporte de Revisión Técnica — Feature UX-74

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Resumen del hallazgo bloqueante

El fix parte de una premisa falsa documentada en `progress/implements/impl_UX-74-backend.md` ("`serviceDate` llega siempre como string date-only `'YYYY-MM-DD'`"). En realidad, `apps/server/src/routes/serviceRecordRoutes.ts:71` aplica `.toDate()` como sanitizer de `express-validator` sobre `serviceDate` en la ruta `POST /`:

```
body('serviceDate').isISO8601().withMessage('...').toDate(),
```

Ese sanitizer **muta `req.body.serviceDate` a una instancia de `Date`** antes de que el request llegue al controller (comprobado empíricamente, ver abajo). Por lo tanto, en `apps/server/src/controllers/serviceRecordController.ts:62`, `String(serviceDate)` nunca produce `'YYYY-MM-DD'`: produce la salida de `Date.prototype.toString()` (ej. `"Wed Aug 19 2026 21:00:00 GMT-0300 (hora estándar de Argentina)"`), un formato que **no es comparable lexicográficamente** contra `todayLocalStr` (`'YYYY-MM-DD'`, de `toLocalDateString`).

Como todo string producido por `Date.toString()` arranca con una letra de día de semana (código ASCII ≥ 65) y `todayLocalStr` arranca con un dígito (código ASCII ≤ 57), la comparación `serviceDateStr < todayLocalStr` (línea 64) es **estructuralmente `false` para cualquier fecha**, sin importar si es pasada, hoy o futura. Verificación empírica (Node + `express-validator` real, mismo `.toDate()` que usa la ruta):

```
today, non-backfill (should ACCEPT)    -> rejected(non-backfill) = false   [correcto por casualidad]
yesterday, non-backfill (should REJECT)-> rejected(non-backfill) = false   [INCORRECTO — acepta fecha pasada sin isBackfill]
tomorrow, non-backfill (should ACCEPT) -> rejected(non-backfill) = false   [correcto]

backfill=true, yesterday (should ACCEPT, es fecha pasada legítima)
  -> rejected(backfill) = true   [INCORRECTO — rechaza SIEMPRE, rompe el flujo isBackfill completo, UX-69]
```

Consecuencias:
1. **El guard por defecto (no-backfill) queda inutilizado por completo**: se puede registrar una visita con `serviceDate` de cualquier fecha pasada (ej. hace un año) sin marcar `isBackfill`, algo que UX-69 prohibía explícitamente y que la propia bitácora del implementer dice preservar.
2. **El flujo `isBackfill=true` (UX-69) queda completamente roto**: cualquier fecha pasada legítima es rechazada siempre con `'Una visita pasada debe tener una fecha anterior a hoy'`, contradiciendo el criterio de aceptación #2 de esta misma tarea ("una fecha estrictamente pasada debe seguir aceptándose").
3. El bug original reportado (rechazo de "hoy") efectivamente deja de ocurrir, pero **por accidente estructural** (la comparación siempre da `false`), no porque el fix sea correcto — es indistinguible de haber eliminado el guard por completo para el caso no-backfill.

Esto es una regresión funcional grave sobre una feature ya cerrada (UX-69), camuflada porque `tsc` compila sin error (comparar `string < string` es válido en TypeScript sin importar el contenido en runtime) y porque el caso puntual reportado por el usuario ("hoy") coincide, por la asimetría ASCII, con el resultado esperado.

## Verificación de builds

- `pnpm --filter @estetica/server build` → Exit Code 0 (confirmado). **No detecta el bug**: es un fallo puramente funcional/runtime, invisible a `tsc`.

## Mapeo de Checkpoints (Quality Gates)

- [ ] C2 (Coherencia de Estados y Enfoque Atómico) — el criterio de aceptación #3 de `UX-74` ("El flujo isBackfill sigue exigiendo... sin cambios de comportamiento salvo la corrección del bug") no se cumple: el comportamiento de `isBackfill` queda roto.
- [x] C3 (Fidelidad Arquitectónica) — capas y multi-tenancy no se tocaron, alcance de archivo acotado a lo declarado.
- [x] C4 (Compilación Estática) — `tsc` exit 0, pero ver nota: build verde no implica corrección funcional.
- [ ] C5 (Cierre de Sesión) — no aplica cierre hasta resolver el bloqueante.
- [x] C6 (Capa de Datos) — sin cambios de modelos.
- [ ] C7 (Security Gate) — no hay violación de seguridad, pero el punto SEC-E (validación) queda en entredicho porque el guard de negocio que depende de esa validación (`.toDate()`) fue ignorado al diseñar el fix, produciendo lógica muerta/incorrecta aguas abajo.
- [x] C8 (Estabilidad de API) — no hay cambio de contrato de respuesta.

## Cambios Requeridos (Bloqueante)

1. `apps/server/src/controllers/serviceRecordController.ts:60-71`: la comparación de strings `serviceDateStr < todayLocalStr` es inválida porque `serviceDate` ya no es un string en runtime — llega como `Date` mutado por el sanitizer `.toDate()` de `apps/server/src/routes/serviceRecordRoutes.ts:71`. `String(serviceDate)` produce el formato de `Date.prototype.toString()` (con día de semana y timezone del proceso), no `'YYYY-MM-DD'`, y por asimetría ASCII (letra vs. dígito) la comparación da `false` para **cualquier** fecha. Debe resolverse la causa raíz de forma consistente en todo el pipeline: o bien se deja de sanear `serviceDate` con `.toDate()` en la ruta (preservando el string `'YYYY-MM-DD'` real hasta el controller) y ahí sí comparar como string, o bien se compara usando `toLocalDateString(new Date(serviceDate), tz)` (reconstruyendo el día calendario en la tz del tenant a partir del `Date` ya saneado) en vez de una comparación de string cruda. Cualquiera de las dos debe volver a verificarse empíricamente con los 4 casos de esta revisión (hoy/ayer/mañana sin backfill, ayer con backfill) antes de re-enviar a review.
2. `progress/implements/impl_UX-74-backend.md:8-24,60-71`: la "Verificación mental del caso concreto" asume que `serviceDate` es un string en el controller; esa asunción es falsa dado el sanitizer de la ruta y debe corregirse junto con el fix (no se pide re-escribir el archivo ahora, pero el próximo intento debe registrar la verificación empírica real, no mental, dado que el error ya pasó un build verde).

`feature_list.json`: `UX-74` permanece en `"status": "in_progress"` — no se aplica el cambio a `"done"`.

---

# Ronda 2 — Re-auditoría (2026-08-20)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Verificación del fix

El implementer aplicó la corrección de causa raíz señalada en la Ronda 1: eliminó el sanitizer `.toDate()` de los dos validators de `serviceDate` en `apps/server/src/routes/serviceRecordRoutes.ts`, dejando `isISO8601()` sin mutar el body:

- Línea 71 (POST `/`): `body('serviceDate').isISO8601().withMessage('La fecha del servicio (serviceDate) es obligatoria y debe tener formato ISO 8601')` — confirmado sin `.toDate()`.
- Línea 95 (PUT `/:id`): `body('serviceDate').optional().isISO8601().withMessage('serviceDate debe tener formato ISO 8601')` — confirmado sin `.toDate()`.
- `.toDate()` de `nextTouchupDate` **intacto** en ambas rutas (líneas 80 y 104) — correcto, ese campo sí necesita instancia `Date` real porque `isBeforeCalendarDay` lo usa como instante con offset, y no tiene el bug de UX-74.

### Reproducción empírica propia (independiente de lo reportado por el implementer)

Corrí un script Node standalone contra `express-validator` real del `node_modules` del server, replicando exactamente la validation chain corregida (`body('serviceDate').isISO8601().withMessage(...).run(req)`, sin `.toDate()`) y el guard tal como está en el controller (comparación de strings `serviceDateStr < todayLocalStr` con `todayLocalStr = toLocalDateString(new Date(), tz)`), contra los 4 casos de negocio exigidos + 1 caso extra (fecha futura):

```
CASO1 hoy, no-backfill (expect ACCEPT)        | type: [object String] | serviceDate: "2026-08-20" | todayLocalStr: 2026-08-20 | verdict: ACCEPT
CASO2 hace 1 año, no-backfill (expect REJECT) | type: [object String] | serviceDate: "2025-08-20" | todayLocalStr: 2026-08-20 | verdict: REJECT(non-backfill: fecha pasada)
CASO3 ayer, backfill=true (expect ACCEPT)     | type: [object String] | serviceDate: "2026-08-19" | todayLocalStr: 2026-08-20 | verdict: ACCEPT
CASO4 hoy, backfill=true (expect REJECT)      | type: [object String] | serviceDate: "2026-08-20" | todayLocalStr: 2026-08-20 | verdict: REJECT(backfill: no es pasada)
EXTRA mañana, no-backfill (expect ACCEPT)     | type: [object String] | serviceDate: "2026-08-21" | todayLocalStr: 2026-08-20 | verdict: ACCEPT
```

Los 5 casos dan el resultado esperado. Confirmado empíricamente (`Object.prototype.toString.call(req.body.serviceDate)` → `[object String]` en todos los casos) que sin `.toDate()`, `req.body.serviceDate` llega intacto como string `'YYYY-MM-DD'` al controller — precondición real del guard de comparación lexicográfica introducido en Ronda 1, que ahora sí se cumple. El script fue ejecutado inline vía `node -e` (sin archivo escrito en disco, nada que borrar).

### Downstream de `serviceDate` como string

Revisé el resto de `createServiceRecord`/`updateServiceRecord` en `apps/server/src/controllers/serviceRecordController.ts`:
- Línea 115: `nextTouchupDate: { $lte: new Date(serviceDate) }` — `new Date()` acepta string ISO sin problema.
- Línea 128: `ServiceRecord.create({ ..., serviceDate, ... })` y línea 281: `updateData.serviceDate = serviceDate` — el schema (`apps/server/src/models/ServiceRecord.ts:30`, `serviceDate: { type: Date, required: true, index: true }`) hace que Mongoose castee el string `'YYYY-MM-DD'` a `Date` al persistir. Sin regresión.

### Alcance del diff

`git diff -- apps/server/src/routes/serviceRecordRoutes.ts` confirma que el único cambio de esta feature en ese archivo es la remoción de `.toDate()` en las dos rutas (las demás líneas modificadas del archivo, ej. `requireRole('ADMIN')` en DELETE, pertenecen a UX-72, ya `APPROVED` en `progress/reviews/review_UX-72.md` y fuera del alcance de esta revisión). `git diff -- apps/server/src/controllers/serviceRecordController.ts` confirma que el guard de Ronda 1 no sufrió cambios adicionales en Ronda 2 (los cambios de `deleteServiceRecord` en ese mismo diff también pertenecen a UX-72). Diff total atribuible a UX-74: guard de comparación de strings (Ronda 1, controller) + remoción de `.toDate()` (Ronda 2, routes). Nada más.

## Verificación de builds

- `pnpm --filter @estetica/server build` → Exit Code 0 (confirmado en Ronda 2).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — los 4 casos de negocio (hoy sin backfill, pasado sin backfill, pasado con backfill, hoy con backfill) se comportan según el criterio de aceptación; el flujo `isBackfill` (UX-69) queda restaurado.
- [x] C3 (Fidelidad Arquitectónica) — sin cambios de capas ni de multi-tenancy; alcance acotado a `routes/serviceRecordRoutes.ts` (remoción de sanitizer).
- [x] C4 (Compilación Estática) — `tsc` exit 0.
- [x] C5 (Cierre de Sesión) — corresponde cerrar el circuito (review verde → `history.md` → `feature_list.json`).
- [x] C6 (Capa de Datos) — `serviceDate: Date` en el schema sin cambios; Mongoose castea el string ISO correctamente al persistir.
- [x] C7 (Security Gate) — sin violaciones; `isISO8601()` sigue validando formato antes de llegar al controller, sin ventana de inyección (Mongoose valida tipo `Date` al castear; un string no-ISO ya fue rechazado por el validator).
- [x] C8 (Estabilidad de API) — sin cambio de contrato de request/response (el tipo interno del campo tras validar sigue siendo un string ISO 8601 válido; no cambia lo que el cliente envía ni lo que la API devuelve).

## Conclusión

El fix de causa raíz (remover `.toDate()` en la ruta) resuelve correctamente la premisa falsa señalada en Ronda 1. Los 4 casos de negocio + build fueron re-verificados de forma independiente y empírica. Sin hallazgos bloqueantes.

`feature_list.json`: `UX-74` actualizado a `"status": "done"`.
