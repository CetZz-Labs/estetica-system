# Bitácora de Implementación — EP-08 Multi-Tenant (Backend)

**Feature:** EP-08 — Multi-Tenant (Aislamiento de datos por tenant) — Fase 2
**Implementer:** subagente backend
**Fecha:** 2026-06-11
**Sandbox:** `apps/server/`

---

## Objetivo

Introducir aislamiento de datos por tenant en toda la API: campo `tenantId` en las 5 colecciones de negocio + modelo `Tenant` mínimo, middleware `checkTenantAccess` que inyecta `req.tenantId`, barrido completo de las ~31 queries del inventario del explore (`progress/explores/explore_ep08-multitenant.md` §3), índices compuestos por tenant y suite de tests de aislamiento A/B.

---

## Archivos creados

| Archivo | Resumen |
|---|---|
| `apps/server/src/models/Tenant.ts` | Modelo mínimo `Tenant` (`name` required trim, `isActive` default true, timestamps, interfaz `ITenant`). |
| `apps/server/vitest.config.ts` | Config de Vitest: include `src/__tests__/**/*.test.ts`, `hookTimeout: 120000` (descarga del binario de mongodb-memory-server en primera corrida), `testTimeout: 30000`. |
| `apps/server/src/__tests__/tenantIsolation.test.ts` | Suite de 22 tests de aislamiento multi-tenant (detalle abajo). |

## Archivos modificados

### Modelos (`apps/server/src/models/`)
| Archivo | Cambio |
|---|---|
| `Admin.ts` | `tenantId` (ObjectId, ref 'Tenant', required, index) en interfaz y schema. `externalId` y `email` se mantienen únicos **globales** (ver ADR-1). |
| `Client.ts` | `tenantId` required+index. Índice compuesto `{ tenantId: 1, isActive: 1, lastName: 1 }` (cubre `getClients`). |
| `Service.ts` | `tenantId` required+index. Índice compuesto `{ tenantId: 1, isActive: 1, name: 1 }`. |
| `Product.ts` | `tenantId` required+index. Índice compuesto `{ tenantId: 1, isActive: 1, brand: 1, name: 1 }`. **Sin** unique compuesto name+brand (ver ADR-2). |
| `ServiceRecord.ts` | `tenantId` required+index. El compuesto del dashboard pasa a `{ tenantId: 1, touchupStatus: 1, nextTouchupDate: 1 }`; se agregan `{ tenantId: 1, client: 1, serviceDate: -1 }` (historial) y `{ tenantId: 1, createdAt: -1 }` (recientes). |

### Middleware y wiring
| Archivo | Cambio |
|---|---|
| `middlewares/authMiddleware.ts` | Augmentation global ampliada con `tenantId?: Types.ObjectId`. Nuevo `checkTenantAccess`: corre después de `checkAdminAccess`, lee `req.adminInfo.tenantId`, responde 403 `{ error: '...' }` si falta y cuelga `req.tenantId`. Sin query adicional a Mongo (el doc Admin ya está en la request). |
| `routes/clientRoutes.ts`, `serviceRoutes.ts`, `productRoutes.ts`, `serviceRecordRoutes.ts`, `dashboardRoutes.ts` | `router.use(checkTenantAccess)` inmediatamente después de `router.use(checkAdminAccess)`. |
| `server.ts` | adminRouter montado con `checkAdminAccess, checkTenantAccess`. Además, guard de `process.loadEnvFile()` extendido a `NODE_ENV !== 'test'` para que la suite no dependa de un `.env` local (ver ADR-4). |

### Controllers (barrido del inventario §3 del explore — 31 puntos)
| Archivo | Cambio |
|---|---|
| `clientController.ts` | 5 puntos: `tenantId` en constructor de create, en `find` de listado, `findById` → `findOne({ _id, tenantId })`, y en los filtros de update y soft delete. |
| `serviceController.ts` | 5 puntos: idéntico patrón (create, find, findOne, update, soft delete). |
| `productController.ts` | 7 puntos: chequeo de duplicados por regex acotado al tenant; `tenantId` en create, listado, update, `adjustStock`, soft delete; **bulkWrite**: `tenantId` inyectado en el `filter` Y en `$setOnInsert` (el filtro usa regex, Mongo no puede inferir el literal al insertar). |
| `serviceRecordController.ts` | 10 puntos: validación de que el `client` del body pertenece al tenant (404 si no — nuevo); validación de que el `service` pertenece al tenant (404 si no — cierra el vector del explore ítem 18; la búsqueda del servicio ahora es incondicional y reutilizada para el cálculo de retoque); descuento de stock solo sobre productos del tenant (`findOne({ _id, tenantId })`); `tenantId` en el filtro del `updateMany` de auto-completado, en el constructor del registro, en historial por cliente, retoques, recientes (`find()` sin filtro → `find({ tenantId })`), update (`findByIdAndUpdate` → `findOneAndUpdate` con tenant) y delete físico (`findByIdAndDelete` → `findOneAndDelete` con tenant). |
| `dashboardController.ts` | 3 puntos: los 3 `countDocuments` filtran por `{ tenantId }`. |
| `authMiddleware.ts:24` | `Admin.findOne({ externalId })` se mantiene sin tenant (es la query que RESUELVE el tenant), según inventario ítem 31. |

### Tooling
| Archivo | Cambio |
|---|---|
| `package.json` (apps/server) | devDeps: `vitest`, `mongodb-memory-server`, `supertest`, `@types/supertest` (via `pnpm --filter @estetica/server add -D`). Script `"test": "vitest run"`. |
| `tsconfig.json` (apps/server) | `"exclude": ["src/__tests__"]` para que los tests no entren al build de producción (`tsc`). |

---

## Decisiones técnicas (ADRs breves)

1. **ADR-1 — Unicidad global de `externalId`/`email` en Admin:** se mantienen únicos a nivel global (no compuestos con `tenantId`). Razón: un usuario de Clerk pertenece a un único tenant y `externalId` es la clave de lookup del middleware. Si a futuro un mismo email debe administrar dos tenants, migrar `email` a unique compuesto `{ tenantId, email }`.
2. **ADR-2 — Sin índice unique `{ tenantId, name, brand }` en Product:** la unicidad name+brand sigue siendo app-level (regex case-insensitive, ahora acotada por tenant). Un unique compuesto NO replicaría la insensibilidad a mayúsculas (requeriría collation o campos normalizados); se documenta la divergencia en un comentario del modelo.
3. **ADR-3 — Validación de pertenencia en createServiceRecord:** además del `client` (requerido por la consigna), se valida que el `service` pertenezca al tenant (404 'Servicio no encontrado'). La búsqueda del servicio pasó de condicional a incondicional; el cálculo de `nextTouchupDate` reutiliza ese documento. Cierra el vector señalado en el explore ítem 18.
4. **ADR-4 — Estrategia de tests:** Vitest + mongodb-memory-server + supertest contra el `app` real (`server.ts`). `@clerk/express` mockeado con `vi.mock` (`getAuth` lee un estado mutable hoisted → simula admins de tenants distintos por test); `config/db` mockeado (la conexión la maneja el memory server). `server.ts`: guard de `loadEnvFile` extendido a `NODE_ENV !== 'test'` para no depender de `.env`. Tests excluidos del build vía `tsconfig.exclude`.
5. **ADR-5 — Alcance conservador:** no se corrigió de paso el `countDocuments()` del dashboard que tampoco filtra `isActive` (comportamiento pre-existente, fuera del alcance de EP-08; anotado en pendientes).

---

## Tests (22/22 verdes)

`apps/server/src/__tests__/tenantIsolation.test.ts` — seed: tenant A (1 cliente, 1 servicio, 1 producto, 1 registro pending) y tenant B (2 clientes, 1 servicio, 1 producto, 2 registros pending), un admin por tenant + un admin legado sin tenant (insert crudo).

- Gates: 401 sin usuario autenticado; 403 admin sin tenant asignado.
- Listados: clientes/servicios/productos/recientes/retoques de A devuelven solo datos de A (y B ve los suyos).
- Acceso cruzado por ID: GET/PUT/DELETE de recursos de B con credenciales de A → 404 sin efectos colaterales (verificado contra la DB).
- Historial de cliente ajeno → lista vacía. Dashboard de A cuenta exactamente `{ totalClients: 1, servicesDone: 1, upcomingTouchups: 1 }`.
- Registros de visita: client ajeno → 404; service ajeno → 404; producto ajeno en `productsUsed` → 404 sin tocar stock; flujo propio → 201, descuenta stock y persiste `tenantId`.
- Productos: mismo name+brand que otro tenant → 201 (no hay falso duplicado cross-tenant) y duplicado intra-tenant → 400; bulk upsert solo afecta productos del tenant propio.

## Output de verificación

```
pnpm --filter @estetica/server build  → Exit Code 0 (tsc sin errores)
pnpm --filter @estetica/server test   → Test Files 1 passed (1), Tests 22 passed (22)
```

Notas de la corrida: warnings de deprecación de Mongoose por la opción `new: true` en `findOneAndUpdate` (patrón pre-existente en todos los controllers, no introducido por esta feature). Los únicos `console.log` del workspace son pre-existentes (`index.ts` arranque, `config/db.ts`); no se agregó logging de debug.

---

## Pendientes / Notas para el Leader

1. **Backfill manual de admins:** `tenantId` es `required: true`. Los admins pre-existentes en una DB real NO tienen tenant → fallarán con 403 en `checkTenantAccess` hasta que se cree un documento `Tenant` y se asigne su `_id` a cada admin (migración manual, fuera del alcance de EP-08). Lo mismo aplica a clients/services/products/servicerecords históricos: quedarán invisibles hasta backfillear su `tenantId`.
2. **Docs a actualizar (rol del leader/doc-agent, fuera de mi sandbox):** `docs/db-schema.md` (6 colecciones, filas `tenantId`, índices) y `docs/governance-rules.md` (sección GOV-TENANT) según explore §6.
3. **updateServiceRecord:** el filtro ahora es por `{ _id, tenantId }`, pero el body del PUT puede traer `client`/`service` y no se valida su pertenencia al tenant (mismo criterio del inventario, que no lo incluía). Candidato a endurecer en una feature de hardening.
4. Dashboard: `totalClients` cuenta también clientes inactivos del tenant (comportamiento pre-existente, ver ADR-5).

## Addendum — Hardening mass-assignment (post-review)

**Fecha:** 2026-06-11 — Micro-tarea derivada de la review de EP-08.

### Hallazgo
`updateServiceRecord` (PUT `/api/registros/:id`) hacía `$set: req.body` (mass-assignment): un body con `tenantId`/`client` ajenos podía sobrescribir esos campos y romper el aislamiento multi-tenant.

### Archivos tocados
| Archivo | Cambio |
|---|---|
| `apps/server/src/controllers/serviceRecordController.ts` | `updateServiceRecord` ahora arma `updateData` con whitelist explícita: solo `serviceDate`, `notes`, `nextTouchupDate`, `touchupStatus`. |
| `apps/server/src/routes/serviceRecordRoutes.ts` | El validator del PUT ya no acepta/documenta `client`, `service` ni `productsUsed` (incluía además un `productsUsed.isString()` erróneo que se eliminó junto con el campo). |
| `apps/server/src/__tests__/tenantIsolation.test.ts` | Nuevo test #23: PUT con `tenantId` y `client` de otro tenant en el body → 200, pero el documento conserva `tenantId`/`client` originales y solo actualiza `notes`. |

### Decisión de whitelist
- **Editables:** `serviceDate`, `notes`, `nextTouchupDate`, `touchupStatus` (campos propios del registro, sin efectos colaterales).
- **Excluidos:** `tenantId` (aislamiento), `client` y `service` (cambiarlos requeriría re-validar pertenencia al tenant como hace el POST), `productsUsed` (cambiarlo requeriría re-calcular/revertir stock; no existe esa lógica en el update y agregarla excede el alcance del hardening).
- Otros controllers (`clientController`, `serviceController`, `productController`) ya destructuran campos explícitos del body — sin cambios.

### Verificación
- `pnpm --filter @estetica/server build` → Exit 0.
- `pnpm --filter @estetica/server test` → 23/23 passed (1 file).
