# Implementación — UX-16 (backend: ampliar populate de `getUpcomingTouchups`)

**Feature:** UX-16 — Modal de detalle en Dashboard (alcance backend)
**Sandbox:** `apps/server/`
**Timestamp:** 2026-07-06

## Archivo modificado

- `apps/server/src/controllers/serviceRecordController.ts` — función `getUpcomingTouchups` (línea del `.find()` original ~145-153, ahora 145-155).

## Cambio exacto

**Antes:**
```typescript
        const records = await ServiceRecord.find({
            tenantId: req.tenantId,
            touchupStatus: 'pending',
            nextTouchupDate: { $ne: null }
        })
            .populate('client', 'firstName lastName phone')
            .populate('service', 'name')
            .sort({ nextTouchupDate: 1 }) // Ascendente: los más urgentes (fechas más tempranas) primero
            .limit(7);
```

**Después:**
```typescript
        const records = await ServiceRecord.find({
            tenantId: req.tenantId,
            touchupStatus: 'pending',
            nextTouchupDate: { $ne: null }
        })
            .populate('client', 'firstName lastName phone')
            .populate('service', 'name')
            .populate('professional', 'name color')
            .populate('productsUsed.product', 'name')
            .sort({ nextTouchupDate: 1 }) // Ascendente: los más urgentes (fechas más tempranas) primero
            .limit(7);
```

No se tocó el filtro (`tenantId`, `touchupStatus: 'pending'`, `nextTouchupDate: { $ne: null }`), ni el `sort`, ni el `limit(7)`. Solo se agregaron dos `.populate()` encadenados.

## Confirmación sintáctica del populate anidado

`productsUsed` en `apps/server/src/models/ServiceRecord.ts:33-36` está definido como un array de subdocumentos (`productsUsed: [{ product: { type: Schema.Types.ObjectId, ref: 'Product', ... }, quantity: ... }]`), no como un `Schema` separado con su propio modelo. Para este caso, Mongoose soporta poblar un path dentro de un array de subdocumentos usando la notación de string con punto directamente: `.populate('productsUsed.product', 'name')` — sin necesidad del objeto `{ path, select }`, porque no hace falta desambiguar `match`/`options` adicionales.

Esto **no es una implementación nueva ni experimental**: es el mismo patrón exacto que ya usa `getClientRecords` (mismo archivo, líneas 128-132) para el mismo modelo `ServiceRecord` y el mismo path `productsUsed.product`. Se copió el patrón ya auditado en producción en vez de reinventarlo, tal como indica `docs/patterns-backend.md`.

## Resultado del build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```
Exit code 0. Sin errores de TypeScript.

## Alcance

Cambio de una sola función, dos líneas agregadas. No se modificó ningún otro controller, ruta, modelo ni middleware. No se tocó `apps/client/`.

## Verificación de CHANGELOG.md (post-review)

El `reviewer` pidió una entrada en `CHANGELOG.md` para este cambio de contrato. El `leader` la agregó directamente (documentación, fuera del sandbox de código). Se verificó línea por línea contra el código real de `apps/server/src/controllers/serviceRecordController.ts` (`getUpcomingTouchups`, líneas 142-162) y la ruta `apps/server/src/routes/serviceRecordRoutes.ts:25` (`router.get('/retoques', getUpcomingTouchups)`, montada bajo `/api/registros`).

Entrada agregada en `CHANGELOG.md`, sección `## [Unreleased] → ### Changed` (línea 23):

> `**UX-16**: `GET /api/registros/retoques` (`getUpcomingTouchups`) ahora popula `professional { _id, name, color }` y `productsUsed[].product { _id, name }` (antes `ObjectId` crudo), mismo patrón ya usado en `GET /api/registros/cliente/:clientId`.`

**Confirmado preciso:** el endpoint (`GET /api/registros/retoques`), la función (`getUpcomingTouchups`), los campos poblados (`professional` con `name, color`; `productsUsed.product` con `name`; ambos incluyen `_id` por default de Mongoose `populate`) y la referencia al patrón ya usado en `getClientRecords` coinciden exactamente con el código fuente actual. No se detectó ninguna divergencia. No se requiere ningún ajuste adicional.
