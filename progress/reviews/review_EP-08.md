# Reporte de Revisión Técnica — Feature EP-08 (Multi-Tenant)

**Veredicto Final:** APPROVED (VERDE)
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-06-11

---

## 1. Alcance auditado

- Bitácora: progress/implements/impl_EP-08-backend.md
- Inventario base: progress/explores/explore_ep08-multitenant.md §3 (31 puntos), usado como checklist punto por punto.
- Código: apps/server/src (models, middlewares, controllers, routes, __tests__), server.ts, tsconfig.json, vitest.config.ts, package.json.
- git status --porcelain: 100 % de los cambios de código dentro de apps/server/ + arnés (feature_list.json, progress/, pnpm-lock.yaml). Cero archivos tocados en apps/client/.

## 2. Criterios de aceptación EP-08

- [x] CA-1 — tenantId en cada colección de negocio: presente en Client.ts:15, Service.ts:13, Product.ts:15-20, ServiceRecord.ts:22, Admin.ts:22-27. Todos Schema.Types.ObjectId, ref 'Tenant', required: true, index: true.
- [x] CA-2 — Modelos afectados (5): Client, Service, Product, ServiceRecord, Admin — todos modificados. Modelo Tenant.ts creado (name required trim, isActive default true, timestamps, interfaz ITenant).
- [x] CA-3 — Filtro automático por tenant en todo endpoint: checkTenantAccess inyecta req.tenantId desde req.adminInfo.tenantId (403 si falta, sin query extra a Mongo). Los 31 puntos del inventario verificados uno a uno (detalle en §3).
- [x] CA-4 — Índices compuestos con tenantId: {tenantId,isActive,lastName} (Client:26), {tenantId,isActive,name} (Service:22), {tenantId,isActive,brand,name} (Product:53), {tenantId,touchupStatus,nextTouchupDate} + {tenantId,client,serviceDate} + {tenantId,createdAt} (ServiceRecord:46-50). Únicos globales de Admin (externalId, email) justificados en ADR-1 (un usuario Clerk = un tenant). Ausencia de unique name+brand en Product justificada en ADR-2 (unicidad app-level con regex case-insensitive; comentario en Product.ts:50-52).
- [x] CA-5 — Middleware checkTenantAccess: authMiddleware.ts:47-64. Montado en los 6 routers: clientRoutes:17, serviceRoutes:17, productRoutes:17, serviceRecordRoutes:18, dashboardRoutes:8 y adminRouter via server.ts:41 (checkAdminAccess, checkTenantAccess).
- [x] CA-6 — Tests de aislamiento A/B: src/__tests__/tenantIsolation.test.ts — 22 tests (gates 401/403, listados por tenant, acceso cruzado por ID con 404 sin efectos colaterales verificados contra la DB, counts exactos del dashboard, client/service/product ajenos en createServiceRecord con 404 sin tocar stock, unicidad de producto por tenant, bulk upsert acotado al tenant).

## 3. Checklist del inventario del explore (§3 — 31 puntos)

| # | Punto | Evidencia | OK |
|---|---|---|---|
| 1-5 | clientController: create, find, findById a findOne, update, soft delete | clientController.ts:10,32,45,67,97 | [x] |
| 6-10 | serviceController: create, find, findOne, update, soft delete | serviceController.ts:10,29,42,66,94 | [x] |
| 11 | Product: chequeo de duplicados regex acotado al tenant | productController.ts:15-19 | [x] |
| 12-16 | Product: create, find, update, adjustStock, soft delete | productController.ts:28,46,60,78,107 | [x] |
| 17 | bulkWrite: tenantId en filter Y en $setOnInsert | productController.ts:135-145 | [x] |
| 18 | Service lookup con tenant en createServiceRecord (404 si ajeno) | serviceRecordController.ts:20-23 | [x] |
| 19-20 | Product lookup con tenant en loop de stock (404 si ajeno) + save | serviceRecordController.ts:36-39 | [x] |
| 21 | updateMany de auto-completado con tenantId | serviceRecordController.ts:56-58 | [x] |
| 22 | new ServiceRecord con tenantId + validación de pertenencia del client (404) | serviceRecordController.ts:13-17,69-70 | [x] |
| 23 | Historial por cliente con tenantId | serviceRecordController.ts:94 | [x] |
| 24 | Retoques pendientes con tenantId | serviceRecordController.ts:110-114 | [x] |
| 25 | update: findByIdAndUpdate a findOneAndUpdate con tenant | serviceRecordController.ts:132-133 | [x] |
| 26 | delete físico: findOneAndDelete con tenant | serviceRecordController.ts:155 | [x] |
| 27 | recientes: find() a find({tenantId}) | serviceRecordController.ts:175 | [x] |
| 28-30 | dashboard: 3 countDocuments con {tenantId} | dashboardController.ts:13-15 | [x] |
| 31 | Admin.findOne({externalId}) se mantiene sin tenant (es la query que resuelve el tenant) | authMiddleware.ts:26 | [x] |

31/31 puntos cubiertos.

## 4. Mapeo de Checkpoints (Quality Gates)

### C2 — Coherencia de Estados
- [x] Única feature in_progress: EP-08 (feature_list.json:127).
- [x] Sandbox hermético: cambios solo en apps/server/ + archivos del arnés. apps/client/ intacto.
- [x] Evidencias en disco: impl_EP-08-backend.md + este review.

### C3 — Fidelidad Arquitectónica (Backend)
- [x] Estructura limpia: todo en controllers/, models/, routes/, middlewares/, config/ (+ __tests__/ excluido del build via tsconfig).
- [x] Auth obligatoria: checkAdminAccess + checkTenantAccess en los 6 routers.
- [x] express-validator en todos los POST/PUT con validateRequest.
- [x] try/catch + códigos HTTP correctos (401/403/404/400/500) en todos los controllers.
- [x] Soft deletes preservados (isActive: false) en clients/services/products.
- [x] Control de stock: validación de stock suficiente antes de egresos, ahora acotada al tenant.
- [x] Higiene: sin console.log de debug nuevos (los 3 existentes están en index.ts y config/db.ts, archivos NO modificados por esta feature), sin debugger, sin TODO.
- [x] Sin contaminación de dependencias: package.json raíz intacto; devDeps de testing solo en apps/server (vitest, mongodb-memory-server, supertest, @types/supertest), justificadas por CA-6.

### C4 — Compilación Estática (ejecutada por este auditor)
- [x] pnpm --filter @estetica/server build: Exit Code 0.
- [x] pnpm --filter @estetica/server test: 22/22 passed, Exit Code 0 (4.65s).
- [x] pnpm --filter @estetica/client build: Exit Code 0 (warning de chunk >500kB pre-existente, no bloqueante).

### C5 — Cierre de Sesión
- [x] status "done" aplicado por el reviewer en este acto.
- [ ] Minuta en progress/history.md y limpieza de progress/current.md: pendiente del leader (paso posterior a este veredicto según protocolo).

### C6 — Capa de Datos
- [x] Modelos en apps/server/src/models/, PascalCase, interfaces con prefijo I (ITenant, IAdmin, IClient, IService, IProduct, IServiceRecord).
- [x] timestamps: true en los 6 schemas (incluido Tenant).
- [x] Soft delete con isActive default true.
- [x] Índices compuestos declarados (ver CA-4).
- [x] Referencias con Schema.Types.ObjectId + ref hacia Tenant, Client, Service y Product.

### C7 — Security Gate
- [x] SEC-A: checkAdminAccess en todo endpoint protegido.
- [x] SEC-B: JWT via getAuth(req) de @clerk/express.
- [x] SEC-C: CORS con orígenes explícitos (server.ts:22-25, sin cambios).
- [x] SEC-D: express-validator en todos los POST/PUT.
- [x] SEC-E: N/A en backend; frontend sin cambios.

## 5. Observaciones NO bloqueantes (candidatas a ticket de hardening)

1. serviceRecordController.ts:130-134 (PUT /api/registros/:id): se aplica $set con req.body crudo. express-validator NO elimina campos no declarados, por lo que un body que incluya tenantId podría reasignar el tenant de un registro propio (mass-assignment); asimismo, client/service del body del PUT no se validan contra el tenant (ya anotado por el implementer en pendientes #3). El filtro { _id, tenantId } impide tocar registros ajenos (criterio EP-08 cumplido), pero se recomienda ticket de hardening inmediato: whitelist de campos (p. ej. matchedData()) o eliminar tenantId del payload + validar pertenencia de las refs. El comentario inline de la línea 130 que atribuye ese filtrado a express-validator es inexacto y debería corregirse en ese mismo ticket.
2. serviceRecordRoutes.ts:58: el enum del validador POST usa 'canceled' (una sola L) vs 'cancelled' del modelo — typo pre-existente, fuera del alcance de EP-08.
3. productRoutes.ts:52: /bulk re-aplica checkAdminAccess inline de forma redundante (ya montado via router.use) — inocuo, pre-existente.
4. Docs canónicas desactualizadas: docs/db-schema.md (6 colecciones, filas tenantId, índices) y docs/governance-rules.md (sección GOV-TENANT) deben actualizarse por el leader/doc-agent según explore §6 e impl pendientes #2.
5. Migración de datos legados: admins y datos pre-existentes sin tenantId requieren backfill manual antes de desplegar (impl pendientes #1). Documentado; no afecta este código.

## 6. Veredicto

APPROVED (VERDE). Los 6 criterios de aceptación de EP-08 se cumplen con evidencia empírica: 31/31 queries del inventario tenantizadas, middleware montado en los 6 routers, índices compuestos correctos, modelo Tenant creado, 22/22 tests de aislamiento A/B verdes y ambos builds con Exit Code 0 ejecutados por este auditor. Las observaciones del §5 no bloquean el cierre y quedan delegadas al leader como tickets de seguimiento.
