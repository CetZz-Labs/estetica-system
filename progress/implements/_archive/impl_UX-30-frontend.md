# Bitácora de Implementación — UX-30 (Frontend)

**Feature:** UX-30 — Historial general de visitas (nueva vista propia)
**Alcance de este subagente:** Frontend únicamente (`apps/client/`). Backend ya implementado en paralelo — ver `progress/implements/impl_UX-30-backend.md` (contrato `GET /api/registros` verificado y consumido tal cual: mismos nombres de query params `clientId`/`serviceId`/`professionalId`/`dateFrom`/`dateTo`/`page`/`limit` y misma forma de respuesta `{ data, meta }`).

---

## Archivos modificados/creados

1. **`apps/client/src/types/index.ts`**
   - Nuevo tipo genérico `Paginated<T>` (`{ data: T[]; meta: { total, page, limit, totalPages } }`), agregado al inicio del archivo.

2. **`apps/client/src/api/serviceRecordApi.ts`**
   - Nueva interfaz `ServiceRecordListParams` (`page`, `limit`, `clientId?`, `serviceId?`, `professionalId?`, `dateFrom?`, `dateTo?`).
   - Nueva función `getServiceRecords(params)` → `GET /registros` con esos query params, tipada `Promise<Paginated<ServiceRecord>>`.

3. **`apps/client/src/components/ui/Pagination.tsx`** (nuevo)
   - Componente reutilizable de paginación siguiendo `docs/patterns-frontend.md § P6`: rango "Mostrando X–Y de N" con `aria-live="polite"`, botones nativos `<button type="button">` con `cursor-pointer`/`disabled:cursor-not-allowed`, iconos `FiChevronLeft`/`FiChevronRight`. No existía ningún componente de paginación previo en el repo (primer consumidor real de P6 en el código).

4. **`apps/client/src/views/Historial.tsx`** (nuevo)
   - Vista "Historial de Visitas": filtros (Select de cliente/servicio/profesional cargando catálogo completo activo vía `useQuery`, mismo patrón que `RegistroModal.tsx`; 2 `<input type="date">` nativos para rango desde/hasta, no existía date-range picker previo) + botón "Limpiar filtros" (visible solo si hay algún filtro activo).
   - Consumo P3 al pie de la letra: `queryKey: ['service-records', { page, limit: PAGE_SIZE, ...filters }]` (incluye todos los filtros activos), `placeholderData: keepPreviousData`, `PAGE_SIZE = 7` (coincide con el backend). Cada handler de cambio de filtro resetea `page` a 1.
   - Tabla con columnas Cliente, Servicio, Fecha (`formatCalendarDate` sobre `serviceDate`, date-only con `timeZone: 'UTC'` — evita el off-by-one de Argentina), Profesional (color-dot + nombre, o "Sin asignar" con ícono), Productos usados (lista abreviada `nombre (cantidad)` truncada), Notas (truncada con ícono).
   - 4 estados cubiertos dentro del `<tbody>`: loading (5 filas skeleton `animate-pulse`), error (trifecta color+icono `FiAlertCircle`+texto, sin toast — mismo criterio ya usado en `Clients.tsx`/`Profesionales.tsx`, TanStack Query v5 no soporta `onError` en `useQuery`), empty (mensaje distinto si hay filtros activos vs. sin datos en absoluto, ícono `FiClock`), data.
   - Contador de `meta.total` (nunca `data.length`), `<Pagination>` solo se renderiza si hay datos.
   - Sin exportación Excel/CSV (fuera de alcance, decisión de producto ya cerrada).

5. **`apps/client/src/router.tsx`**
   - Import de `Historial` y nueva ruta `<Route path="/historial" element={<Historial />} />` dentro de `<Route element={<AppLayout/>}>`, sin `ProtectedRoute` (accesible a todos los roles, igual que `/turnos`).

6. **`apps/client/src/layouts/AppLayout.tsx`**
   - Nueva entrada de sidebar `<NavLink to="/historial">Historial de Visitas</NavLink>` entre "Turnos" y la sección "Equipo" (visible para todos los roles). Se decidió **no** agregar un ícono inline al link (a diferencia de lo sugerido originalmente) porque ninguna otra entrada del `<nav>` existente (Inicio, Clientes, Servicios, Turnos, Inventario) usa ícono — se replicó el patrón real existente al pie de la letra en vez de introducir una inconsistencia visual.

---

## Decisiones técnicas / Hallazgos

- No existe `useDebounce` en el repo y no hace falta: los filtros de esta vista son selects (catálogo acotado) + inputs de fecha, no hay buscador de texto libre, por lo que P3 se aplica sin debounce (cada cambio de filtro dispara la query inmediatamente, ya con `keepPreviousData` evitando parpadeo).
- `selectStyles` se duplicó localmente en `Historial.tsx` (mismo objeto que `RegistroModal.tsx`/`Turnos.tsx`) en vez de extraerlo a un módulo compartido — no hay precedente de extracción en el repo y está fuera del alcance parametrizado de esta tarea.
- `Pagination.tsx` es el primer componente de paginación real del repo (P6 documentado pero nunca implementado, confirmado por el explorer). Queda disponible para que futuras vistas que migren a P1/P3 (Clientes, Inventario) lo reutilicen.

## Build y Lint

```
pnpm --filter @estetica/client build
```
**Exit code: 0.** `tsc -b && vite build` completado sin errores (bundle único, warning preexistente de tamaño de chunk >500kB no relacionado con esta feature).

```
pnpm --filter @estetica/client lint
```
**Exit code: 1**, pero el único `error` reportado es el preexistente y aceptado `ProductoModal.tsx:37:25` ('stock' is assigned a value but never used) — no introducido por esta feature. Los demás hallazgos son `warning`s preexistentes de React Compiler sobre `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` (no tocados por esta feature). Ningún archivo nuevo/modificado por esta tarea generó errores ni warnings nuevos.

## Pendiente (fuera de este sandbox)

- Reviewer: validar contra `CHECKPOINTS.md`, correr build/lint de ambos sandboxes en conjunto, y marcar `UX-30` como `"done"` en `feature_list.json` si el veredicto es verde.
