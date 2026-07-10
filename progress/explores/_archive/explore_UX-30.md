# Reporte de Exploración — UX-30 (Historial de Visitas, vista propia)

**Pregunta:** Diseño concreto de endpoint backend paginado + vista frontend nueva para listar TODAS las visitas (ServiceRecord) del tenant con filtros combinados.
**Contexto:** UX-30, feature_list.json `in_progress`.
**Timestamp:** 2026-07-10

## Hallazgos

1. `apps/server/src/models/ServiceRecord.ts:52-56`: índices existentes cubren `{tenantId,touchupStatus,nextTouchupDate}`, `{tenantId,client,serviceDate:-1}` y `{tenantId,createdAt:-1}`. **Falta** un índice para el listado global sin filtro de cliente ordenado por `serviceDate` — recomiendo agregar `ServiceRecordSchema.index({ tenantId: 1, serviceDate: -1 })`.
2. `apps/server/src/routes/serviceRecordRoutes.ts:1-91`: NO existe `GET /` (base). Solo `/retoques`, `/recientes`, `/cliente/:clientId`, y CRUD por `:id`. Hay que **agregar** un nuevo `router.get('/', [...validators], getServiceRecords)` — no colisiona con las rutas literales existentes.
3. `apps/server/src/controllers/serviceRecordController.ts:138-153,245-260`: `getClientRecords` y `getRecentRecords` ya muestran el `.populate()` a reusar: `.populate('client','firstName lastName phone').populate('service','name').populate('professional','name color').populate('productsUsed.product','name')`.
4. **Gap de precedente real:** ni `clientController.ts:30` (`getClients`) ni `productController.ts:29` (`getProducts`) implementan P1 pese a estar documentado como mandato — devuelven array plano sin paginar, y sus vistas (`Clients.tsx:16-27`, `Inventario.tsx:25-45`) filtran client-side con `.filter()`. **No hay ningún precedente real funcionando de P1/P3 en el código** — el catálogo de patrones está documentado pero no aplicado aún en ninguna feature cerrada. Esto es deuda técnica preexistente fuera de alcance de UX-30, pero implica que el implementer debe seguir el template de los docs al pie de la letra, sin copiar un controller/vista "ya auditado" real.
5. `apps/client/src/types/index.ts:44-58`: existe `ServiceRecord` (con `client: ClientSlim`, `service: ServiceSlim`, `professional?`) pero **no existe** `Paginated<T>` genérico — hay que crearlo en `types/index.ts` (`{ data: T[]; meta: { total, page, limit, totalPages } }`).
6. `apps/client/src/api/serviceRecordApi.ts:1-59`: no hay función de listado paginado (solo `getClientRecords`, `getUpcomingTouchups`, `getRecentRecords`, sin `page`/`filtros`). Hay que agregar `getServiceRecords(params)`.
7. `apps/client/src/components/RegistroModal.tsx:6,85-100,277-327`: los selects de cliente/servicio/profesional usan `react-select` cargando la lista completa activa vía `useQuery` (catálogos acotados, no búsqueda async paginada) — mismo patrón replicable para los filtros de la vista nueva.
8. `apps/client/src/router.tsx:59-97` y `apps/client/src/layouts/AppLayout.tsx:80-123`: alta de ruta dentro de `<Route element={<AppLayout/>}>` + `<NavLink>` en `<nav>` con `navLinkClass`; no hace falta `ProtectedRoute` (ningún rol se excluye salvo que producto lo pida).
9. No existe ningún date-range picker ni par de `<input type="date">` "desde/hasta" en el repo (`Turnos.tsx:658` es un único date input de navegación de calendario, no un rango). Se debe construir con 2 `<input type="date">` nativos simples.

## Diseño propuesto

**Backend:** `GET /api/registros` (nuevo, en `serviceRecordRoutes.ts` + `serviceRecordController.ts::getServiceRecords`). Query params: `page`, `limit` (validados `isInt`), `clientId`/`serviceId`/`professionalId` (opcionales, `isMongoId`), `dateFrom`/`dateTo` (opcionales, `isISO8601`). Filtro: `{ tenantId, ...(clientId && {client: clientId}), ...(serviceId && {service: serviceId}), ...(professionalId && {professional: professionalId}), ...(dateFrom||dateTo && {serviceDate: {$gte, $lte}}) }`. Sort `serviceDate: -1`, `skip/limit` PAGE_SIZE=7. Reusar el `.populate()` de `getClientRecords`. Respuesta `{ data, meta: {total, page, limit, totalPages} }`.

**Frontend:** vista nueva `apps/client/src/views/Historial.tsx`, ruta `/historial` en `router.tsx` + entrada sidebar en `AppLayout.tsx` (icono `FiClock`/`FiList`). Función `getServiceRecords` en `serviceRecordApi.ts`, tipo `Paginated<T>` nuevo en `types/index.ts`. Sigue P3 al pie de la letra (queryKey con todos los filtros, `keepPreviousData`, reset de página, componente `Pagination` de P6 si existe o crearlo).

## Archivos a tocar
- **Backend:** `apps/server/src/models/ServiceRecord.ts` (índice nuevo), `apps/server/src/controllers/serviceRecordController.ts` (nuevo `getServiceRecords`), `apps/server/src/routes/serviceRecordRoutes.ts` (nuevo `GET /`).
- **Frontend:** `apps/client/src/views/Historial.tsx` (nuevo), `apps/client/src/api/serviceRecordApi.ts` (nueva función + params), `apps/client/src/types/index.ts` (`Paginated<T>` nuevo), `apps/client/src/router.tsx`, `apps/client/src/layouts/AppLayout.tsx`.

## Ambigüedades de producto sin resolver
- Rol con acceso a `/historial` (¿todos, o excluir RECEPTIONIST como Inventario?).
- ¿Selects de cliente/servicio/profesional cargan catálogo completo (como RegistroModal) o requieren búsqueda server-side si la base de clientes crece mucho?
- Formato de exportación (Excel/CSV) no mencionado en el pedido — confirmar si está fuera de alcance de UX-30.
