# impl_UX-72-backend

## Resumen de cambios

### `apps/server/src/controllers/serviceRecordController.ts` — `deleteServiceRecord`
- Se agregó un fetch previo tenant-scoped (`ServiceRecord.findOne({ _id: id, tenantId: req.tenantId })`) antes de cualquier mutación, replicando el patrón "Paso 0" ya usado en `updateServiceRecord` (UX-67). Da el 404 temprano si el registro no existe o pertenece a otro tenant.
- Antes del borrado físico, se itera `existingRecord.productsUsed` y por cada item se restaura el stock del `Product` con `Product.updateOne({ _id: item.product, tenantId: req.tenantId }, { $inc: { stock: item.quantity } })`.
  - Si el producto referenciado ya no existe (o pertenece a otro tenant, caso imposible en la práctica pero cubierto igual), `updateOne` simplemente no matchea ningún documento y no lanza error — el item se ignora sin bloquear el borrado del registro. No hizo falta un chequeo de existencia explícito adicional: el comportamiento no-op de `updateOne` sobre 0 matches ya cumple el criterio de aceptación ("ignorar item huérfano sin bloquear el borrado").
  - Se usó `$inc` vía `updateOne` en vez de `findOne` + `save()` (que sí se usa en `createServiceRecord`/`updateServiceRecord` para descuentos/deltas con validación de stock suficiente) porque acá es una restauración pura sin validación de negocio (no hay riesgo de dejar stock negativo al sumar) — no se necesita cargar el documento completo del producto.
- El borrado sigue siendo físico vía `ServiceRecord.findOneAndDelete({ _id: id, tenantId: req.tenantId })`, sin cambios de comportamiento respecto al mensaje de respuesta (`'Registro eliminado físicamente de forma exitosa'`).
- El bloque `try/catch` existente ya envolvía toda la función; no fue necesario tocar el manejo de errores (`console.error` + 500).
- Riesgo TOCTOU entre el fetch inicial y el `findOneAndDelete` final: aceptado explícitamente por el leader, mismo criterio que P17 en `updateServiceRecord`. No se agregaron transacciones ni locks.

### `apps/server/src/routes/serviceRecordRoutes.ts`
- Se agregó `requireRole('ADMIN')` como primer elemento del array de validación en `router.delete('/:id', ...)`, mismo patrón exacto que `clientRoutes.ts` (DELETE `/:id`, línea ~81: `requireRole('ADMIN')` antes de los validators de `param`). El import de `requireRole` ya existía en el archivo (se usa en el `POST /` de este mismo router), no hizo falta agregar import nuevo.

## Decisiones técnicas / ADRs
- No se usó el patrón de "fase de validación + fase de escritura" de `updateServiceRecord` (P17) porque acá no hay reconciliación de deltas mixtos (positivos/negativos) ni riesgo de stock insuficiente — es una restauración pura (siempre suma), por lo que no existe un escenario de fallo a mitigar antes de escribir.
- No se instalaron dependencias nuevas ni se tocó `apps/client/`.

## Resultado del build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```

Exit code 0, sin errores de TypeScript.

## Archivos modificados
- `C:\_dev\Cetzz\shear-system\apps\server\src\controllers\serviceRecordController.ts`
- `C:\_dev\Cetzz\shear-system\apps\server\src\routes\serviceRecordRoutes.ts`
