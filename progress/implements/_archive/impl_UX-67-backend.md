# Implementación — UX-67 (backend)

## Feature
UX-67 — Edición de productos usados y notas en el historial de visitas. Alcance de esta bitácora: **solo backend** (`apps/server/`). El frontend queda a cargo de otro implementer conforme al digest `progress/explores/explore_UX-67.md`.

## Archivos modificados

1. `apps/server/src/controllers/serviceRecordController.ts` — función `updateServiceRecord` (líneas ~224-341 tras el cambio, antes 224-266):
   - Se agregó el **fetch previo** `ServiceRecord.findOne({ _id: id, tenantId: req.tenantId })` como paso 0, antes de tocar cualquier stock. Si no existe → 404 inmediato, antes de mutar nada.
   - Se sacó `productsUsed` de `req.body` (ya no está excluido del whitelist) y se implementó el **algoritmo de reconciliación de stock por delta** descrito en el digest:
     - Guard `productsUsed !== undefined` (no `Array.isArray(...) && length > 0`, que es el patrón de `createServiceRecord` para creación pero es semánticamente incorrecto acá: `undefined` = no tocar productos, `[]` explícito = vaciar todo y restaurar el 100% del stock).
     - Rechazo de duplicados dentro del nuevo array vía `Set` de ids ya vistos → 400 `'Producto duplicado en la lista de insumos'`, antes de leer stock.
     - `oldMap` (desde `existingRecord.productsUsed`) / `newMap` (desde `req.body.productsUsed`) / `unionIds = [...new Set([...oldMap.keys(), ...newMap.keys()])]`.
     - Una sola query `Product.find({ _id: { $in: unionIds }, tenantId: req.tenantId })`, sin filtro `isActive` (misma convención que `createServiceRecord`). Si `products.length !== unionIds.length` → 400 `'Uno o más insumos no son válidos para este negocio'` (no 404: es una referencia embebida en el body, no el `:id` de la ruta — anti-IDOR consistente con SEC-B).
     - **Fase 1 (validación pura, solo lectura):** loop sobre `unionIds` calculando `delta = (newMap.get(id) ?? 0) - (oldMap.get(id) ?? 0)`; si `delta > 0` y `product.stock < delta` → 400 descriptivo, `return` inmediato sin haber mutado nada.
     - **Fase 2 (escritura, solo si la fase 1 completa sin retornar):** segundo loop sobre `unionIds` con `delta !== 0`: `product.stock -= delta; await product.save()`. La misma fórmula sirve para decrementar (delta positivo) y restaurar (delta negativo suma).
     - `updateData.productsUsed` normalizado a `{ product, quantity }[]` explícitamente (nunca objetos poblados), aplicado justo antes del `findOneAndUpdate` final que se mantiene sin cambios.

2. `apps/server/src/routes/serviceRecordRoutes.ts` — bloque `PUT /:id` (líneas ~84-97):
   - Se agregaron los 3 validators de `productsUsed` que ya tenía el `POST` (mirror literal): `body('productsUsed').optional().isArray()`, `body('productsUsed.*.product').isMongoId()`, `body('productsUsed.*.quantity').isNumeric().custom(v => v > 0)`.
   - Se actualizó el comentario que decía "productsUsed NO son editables" (ya no aplica).

## Decisiones de diseño no obvias

- **`!== undefined` como guard, no truthiness/longitud:** documentado explícitamente en el digest (riesgo/edge case 5). Si se hubiera usado el chequeo de `createServiceRecord` (`productsUsed && Array.isArray(...) && length > 0`), un `[]` explícito (vaciar insumos) habría sido tratado como "no hacer nada", dejando el stock previamente descontado sin restaurar — bug silencioso.
- **400 en vez de 404 para insumos inválidos:** a diferencia del fetch del registro por `:id` de ruta (que sí es 404), la validación de pertenencia al tenant de los productos referenciados en el body usa 400, igual que `createServiceRecord`. Es la convención existente para referencias embebidas en el body vs. recursos de ruta.
- **Dos fases (validar todo / mutar todo después) en vez de mutar producto por producto dentro de un solo loop:** sin esta separación, un fallo de stock insuficiente en el N-ésimo producto de `unionIds` dejaría los primeros N-1 ya descontados sin rollback (no hay `session.withTransaction` disponible en este stack — MongoDB sin replica set no soporta transacciones multi-documento, ver nota de atomicidad ya existente en P6 de `docs/patterns-backend.md`).
- **No se filtra `isActive` en el `Product.find` de la reconciliación:** mantiene la misma convención que `createServiceRecord` — un producto soft-deleted sigue siendo válido para restaurar/ajustar su stock si ya estaba referenciado en el registro.
- **Riesgo aceptado, NO resuelto en esta feature (TOCTOU):** el patrón read-check-save no es atómico entre dos requests concurrentes que tocan el mismo producto (ej. dos ediciones simultáneas, o una edición concurrente con una creación nueva que consume el mismo insumo). Ambos pueden leer el mismo `stock` antes de que cualquiera escriba, y ambos decrementar, dejando potencialmente el segundo `.save()` bloqueado por el validador Mongoose `min: 0` — que se propagaría como una excepción capturada por el `catch` genérico (500, no un 400 descriptivo de "stock insuficiente"). Esto es una limitación **preexistente** en todo el código de stock (ya está en `createServiceRecord` desde antes de esta feature) y se mantiene consistente a propósito: no se introdujo `findOneAndUpdate` atómico con `$gte` acá, por instrucción explícita de no resolver esto como parte de UX-67 (sería hardening transversal, no específico de esta feature). Queda documentado como riesgo aceptado, no como algo "arreglado".

## Resultado del build

```
pnpm --filter @estetica/server build
> tsc
EXIT_CODE=0
```

Compilación exitosa sin errores de TypeScript.

## Hallazgo para promover a catálogo de patrones

El digest de exploración (`progress/explores/explore_UX-67.md`, hallazgo 4) ya sugiere explícitamente que esta feature amerita un **nuevo patrón P17 — "Reconciliación de stock por delta"** en `docs/patterns-backend.md`, cubriendo el caso mixto restaurar+descontar en una edición (distinto del P4 actual, que solo cubre descuento puro en creación). Dejo la sugerencia explícita para que el reviewer/leader decida si lo promueve al cerrar la feature. El patrón candidato incluiría:
- El guard `!== undefined` vs. truthiness/longitud para distinguir "no tocar" de "vaciar explícitamente".
- El algoritmo oldMap/newMap/unionIds/delta.
- La separación estricta en dos fases (validación pura de solo lectura, luego escritura) como mitigación de atomicidad sin `session.withTransaction`.
- La nota de riesgo aceptado sobre TOCTOU entre requests concurrentes (mismo riesgo ya latente en `createServiceRecord`, no introducido por esta feature).

## No incluido en este alcance

- Cambios en `apps/client/` (a cargo de otro implementer / sandbox frontend).
- Resolución del TOCTOU vía `findOneAndUpdate` atómico con `$gte` (evaluado y explícitamente diferido, ver arriba).
- No se marcó la feature como `"done"` en `feature_list.json` (exclusivo del reviewer).
