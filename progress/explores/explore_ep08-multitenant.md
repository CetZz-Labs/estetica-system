# Reporte de Exploración — EP-08 Multi-Tenant

**Pregunta:** Análisis de impacto para introducir aislamiento por `tenantId` en backend (modelos, middleware, controllers, tests, docs).
**Contexto:** Feature EP-08, Fase 2. Explorado por subagente `explorer` (a4120094a92c5a095), persistido por el leader.
**Timestamp:** 2026-06-11

## 1. Modelos — estado actual y dónde insertar `tenantId`

Todos en `apps/server/src/models/`.

**Admin.ts** (39 líneas)
- Campos: `externalId` (unique+index, línea 13-18), `email` (unique, 19-25), `role` enum (26-30), `isActive` (31-34), timestamps.
- Insertar `tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }` en la interfaz `IAdmin` (línea 3-10) y el schema (tras `externalId`).
- Índices: `externalId` puede seguir único global (un usuario Clerk pertenece a un solo tenant; es la clave de lookup del middleware). `email` unique global (línea 22) debe evaluarse: si un mismo email pudiera administrar dos tenants, pasar a compuesto `{ tenantId: 1, email: 1 } unique`. Recomendación conservadora: mantener ambos únicos globales en EP-08 y documentar la decisión.

**Client.ts** (23 líneas)
- Campos: `firstName`, `lastName`, `phone?`, `medicalNotes?`, `isActive`. Sin índices explícitos.
- Insertar `tenantId` requerido e indexado. Crear índice compuesto `ClientSchema.index({ tenantId: 1, isActive: 1, lastName: 1 })` (cubre el listado de `getClients`). No hay unicidad previa que migrar.

**Service.ts** (19 líneas)
- Campos: `name`, `defaultTouchupDays?`, `isActive`. Sin índices.
- Insertar `tenantId` + índice `{ tenantId: 1, isActive: 1, name: 1 }`. No hay unique actual de `name`; si se quisiera unicidad de nombre de servicio, debe nacer compuesta `{ tenantId: 1, name: 1 } unique` (hoy no existe — no inventarla salvo que el SRS lo pida).

**Product.ts** (42 líneas)
- Campos: `name`, `brand`, `stock` (min 0), `description?`, `isActive`. **No hay índice unique en el schema**: la unicidad nombre+marca se aplica solo a nivel de aplicación con regex case-insensitive en `productController.ts:15-18` y como filtro de upsert en `productController.ts:133-136`.
- Insertar `tenantId` + índice `{ tenantId: 1, isActive: 1, brand: 1, name: 1 }`. La "unicidad" nombre+marca debe pasar a tenantId+name+brand: como mínimo, agregar `tenantId` a los filtros regex de las líneas 15-18 y 133-136. Opcional endurecer con índice unique compuesto, pero ojo: un unique sobre `{ tenantId, name, brand }` NO replica la insensibilidad a mayúsculas del regex (requeriría collation o campos normalizados) — documentar esa divergencia si se crea.

**ServiceRecord.ts** (46 líneas)
- Campos: `client` (ref+index), `service` (ref), `serviceDate` (index), `notes?`, `productsUsed[]`, `nextTouchupDate` (index), `touchupStatus` (enum+index). Índice compuesto existente: `{ touchupStatus: 1, nextTouchupDate: 1 }` en línea 44.
- Insertar `tenantId` + reemplazar/anteponer el compuesto del dashboard: `{ tenantId: 1, touchupStatus: 1, nextTouchupDate: 1 }`. Agregar también `{ tenantId: 1, client: 1, serviceDate: -1 }` (historial por cliente) y `{ tenantId: 1, createdAt: -1 }` (recientes).

## 2. authMiddleware y `checkTenantAccess`

`apps/server/src/middlewares/authMiddleware.ts`:
- Líneas 5-11: ya usa **augmentation global de Express** (`declare global { namespace Express { interface Request { adminInfo?: IAdmin } } }`). El patrón a seguir es agregar `tenantId?: Types.ObjectId` (o string) a esa misma interfaz.
- Líneas 14-39: `checkAdminAccess` hace `getAuth(req)` → 401 si no hay `userId` → `Admin.findOne({ externalId: userId })` (línea 24) → 403 si no existe → cuelga `req.adminInfo = admin` (línea 33).
- **Extensión recomendada:** dado que `checkAdminAccess` ya trae el documento Admin completo, lo más barato es que un `checkTenantAccess` encadenado después lea `req.adminInfo.tenantId` y haga `req.tenantId = admin.tenantId`, con 403 si el admin no tiene tenant asignado. No se necesita query adicional a Mongo. Registrar `checkTenantAccess` tras `checkAdminAccess` en cada router (patrón actual: `router.use(checkAdminAccess)` en clientRoutes.ts:16, serviceRoutes.ts:16, productRoutes.ts:16, serviceRecordRoutes.ts:17, dashboardRoutes.ts:7, y `server.ts:41` para adminRouter).

## 3. Inventario completo de queries Mongoose a tenantizar

**clientController.ts**
1. `:9-17` `new Client({...}).save()` → agregar `tenantId: req.tenantId` al constructor.
2. `:31` `Client.find({ isActive: true })` → `{ tenantId, isActive: true }`.
3. `:44` `Client.findById(id)` → cambiar a `findOne({ _id: id, tenantId })`.
4. `:65-76` `Client.findOneAndUpdate({ _id: id, isActive: true }, ...)` → añadir `tenantId` al filtro.
5. `:95-99` `Client.findOneAndUpdate({ _id: id, isActive: true }, { isActive: false })` → añadir `tenantId`.

**serviceController.ts**
6. `:9-15` `new Service().save()` → inyectar `tenantId`.
7. `:28` `Service.find({ isActive: true })` → añadir `tenantId`.
8. `:41` `Service.findById(id)` → `findOne({ _id: id, tenantId })`.
9. `:64-73` `Service.findOneAndUpdate({ _id: id, isActive: true })` → añadir `tenantId`.
10. `:92-96` soft delete `findOneAndUpdate` → añadir `tenantId`.

**productController.ts**
11. `:15-18` `Product.findOne({ name: regex, brand: regex })` (chequeo duplicados) → añadir `tenantId` — crítico, hoy detectaría duplicados de OTRO tenant.
12. `:26-33` `new Product().save()` → inyectar `tenantId`.
13. `:44` `Product.find({ isActive: true })` → añadir `tenantId`.
14. `:57-61` `findOneAndUpdate({ _id, isActive: true })` → añadir `tenantId`.
15. `:76` `Product.findOne({ _id: id, isActive: true })` (adjustStock) → añadir `tenantId`.
16. `:104-108` soft delete `findOneAndUpdate` → añadir `tenantId`.
17. `:126-153` `Product.bulkWrite(operations)` con `updateOne.filter` (líneas 133-136) y `$setOnInsert` (139-143) — **doble punto de inyección**: `tenantId` en el `filter` Y en `$setOnInsert` (con regex en name/brand el filtro mixto exige `tenantId` explícito en `$setOnInsert`).

**serviceRecordController.ts** (el más delicado)
18. `:14` `Service.findById(service)` (cálculo retoque) → `findOne({ _id: service, tenantId })` — sin esto, un tenant podría referenciar servicios ajenos.
19. `:25` `Product.findById(item.product)` (descuento stock, dentro de loop) → `findOne({ _id: item.product, tenantId })` — crítico: hoy permitiría descontar stock de productos de otro tenant.
20. `:39` `product.save()` — sin cambio (documento ya filtrado).
21. `:45-54` `ServiceRecord.updateMany({ client, service, touchupStatus: 'pending' })` (auto-complete) → añadir `tenantId` al filtro.
22. `:57-67` `new ServiceRecord().save()` → inyectar `tenantId`. Además, validar que `client` pertenece al tenant (hoy nadie verifica el `client` del body; con multi-tenant es un vector de fuga: agregar `Client.findOne({ _id: client, tenantId })` o equivalente).
23. `:81-84` `ServiceRecord.find({ client: clientId })` + populates → añadir `tenantId`.
24. `:97-103` `ServiceRecord.find({ touchupStatus: 'pending', nextTouchupDate: { $ne: null } })` → añadir `tenantId`.
25. `:118-122` `ServiceRecord.findByIdAndUpdate(id)` → `findOneAndUpdate({ _id: id, tenantId })`.
26. `:141` `ServiceRecord.findByIdAndDelete(id)` (borrado físico) → `findOneAndDelete({ _id: id, tenantId })`.
27. `:161-165` `ServiceRecord.find()` sin filtro alguno (recientes) → `find({ tenantId })` — hoy es la fuga más obvia.

**dashboardController.ts**
28. `:11` `Client.countDocuments()` → `countDocuments({ tenantId })` (nota: hoy tampoco filtra `isActive`; decidir si corregir de paso).
29. `:12` `ServiceRecord.countDocuments()` → `{ tenantId }`.
30. `:13` `ServiceRecord.countDocuments({ touchupStatus: 'pending' })` → añadir `tenantId`.
- Aclaración: no hay `aggregate()` real en el dashboard actual, solo `countDocuments` en paralelo (`Promise.all`, líneas 10-14).

**authMiddleware.ts**
31. `:24` `Admin.findOne({ externalId: userId })` — se mantiene sin tenant (es la query que RESUELVE el tenant).

Patrón sugerido: desestructurar `const tenantId = req.tenantId` al inicio de cada controller; el "filtro automático" del criterio de aceptación se logra vía middleware que inyecta `req.tenantId` + disciplina en controllers.

## 4. Framework de tests

- **No existe.** `apps/server/package.json` no tiene script `test` ni dependencias de testing.
- Recomendación mínima viable coherente con TS6 + CommonJS: **Vitest + mongodb-memory-server + supertest**, con mock de `@clerk/express` (`getAuth`) para inyectar `userId` de prueba — el diseño actual lo facilita porque toda la auth pasa por una sola función.

## 5. ¿Modelo `Tenant` ahora?

- Recomendación: **crear el modelo mínimo en EP-08** (`Tenant.ts`: `name: String required trim`, `isActive: Boolean default true`, `timestamps`). Razón: `tenantId` será `required: true` con `ref: 'Tenant'` en 5 modelos; sin la colección no hay documento válido al cual apuntar ni forma de sembrar tests de aislamiento. EP-09 agregará endpoints sobre esta base.

## 6. Documentación a actualizar tras EP-08

`docs/db-schema.md`: encabezado pasa a 6 colecciones con `tenants`; fila `tenantId` en cada tabla; diagrama de relaciones; resumen de índices; nueva convención en notas para subagentes.

`docs/governance-rules.md`: nueva sección **GOV-TENANT** (aislamiento multi-tenant, inyección via `checkTenantAccess`, prohibición de queries sin `tenantId`); GOV-AUTH mandato adicional; GOV-STOCK mandato 4 → "por tenantId + name + brand"; GOV-VISIT mandato 2 → filtro incluye `tenantId`. Colateral: `CHECKPOINTS.md` y `.claude/rules/backend.md` §7-8 deberán enlazar GOV-TENANT.

## Diagnóstico

El backend es 100 % single-tenant: ninguna de las ~31 queries identificadas filtra por tenant, no hay modelo Tenant, y la unicidad de productos (regex app-level, no índice) y el dashboard (`find()` y `countDocuments()` sin filtro) son los puntos de fuga más graves. La auth está centralizada en un único middleware que ya usa request augmentation tipada, lo que hace trivial colgar `req.tenantId`; todos los routers ya montan `checkAdminAccess` con `router.use`, dando un punto de enganche uniforme para `checkTenantAccess`.

## Recomendación de ejecución

(1) Crear `Tenant.ts` mínimo + campo `tenantId` en los 5 modelos con índices compuestos; (2) extender `authMiddleware.ts` con `checkTenantAccess` que lea `req.adminInfo.tenantId` y lo cuelgue en `req.tenantId`; (3) barrido controller por controller siguiendo el inventario §3, con atención a `productController.ts:133-143` (bulkWrite/upsert), `serviceRecordController.ts:25` (stock cross-tenant) y `serviceRecordController.ts:161` (find sin filtro); (4) montar vitest + mongodb-memory-server + supertest con el test de aislamiento A/B como criterio de cierre.
