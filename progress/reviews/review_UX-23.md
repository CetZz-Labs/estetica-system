# Reporte de Revisión Técnica — Feature UX-23

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-07

## Resumen del Cambio

Bug: el check de duplicado en `createProduct` (`apps/server/src/controllers/productController.ts`) no filtraba `isActive: true`, por lo que un producto soft-deleted (`isActive: false`) bloqueaba erróneamente la creación de un producto nuevo con el mismo nombre+marca. Fix aplicado: se agregó `isActive: true` al filtro de `Product.findOne` del chequeo de duplicado (línea 17), mismo patrón ya auditado en `createService`/`updateService` (UX-21).

## Verificación del Diff

```bash
git diff --stat
 apps/server/src/controllers/productController.ts |  1 +
 feature_list.json                                 | 13 +++++++++++++
 2 files changed, 14 insertions(+)
```

- `apps/server/src/controllers/productController.ts`: **1 línea agregada**, confirmado con `git diff` línea por línea:
  ```diff
           const existingProduct = await Product.findOne({
               tenantId: req.tenantId,
  +            isActive: true,
               name: { $regex: new RegExp(`^${safeName}$`, 'i') },
               brand: { $regex: new RegExp(`^${safeBrand}$`, 'i') }
           });
  ```
- El mensaje de error (`'Este insumo ya existe en el inventario. Para sumar cantidades, utilizá la opción de Ajuste de Stock.'`, línea 24) **no fue tocado**.
- El resto de `createProduct` (construcción del producto, `product.save()`, catch) permanece idéntico.
- `feature_list.json`: único cambio es la inserción del objeto de la feature UX-23 (hecha por el leader al abrir el ciclo), sin alteración de otras features.
- No hay cambios en `updateProduct`, `serviceController.ts`, rutas, modelos ni ningún otro archivo del monorepo — confirmado con `git status --short` (solo `productController.ts` modificado + `feature_list.json` + `impl_UX-23.md` nuevo, sin tracking en otros paths).
- **Sandbox hermético (C2):** cumplido. Cambio acotado a 1 archivo de código + 1 línea.

## Verificación de Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build C:\_dev\Cetzz\shear-system\apps\server
> tsc
EXIT_CODE=0
```

Build backend confirmado con Exit Code 0 (ejecutado directamente por el reviewer, no solo reportado por el implementer).

## Verificación Manual contra los 3 Criterios de Aceptación

1. **Crear producto con mismo nombre+marca que uno desactivado (`isActive:false`) del mismo tenant → debe permitirse.**
   El filtro `Product.findOne({ tenantId, isActive: true, name: <regex>, brand: <regex> })` no matchea documentos con `isActive: false`. `existingProduct` es `null` → el flujo continúa a `product.save()` sin bloqueo. **Cumple.**

2. **Crear producto con mismo nombre+marca que uno ACTIVO del mismo tenant → sigue bloqueado con el mensaje existente.**
   Un producto con `isActive: true` (default del schema, ver `Product.ts`) que matchea `tenantId` + regex case-insensitive de `name`/`brand` sigue siendo encontrado por el `findOne` (el nuevo filtro es aditivo, no excluyente para el caso activo). Retorna `400` con el mismo mensaje textual, sin modificación. **Cumple.**

3. **La validación sigue acotada al tenant (EP-08), sin cambios de comportamiento cross-tenant.**
   `tenantId: req.tenantId` es el primer campo del filtro, no fue alterado, y sigue derivándose de `req.tenantId` (server-side), nunca del body. El cambio es puramente aditivo (`isActive: true`) y no toca el filtro de tenant. **Cumple.**

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` en `feature_list.json` (UX-23); sandbox hermético respetado (solo `productController.ts` tocado). Nota menor no bloqueante: `progress/current.md` indica `"Feature en curso: ninguna"` y no menciona UX-23 — desalineación administrativa del leader, no afecta la corrección del fix ni amerita `CHANGES_REQUESTED` por sí sola, pero debe corregirse en el cierre de sesión (paso 4 del protocolo).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — `tenantId` intacto como primer filtro; no aplica paginación (no es un endpoint de listado).
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/server build` → Exit Code 0, verificado directamente por el reviewer. No aplica lint de frontend (no se tocó `apps/client`).
- [x] C5 (Cierre de Sesión Append-Only) — `progress/implements/impl_UX-23.md` existe en disco con bitácora completa; este `review_UX-23.md` completa el par de evidencias exigido antes de marcar `"done"`.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se modificó ningún modelo; `Product.ts` no forma parte del diff.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — no aplica (el fix no toca autenticación, IDOR, CORS ni validación); el filtro por `tenantId` en el check de duplicado permanece intacto (SEC-B no se degrada).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — no hay cambio de contrato de API (mismo endpoint, mismo shape de request/response, mismo código de estado y mensaje de error).

## Cambios Requeridos

Ninguno. El fix es correcto, mínimo, y cumple los 3 criterios de aceptación de UX-23 sin efectos colaterales sobre `updateProduct`, `serviceController.ts` ni el aislamiento multi-tenant (EP-08).

**Observación no bloqueante para el leader:** actualizar `progress/current.md` para reflejar UX-23 como feature en curso/cerrada (actualmente dice "Feature en curso: ninguna"), como parte del protocolo de cierre de sesión (paso 4).
