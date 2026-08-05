# impl_UX-69-backend.md

## Feature
UX-69 — Historial de cliente: registrar visita pasada, paginación y filtros por fecha (parte backend).

## Archivos modificados
- `apps/server/src/controllers/serviceRecordController.ts`
  - `createServiceRecord`: nuevo guard de `serviceDate` gobernado por el flag de request `isBackfill` (no persistido en el modelo).
  - `getClientRecords`: reescrito para paginar (page-size 7) y filtrar por `dateFrom`/`dateTo`, mismo patrón que `getServiceRecords`.
- `apps/server/src/routes/serviceRecordRoutes.ts`
  - `POST /`: agregado `body('isBackfill').optional().isBoolean()...`.
  - `GET /cliente/:clientId`: agregados `query('page')`, `query('limit')`, `query('dateFrom')`, `query('dateTo')` (mismos validators/mensajes que `GET /`).
- `apps/server/src/__tests__/tenantIsolation.test.ts`
  - Actualizado el test `GET /api/registros/cliente/:id de un cliente ajeno devuelve lista vacía` para consumir el nuevo contrato `{ data, meta }` en vez de un array plano (breaking change intencional, ver contrato abajo). Es el único ajuste hecho fuera del alcance estrictamente nuevo, necesario porque el test aserta directamente contra el endpoint cuyo contrato cambié.

## Contrato de API final

### `POST /api/registros`
Body admite ahora `isBackfill?: boolean` (default `false` si se omite). No se persiste en `ServiceRecord` (no está en el schema).

Reglas de `serviceDate`, evaluadas en el día calendario de la timezone del tenant (`tenant.timezone`, default `'America/Argentina/Buenos_Aires'`), mismo criterio que el guard preexistente de `nextTouchupDate` (UX-27):
- `isBackfill` ausente o `false` → `serviceDate` NO puede ser anterior a hoy. Si lo es → `400 { error: 'La fecha del servicio no puede ser anterior al día de hoy' }`.
- `isBackfill: true` → `serviceDate` DEBE ser estrictamente anterior a hoy. Si no lo es → `400 { error: 'Una visita pasada debe tener una fecha anterior a hoy' }`.

Resto del payload/response sin cambios (201 con el `ServiceRecord` creado, o 400/404 por las validaciones preexistentes de client/service/professional/stock).

### `GET /api/registros/cliente/:clientId?page=&limit=&dateFrom=&dateTo=`
**Breaking change intencional:** antes devolvía `ServiceRecord[]` plano; ahora:

```
200 {
  data: ServiceRecord[],
  meta: { total: number, page: number, limit: number, totalPages: number }
}
```

- `page` (default 1, entero ≥ 1), `limit` (default 7 = `PAGE_SIZE` del archivo, máximo 100).
- `dateFrom`/`dateTo` (ISO 8601, opcionales, filtran `serviceDate` con `$gte`/`$lte`) — filtrado server-side, no delegado al cliente.
- Ordenado por `serviceDate` descendente (más reciente primero), igual que antes.
- Populate idéntico al que ya traía: `service` (name), `professional` (name, color), `productsUsed.product` (name).
- Filtro siempre scopeado por `{ tenantId: req.tenantId, client: clientId }`; sin match cross-tenant devuelve `{ data: [], meta: { total: 0, ... } }` (200, no 404 — comportamiento preexistente preservado, cliente de otro tenant simplemente no tiene registros visibles).

## Decisiones técnicas
- Reusé la resolución `Tenant.findById(tenantId)` / `tz` ya existente en `createServiceRecord` para ambos guards (`serviceDate` nuevo y `nextTouchupDate` preexistente), evitando una segunda query.
- Para el flag `isBackfill` usé comparación estricta (`isBackfill === true || isBackfill === 'true'`) en vez de negación truthy directa (`!isBackfill`), porque `express-validator` `isBoolean()` sin `{ strict: true }` acepta strings como `'false'` sin convertirlos — un string `'false'` es truthy en JS y rompería la rama por defecto. Mismo criterio defensivo que `confirm === true` en `professionalController.ts`.
- `getClientRecords` reusa las constantes `DEFAULT_PAGE`/`PAGE_SIZE` ya definidas en el archivo (arriba de `getServiceRecords`), sin duplicarlas.
- No se tocó el schema `ServiceRecord.ts` (no se agregó `isBackfill` como campo persistido, confirmado que es solo bandera de request).

## Verificación
```
pnpm --filter @estetica/server build
```
Exit code 0, sin errores de TypeScript.

```
pnpm --filter @estetica/server test
```
Resultado: `Test Files 1 failed | 2 passed (3)` — `Tests 4 failed | 31 passed (35)`.

Los 4 fallos son exactamente la deuda preexistente conocida en `tenantIsolation.test.ts` (bloque "Registros de visita: vectores de fuga cross-tenant"): los tests no envían `professional` en el body, y la validación de ruta preexistente `body('professional').isMongoId()` los rechaza con 400 en `validateRequest` **antes** de que la request llegue al controller — por lo tanto ninguno de mis cambios (guard de `serviceDate`/`isBackfill`) se ejecuta ni influye en ese resultado. Confirmado que no se agregaron fallos nuevos más allá de esos 4.

El único test que sí requirió ajuste fue el de `GET /api/registros/cliente/:id` de cliente ajeno, actualizado para leer `res.body.data`/`res.body.meta.total` en vez de `res.body` como array plano — consecuencia directa y esperada del breaking change de contrato de esta feature.

## Pendiente / fuera de alcance
- Los 4 tests con `professional` faltante no se corrigieron (fuera de mi responsabilidad, deuda preexistente documentada).
- No se tocó `apps/client/` — la parte frontend la implementa un agente en paralelo consumiendo el contrato documentado arriba.
