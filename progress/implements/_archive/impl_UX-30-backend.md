# Bitácora de Implementación — UX-30 (Backend)

**Feature:** UX-30 — Historial general de visitas (nueva vista propia)
**Alcance de este subagente:** Backend únicamente (`apps/server/`). El frontend (vista `Historial.tsx`, ruta, sidebar, `serviceRecordApi.ts`, tipo `Paginated<T>`) queda pendiente para un implementer de frontend separado — ver `progress/explores/explore_UX-30.md`.

---

## Archivos modificados

1. **`apps/server/src/controllers/serviceRecordController.ts`**
   - Nuevo export `getServiceRecords` (listado general paginado con filtros combinados), insertado entre `createServiceRecord` y `getClientRecords`.
   - Sigue el patrón P1 (`docs/patterns-backend.md`): `DEFAULT_PAGE = 1`, `PAGE_SIZE = 7`, `page`/`limit` acotados con `Math.max`/`Math.min`, filtro scopeado siempre por `tenantId: req.tenantId`.
   - Filtros opcionales combinables: `clientId` → `client`, `serviceId` → `service`, `professionalId` → `professional`, `dateFrom`/`dateTo` → `serviceDate: { $gte, $lte }`.
   - `Promise.all([find(...), countDocuments(filter)])` con el **mismo** `filter` para `data` y `total` (incluye tenantId + todos los filtros activos).
   - Populate idéntico al de `getClientRecords`/`getUpcomingTouchups`: `.populate('client','firstName lastName phone').populate('service','name').populate('professional','name color').populate('productsUsed.product','name')`.
   - Orden `serviceDate: -1`. `try/catch` con `console.error` + `500 { error }` en el catch, siguiendo P7.

2. **`apps/server/src/routes/serviceRecordRoutes.ts`**
   - Import de `query` de `express-validator` y de `getServiceRecords` del controller.
   - Nueva ruta `router.get('/', [...validators, validateRequest], getServiceRecords)` agregada en la sección "Rutas Específicas", antes de `/cliente/:clientId`.
   - Validators: `page`/`limit` (`isInt`), `clientId`/`serviceId`/`professionalId` (`isMongoId`, todos `optional`), `dateFrom`/`dateTo` (`isISO8601`, `optional`).
   - Verificado que no colisiona con rutas existentes: `/retoques`, `/recientes`, `/cliente/:clientId` son paths literales/con param propio, distintos de `/`. El `POST /` (creación) sigue intacto — Express diferencia por método HTTP, no solo por path. `PUT /:id` y `DELETE /:id` no tienen contraparte `GET /:id`, por lo que no hay ambigüedad de matching con `GET /`.

3. **`apps/server/src/models/ServiceRecord.ts`**
   - Nuevo índice `ServiceRecordSchema.index({ tenantId: 1, serviceDate: -1 });` agregado junto a los tres índices compuestos existentes (línea ~58), con comentario explicando que sirve al listado general sin filtro de cliente.

---

## Contrato final del endpoint

**`GET /api/registros`** (protegido por `checkAdminAccess` + `checkTenantAccess`, mismo nivel de acceso que otros GETs de consulta — sin `requireRole` adicional).

### Query params (todos opcionales)
| Param | Validación | Efecto en filtro |
|---|---|---|
| `page` | `isInt({min:1})` | paginación, default 1 |
| `limit` | `isInt({min:1,max:100})` | tamaño de página, default 7 |
| `clientId` | `isMongoId()` | `{ client: clientId }` |
| `serviceId` | `isMongoId()` | `{ service: serviceId }` |
| `professionalId` | `isMongoId()` | `{ professional: professionalId }` |
| `dateFrom` | `isISO8601()` | `{ serviceDate: { $gte: dateFrom } }` |
| `dateTo` | `isISO8601()` | `{ serviceDate: { $lte: dateTo } }` |

### Ejemplo de request
```
GET /api/registros?page=1&limit=7&clientId=64f1...&dateFrom=2026-06-01&dateTo=2026-07-10
Authorization: Bearer <clerk-jwt>
```

### Ejemplo de response (200)
```json
{
  "data": [
    {
      "_id": "64f1...",
      "tenantId": "64a0...",
      "client": { "_id": "64f1...", "firstName": "Ana", "lastName": "Pérez", "phone": "1155..." },
      "service": { "_id": "64b2...", "name": "Color + Corte" },
      "professional": { "_id": "64c3...", "name": "Laura", "color": "#F59E0B" },
      "serviceDate": "2026-07-09T00:00:00.000Z",
      "notes": "Balayage rubio miel",
      "productsUsed": [{ "product": { "_id": "64d4...", "name": "Oxidante 20 Vol" }, "quantity": 30 }],
      "nextTouchupDate": "2026-09-09T00:00:00.000Z",
      "touchupStatus": "pending",
      "createdAt": "2026-07-09T14:30:00.000Z",
      "updatedAt": "2026-07-09T14:30:00.000Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 7, "totalPages": 6 }
}
```

### Errores
- `400` — validación de query params fallida (`express-validator`, formato `{ error: '...' }` vía `validateRequest`).
- `401`/`403` — no autenticado / sin tenant resuelto (middlewares).
- `500` — error interno (`{ error: 'Error interno del servidor' }`).

---

## Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build C:\_dev\Cetzz\shear-system\apps\server
> tsc
```

**Exit code: 0.** Sin errores de TypeScript.

---

## Decisiones técnicas / Hallazgos

- No hay endpoint previo real en el repo que implemente P1 (confirmado por el explorer) — esta es la primera aplicación fiel del patrón documentado en `docs/patterns-backend.md § P1`, copiado al pie de la letra (misma estructura de `filter`, `Promise.all`, contrato `{ data, meta }`).
- El `professional` filter usa el mismo nombre de campo del schema (`professional`, no `professionalId`) al construir el filtro Mongo, aunque el query param se llama `professionalId` — consistente con cómo el resto de la app nombra query params vs. campos de schema (ver `clientId` → `client`, `serviceId` → `service`).
- No se tocó `getRecentRecords` (últimos 10, EP-06) ni ningún otro endpoint existente — criterio de aceptación "No se modifica el timeline de últimos 10 registros existente" respetado.
- Acceso: sin `requireRole` en el nuevo `GET /`, igual que `getUpcomingTouchups`/`getRecentRecords`/`getClientRecords` (decisión de producto ya cerrada, todos los roles pueden consultar).
- Fuera de alcance (explícito en la instrucción): sin exportación Excel/CSV.

## Pendiente (fuera de este sandbox)
- Frontend: vista `Historial.tsx`, ruta `/historial`, entrada de sidebar, `getServiceRecords` en `serviceRecordApi.ts`, tipo `Paginated<T>` en `types/index.ts` — diseño completo en `progress/explores/explore_UX-30.md`.
