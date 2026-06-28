# impl_UX-08-backend — Limit de 7 en getUpcomingTouchups

## Feature en curso: UX-08 — Retoques proximos limitados a 7

## Cambio realizado

**Archivo:** `apps/server/src/controllers/serviceRecordController.ts`

**Funcion:** `getUpcomingTouchups` (linea 158)

Se agrego `.limit(7)` al final de la cadena de Mongoose, tras `.sort({ nextTouchupDate: 1 })`, para que el endpoint devuelva unicamente los 7 retoques pendientes mas urgentes (fecha mas proxima primero).

### Diff conceptual

```diff
     .populate('client', 'firstName lastName phone')
     .populate('service', 'name')
-    .sort({ nextTouchupDate: 1 });
+    .sort({ nextTouchupDate: 1 })
+    .limit(7);
```

## Criterio de exencion de paginacion

Este endpoint es un widget de dashboard con `limit` fijo (retoques urgentes → 7). Segun las reglas del proyecto (`patterns-backend.md` Exenciones), los widgets de dashboard con `limit` fijo quedan excluidos del mandato de paginacion completa `{data, meta}`. El `.limit(7)` es suficiente.

## Archivos modificados

- `apps/server/src/controllers/serviceRecordController.ts`

## Build

No ejecutado por instruccion del Leader (delegado al revisor).
