# impl_UX-23 — Fix: duplicado de producto bloquea reutilizar nombre de un producto eliminado

## Archivo modificado

- `apps/server/src/controllers/productController.ts` (función `createProduct`, ~línea 15-19)

## Diff exacto (1 línea agregada)

```diff
         const existingProduct = await Product.findOne({
             tenantId: req.tenantId,
+            isActive: true,
             name: { $regex: new RegExp(`^${safeName}$`, 'i') },
             brand: { $regex: new RegExp(`^${safeBrand}$`, 'i') }
         });
```

Mismo patrón ya aplicado en `createService`/`updateService` (`serviceController.ts`, UX-21). No se tocó `updateProduct` (gap distinto, documentado como fuera de alcance de UX-23), ni `serviceController.ts`, ni ningún otro archivo.

## Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build C:\_dev\Cetzz\shear-system\apps\server
> tsc
```

Exit Code: 0.

## Verificación de criterios de aceptación (análisis manual del código final)

1. **Crear producto con mismo nombre+marca que uno ya desactivado (`isActive: false`) del mismo tenant → debe permitirse.**
   Verificado. El filtro ahora incluye `isActive: true`, por lo que `Product.findOne` no matchea documentos soft-deleted (`isActive: false`). `existingProduct` resulta `null` y el flujo continúa a `product.save()` sin bloqueo. ✅

2. **Crear producto con mismo nombre+marca que uno ACTIVO del mismo tenant → sigue bloqueado con el mensaje existente.**
   Verificado. Si existe un producto con `isActive: true` (default del schema) que matchea `tenantId`, `name` (regex case-insensitive) y `brand` (regex case-insensitive), `existingProduct` es truthy y se retorna `400` con el mensaje sin cambios: `'Este insumo ya existe en el inventario. Para sumar cantidades, utilizá la opción de Ajuste de Stock.'`. ✅

3. **Sigue acotado al tenant (`req.tenantId`), sin cambios de comportamiento cross-tenant.**
   Verificado. El campo `tenantId: req.tenantId` no fue tocado; sigue siendo el primer filtro de la query, extraído server-side del request como antes. El cambio es puramente aditivo (agrega `isActive: true`) y no altera el aislamiento multi-tenant existente. ✅

## Alcance

Cambio de una sola línea, un solo archivo. No se modificó `updateProduct`, `serviceController.ts` ni ningún otro módulo.
