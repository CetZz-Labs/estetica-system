# Explore Digest — UX-69 (Historial de cliente: visita pasada + paginación/filtros)

**Fecha:** 2026-08-04 · **Autor:** leader (lectura directa, sin subagente explorer — hallazgos ya verificados línea por línea)

## Estado actual (backend)

- `apps/server/src/controllers/serviceRecordController.ts`
  - `createServiceRecord` (líneas 12-135): **no valida `serviceDate` contra "hoy"**. Solo valida `nextTouchupDate` (UX-27, `isBeforeCalendarDay(new Date(finalNextTouchupDate), new Date(), tz)`, líneas 46-52) — ese es el patrón exacto a reusar para el nuevo guard de `serviceDate`.
  - `getClientRecords` (líneas 183-198, `GET /api/registros/cliente/:clientId`): `ServiceRecord.find({ tenantId, client: clientId }).sort(...)` **sin `skip`/`limit`/filtros**, devuelve un array plano (no `{data, meta}`). Contrasta con `getServiceRecords` (líneas 141-180), que SÍ implementa el patrón P1 completo (page/limit validados, `dateFrom`/`dateTo` sobre `serviceDate`, `Promise.all([find, countDocuments])`, contrato `{ data, meta }`) — es el template a copiar 1:1, ajustando el filtro base a `{ tenantId, client: clientId }`.
  - `isBeforeCalendarDay` vive en `apps/server/src/utils/dateUtils.ts` y ya usa la timezone del tenant (`Tenant.findById(tenantId).timezone`, default `'America/Argentina/Buenos_Aires'`) — mismo patrón a reusar para el guard nuevo de `serviceDate`.

## Estado actual (frontend)

- `apps/client/src/components/RegistroModal.tsx`: input `serviceDate` (línea 338) **sin `min`**, a diferencia de `touchupDate` (línea 356, `min={getTodayDateString()}`). `getTodayDateString()` ya existe en `apps/client/src/utils/dates.ts` — reusar directo.
  - El modal ya soporta `preselectedClientId` (prop existente) y se abre tanto standalone (Dashboard) como con `appointmentId` (completar turno). Cualquier prop nuevo para el modo "visita pasada" debe convivir con esos dos usos sin romperlos.
- `apps/client/src/views/ProfileClient.tsx` (`PerfilCliente`): sección "Historial de Visitas" (líneas 108-187) — hoy usa `useQuery(['client-history', id], () => getClientRecords(id!))` sin paginar, renderiza timeline completo. Es donde va el botón nuevo "Registrar visita pasada" + los controles de paginación/filtro de fecha.
- `apps/client/src/api/serviceRecordApi.ts`: `getClientRecords(clientId)` devuelve `ServiceRecord[]` directo (línea 47-50) — hay que migrarlo a `Paginated<ServiceRecord>` con params, mismo shape que `getServiceRecords(params: ServiceRecordListParams)` (líneas 28-44), que ya es el template a copiar.
- Referencia de patrón de paginación en UI ya funcionando: `apps/client/src/views/Historial.tsx` (consume `getServiceRecords`) — mismo patrón de controles de paginación a reusar en `ProfileClient.tsx`.

## Decisión de diseño abierta (a resolver el implementer, no bloqueante)

Cómo distinguir "creación normal" (rechaza fecha pasada) de "creación de visita pasada" (exige fecha pasada) en el mismo endpoint `POST /api/registros`. Propuesta en `feature_list.json` (UX-69): flag explícito `isBackfill: true` en el body, con validación cruzada (si `isBackfill` es true, `serviceDate` DEBE ser < hoy; si es false/ausente, `serviceDate` DEBE ser >= hoy). Evita crear un endpoint nuevo. El frontend puede reusar `RegistroModal.tsx` con un prop `pastVisitMode` que invierte el `min`/validación del input y setea el flag al enviar.

## Patrones a seguir

- Backend: `docs/patterns-backend.md` §P1 (listado paginado con multi-tenancy) para `getClientRecords`.
- Frontend: `docs/patterns-frontend.md` §P3 (consumo de listado paginado) para el consumo en `ProfileClient.tsx`.
