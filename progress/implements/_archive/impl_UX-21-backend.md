# Implementación — UX-21 (Backend)

**Feature:** UX-21 — Validar unicidad de nombre de servicio en el catálogo
**Sandbox:** `apps/server/`
**Archivo modificado:** `apps/server/src/controllers/serviceController.ts` (único archivo tocado)

## Diff resumido

1. **Helper `escapeRegex`** agregado a nivel de módulo (línea 4), duplicado desde `productController.ts:4` (1 línea, sin abstracción nueva, tal como indicaba la guía — no existe helper compartido en `src/utils/` para esto).

2. **`createService`** (antes de `new Service(...)`):
   - Se agrega un `Service.findOne({ tenantId: req.tenantId, isActive: true, name: { $regex: new RegExp('^'+safeName+'$', 'i') } })`.
   - `safeName = escapeRegex(name.trim())`.
   - Si existe match → `return res.status(400).json({ error: 'Ya existe un servicio activo con este nombre.' })`.
   - Filtro incluye `isActive: true` explícito (diferencia respecto al template de `createProduct`, requerida por el AC: un servicio soft-deleted con el mismo nombre NO bloquea la creación).

3. **`updateService`**:
   - Antes del `findOneAndUpdate`, si `name !== undefined` (el PUT puede no tocar el nombre), se corre el mismo check de duplicado pero agregando `_id: { $ne: id }` al filtro para excluir el propio documento (si no, un servicio siempre "chocaría contra sí mismo" al guardar sin cambiar el nombre).
   - Mismo mensaje de error 400 exacto.
   - Diferencia deliberada respecto a `updateProduct` (que NO tiene este check ni el `$ne`): es un gap preexistente en `Product`, fuera de alcance de UX-21, no replicado ni corregido aquí.

No se tocó `Service.ts` (modelo), `serviceRoutes.ts` ni `serviceApi.ts` — los validators de express-validator ya cubren presencia/tipo de `name`; el check de unicidad es async y de negocio, vive en el controller. No se agregó índice `unique` a Mongoose (decisión deliberada, ya documentada en `docs/db-schema.md:264` para el caso análogo de `Product`: un índice unique no puede ser case-insensitive sin `collation`, por eso se resuelve a nivel de aplicación).

## Multi-tenancy

Todos los queries usan `req.tenantId` (nunca se acepta `tenantId` del body/params/query). `updateService` ya estaba correctamente tenant-scoped (`findOneAndUpdate({ _id, tenantId, isActive: true }, ...)`); el nuevo check de duplicado respeta el mismo alcance.

## Resultado del build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc
```
Exit Code 0 — sin errores de compilación.

## Confirmación del mensaje de error

El string devuelto en ambos casos (`createService` y `updateService`) es exactamente:

```
Ya existe un servicio activo con este nombre.
```

Verificado carácter por carácter contra `res.status(400).json({ error: 'Ya existe un servicio activo con este nombre.' })` en ambas ocurrencias del archivo — coincide con el string acordado para el matching del frontend.

## Decisiones técnicas / Hallazgos

- El helper `escapeRegex` quedó duplicado (ya existe en `productController.ts` y ahora también en `serviceController.ts`). No se promovió a `src/utils/` porque no era obligatorio para cerrar UX-21 y el catálogo de patrones ya nota que es aceptable duplicar una función de 1 línea sin crear una abstracción nueva. Candidato a extracción futura si aparece un tercer consumidor.
- Gap preexistente en `productController.updateProduct` (no valida duplicados al renombrar, y aunque lo hiciera no tendría `$ne`) queda intacto — fuera de alcance de esta feature, no se tocó `productController.ts`.
- No se agregó `unique`/`collation` al índice Mongoose de `Service.ts` — criterio ya validado por el explorer y consistente con la arquitectura existente de `Product`.
