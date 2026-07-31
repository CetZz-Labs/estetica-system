# Reporte de Revisión Técnica — Feature UX-67

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-31

## Resumen

UX-67 (edición de `notes`/`productsUsed` en el historial de visitas con reconciliación de stock por delta) fue auditada línea por línea contra el digest de exploración (`progress/explores/explore_UX-67.md`) y `CHECKPOINTS.md`. El diff real coincide con el algoritmo especificado, sin desviaciones bloqueantes. Ambos sandboxes (`apps/server/`, `apps/client/`) se mantuvieron herméticos.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** Única feature `in_progress` en `feature_list.json` (confirmado con grep, 1 match). `progress/current.md` describe exclusivamente UX-67. Bitácoras de ambos implementers en disco (`impl_UX-67-backend.md`, `impl_UX-67-frontend.md`).
- [x] **C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries):** Backend respeta la separación controllers/routes. `updateServiceRecord` usa `findOne`/`findOneAndUpdate` con `{ _id, tenantId }` en todos los lookups (`ServiceRecord`, `Product`), nunca `findById`. Frontend consume vía `src/api/serviceRecordApi.ts` + TanStack Query; no hay llamadas HTTP directas en componentes. `Historial.tsx` conserva paginación server-side (P3) sin filtrado en memoria.
- [x] **C4 (Compilación Estática + Lint):** Verificado independientemente por el reviewer (no solo lo reportado por los implementers):
  - `pnpm --filter @estetica/server build` → `EXIT_CODE=0`.
  - `pnpm --filter @estetica/client build` → `EXIT_CODE=0` (warning preexistente de chunk >500kB, no relacionado).
  - `pnpm --filter @estetica/client lint` → `EXIT_CODE=0`, 0 errores, 4 warnings preexistentes (`react-hooks/incompatible-library` por `watch()`) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — ninguno de estos archivos fue tocado por esta feature; `EditRegistroModal.tsx` no usa `watch()` y no generó warnings nuevos.
- [x] **C5 (Cierre de Sesión Append-Only):** No corresponde a este paso del ciclo (el cierre de sesión — `history.md`, `current.md`, archivado — es responsabilidad del leader tras este veredicto). Evidencias en disco (`impl_*`, `explore_*`) presentes y correctamente nombradas.
- [x] **C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades):** `ServiceRecord.ts` y `Product.ts` no fueron modificados (no era necesario); ambos ya declaran `tenantId` con índice y `stock: { min: 0 }` como red de seguridad final. Sin cambios de schema en esta feature.
- [x] **C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404):** Ver detalle en sección "Auditoría específica" abajo. Sin secretos hardcodeados (grep de variables sensibles sin matches).
- [x] **C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato):** El cambio es puramente aditivo (el PUT ahora acepta un campo `productsUsed` opcional que antes era rechazado silenciosamente por el whitelist; no se renombra, no se remueve, no se cambia tipo de ningún field de la respuesta). No aplica `CHANGELOG.md` ni migration guide.

## Auditoría específica (foco solicitado)

1. **Multi-tenancy / anti-IDOR (GOV-TENANT):**
   - `ServiceRecord.findOne({ _id: id, tenantId: req.tenantId })` (paso 0, línea 231) — fetch previo tenant-scoped, 404 si no existe/no pertenece al tenant.
   - `Product.find({ _id: { $in: unionIds }, tenantId: req.tenantId })` (línea 293) — único query de reconciliación, scopeado.
   - Un `_id` de producto de otro tenant en `productsUsed` del body: `products.length !== unionIds.length` → **400** `'Uno o más insumos no son válidos para este negocio'` (línea 295-298), no 404 — correcto, porque es una referencia embebida en el body, no el `:id` de la ruta (criterio explícito del digest, hallazgo 2 de "Riesgos/edge cases", consistente con el patrón ya usado por `createServiceRecord`).
   - `findOneAndUpdate({ _id: id, tenantId: req.tenantId }, ...)` final (línea 336-340) también tenant-scoped.

2. **Control de stock (GOV-STOCK) — reconciliación por delta en dos fases:**
   - Fase 1 (solo lectura, línea 302-314): loop completo sobre `unionIds` calculando `delta`, `return 400` inmediato en el primer déficit de stock, **sin ninguna escritura previa**.
   - Fase 2 (escritura, línea 316-326): solo se alcanza si la fase 1 completó sin `return`; itera de nuevo sobre `unionIds` aplicando `product.stock -= delta; await product.save()`.
   - Separación estricta confirmada: no hay mutaciones intercaladas dentro del loop de validación. Un fallo en el producto N-ésimo no deja los productos 1..N-1 parcialmente descontados, tal como exige el acceptance criterion de atomicidad-percibida (no hay `session.withTransaction` disponible en este stack sin replica set — riesgo TOCTOU entre requests concurrentes documentado como aceptado y preexistente en `createServiceRecord`, correctamente fuera de alcance de esta feature).
   - Ningún producto puede quedar con `stock < 0`: la validación de fase 1 comprueba `product.stock < delta` antes de cualquier `.save()`, y el schema mantiene `min: 0` como red de seguridad adicional.

3. **Semántica `undefined` vs `[]` en `productsUsed`:** guard confirmado en línea 263: `if (productsUsed !== undefined)`. No hay chequeo de truthiness ni de `.length`. Un `productsUsed: []` explícito entra al bloque, `newMap` queda vacío, cada producto en `oldMap` genera `delta = 0 - oldQty` (negativo) → restaura el 100% del stock. Un body sin el campo (`undefined`) no toca `updateData.productsUsed` ni ejecuta ninguna lógica de stock — comportamiento preexistente preservado.

4. **Rechazo de productos duplicados:** líneas 269-276, loop sobre el `productsUsed` del body con `Set<string>`, `return 400 'Producto duplicado en la lista de insumos'` en el primer duplicado detectado, **antes** de construir `oldMap`/`newMap`/tocar `Product.find`. Corre antes de cualquier lectura de stock.

5. **Whitelist / anti mass-assignment:** línea 239, destructuring explícito `const { serviceDate, notes, nextTouchupDate, touchupStatus, productsUsed } = req.body`. `client`, `service`, `professional`, `tenantId` no aparecen en el destructuring ni en `updateData` — siguen sin ser editables vía este PUT.

6. **Validación de entrada (express-validator):** `serviceRecordRoutes.ts` líneas 93-97 — los 3 validators del PUT (`productsUsed` optional array, `productsUsed.*.product` isMongoId, `productsUsed.*.quantity` isNumeric + custom > 0) son mirror literal exacto de los del POST (líneas 70-74). `validateRequest` como último elemento del array en ambas rutas.

7. **HTML semántico:** `Historial.tsx` línea 294-302, botón de edición es `<button type="button" onClick={...} aria-label="Editar visita" title="Editar visita" className="... cursor-pointer">`. Cumple la trifecta de accesibilidad (ícono `FiEdit2` + `aria-label`/`title` + `cursor-pointer`), sin `<div onClick>`.

8. **Normalización producto poblado → `_id` string en `EditRegistroModal.tsx`:**
   - En el `reset()` (línea 87-97): `product: typeof p.product === 'object' && p.product !== null ? p.product._id : p.product` — normaliza correctamente el objeto poblado `{_id, name}` a string antes de cargarlo en `useFieldArray`.
   - En el payload de la mutación (línea 99-103): `productsUsed: data.productsUsed` proviene directamente del form state ya normalizado por el `reset()` — nunca se reintroduce el objeto poblado porque `handleAddProduct` (línea 125) también appendea `{ product: selectedProductOption.value, quantity: ... }` (string del `<Select>`, nunca un objeto).
   - Guard anti-duplicados en el selector (`fields.some(f => f.product === selectedProductOption.value)`, línea 121) compara siempre string contra string — consistente con la normalización.

9. **Errores/toasts e invalidación de queries:** `onError: (error) => handleApiError(error, 'Error al actualizar la visita')` (línea 110), sin duplicado en alerta inline dentro del componente. `onSuccess` invalida `['service-records']` y `['products']` (líneas 106-107) y muestra `toast.success('Visita actualizada. Stock reconciliado.')` — cumple la regla de no duplicar feedback.

## Hallazgos menores (no bloqueantes)

1. `quantity` en los validators del PUT (y del POST, preexistente) solo exige `isNumeric()` + `> 0`, sin `isInt()`. Permite cantidades fraccionarias con muchos decimales. No es una regresión de esta feature (heredado del POST); vale evaluarlo como hardening transversal en una feature futura, no bloqueante aquí.
2. El riesgo TOCTOU entre requests concurrentes sobre el mismo `Product.stock` (read-check-save no atómico) queda documentado como aceptado y preexistente en ambos controllers (`createServiceRecord` y ahora también `updateServiceRecord`). Consistente con la instrucción explícita del digest de no resolverlo en esta feature; se recomienda evaluarlo como ticket de hardening separado (candidato: `findOneAndUpdate` con `$gte`/`$inc` atómico para decrementos).
3. Sugerencia de ambos implementers de promover el algoritmo a `docs/patterns-backend.md` (P17 — "Reconciliación de stock por delta") y un patrón corto en `docs/patterns-frontend.md` sobre normalización de subdocumentos poblados en `reset()`. Recomendado para el ciclo de extracción de reutilizables del leader al cerrar la sesión (no bloqueante para este veredicto).

## Verificación de Builds (ejecutada de forma independiente por el reviewer)

```
pnpm --filter @estetica/server build   → EXIT_CODE=0
pnpm --filter @estetica/client build   → EXIT_CODE=0
pnpm --filter @estetica/client lint    → EXIT_CODE=0 (0 errores, 4 warnings preexistentes fuera de scope)
```

## Auditoría de Variables Sensibles

```
grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"
```
Sin matches. Ningún secreto hardcodeado en el código tocado por esta feature.

## Cambios Requeridos

Ninguno. Sin violaciones bloqueantes.

## Acción tomada

`feature_list.json` → entrada `UX-67` actualizada de `"status": "in_progress"` a `"status": "done"`.
