# Bitácora de Implementación — EP-16 Frontend

**Feature:** EP-16 — Configuración de disponibilidad del negocio  
**Agente:** implementer-frontend  
**Fecha:** 2026-06-30

---

## Archivos Creados

### `apps/client/src/api/disponibilidadApi.ts`
Módulo de API nuevo. Exporta las interfaces `DaySchedule`, `BlockedDate`, `BusinessHours` y las funciones `getDisponibilidad` (GET `/disponibilidad`) y `updateDisponibilidad` (PUT `/disponibilidad`). Patrón idéntico a `tenantApi.ts`.

### `apps/client/src/views/Disponibilidad.tsx`
Vista principal de la feature. Dos secciones:
- **Horario de atención:** 7 filas (orden Lunes–Sábado–Domingo), cada fila con toggle ARIA `role="switch"` + `aria-checked` + dos `<input type="time">` deshabilitados cuando el día está cerrado.
- **Días no laborables:** formulario inline (fecha + motivo opcional + botón "Agregar") + lista ordenada por fecha con botón de eliminación.

**Decisión de estado:** se evitó el patrón `useEffect` + `setState` (que genera error `react-hooks/set-state-in-effect` en el React Compiler). En su lugar se usa un patrón "dirty state": `localSchedule` y `localBlockedDates` arrancan en `null` y solo se populan al primer edit del usuario. Los valores efectivos se derivan como `localSchedule ?? data?.schedule ?? DEFAULT_SCHEDULE`. Al guardar con éxito, el local state se limpia a `null` y la query refetch provee la nueva fuente de verdad. Esto evita cascading renders y es compatible con el React Compiler.

---

## Archivos Modificados

### `apps/client/src/utils/dates.ts`
Agregada función `formatCalendarDate(dateString: string): string` que formatea una fecha date-only (`YYYY-MM-DD`) forzando `timeZone: 'UTC'` mediante `Intl.DateTimeFormat`. Previene el desfase de un día en Argentina (UTC-3) al parsear strings date-only.

### `apps/client/src/views/Turnos.tsx`
- Import: `getDisponibilidad` y `BusinessHours` desde `disponibilidadApi`.
- Query adicional: `useQuery<BusinessHours>({ queryKey: ['business-hours'], queryFn: getDisponibilidad })`.
- useMemo `calendarBusinessHours`: convierte el schedule al formato de FullCalendar (`{ daysOfWeek, startTime, endTime }`). Retorna `true` (FullCalendar default: todo abierto) si no hay datos.
- Prop `businessHours={calendarBusinessHours}` agregada a `<FullCalendar>` para sombrear visualmente las horas fuera del horario en vistas timeGrid.

### `apps/client/src/router.tsx`
- Import `Disponibilidad` desde `./views/Disponibilidad`.
- Ruta nueva: `<Route path="/configuracion/disponibilidad" element={<ProtectedRoute roles={['ADMIN']}><Disponibilidad /></ProtectedRoute>} />` dentro del bloque `<Route element={<AppLayout />}>`.

### `apps/client/src/layouts/AppLayout.tsx`
Reemplazado el enlace único "Configuración" por un bloque con sección etiquetada:
- Label: `Configuración` (estilo `text-[10px] font-semibold tracking-widest uppercase` igual al bloque "Equipo")
- NavLink: `/configuracion/negocio` → "Mi Negocio"
- NavLink: `/configuracion/disponibilidad` → "Disponibilidad"

---

## Decisiones de Diseño/UX

- **Toggle accesible:** `<button role="switch" aria-checked={...}>` en vez de `<input type="checkbox">`. Incluye `aria-label` descriptivo.
- **Trifecta de accesibilidad:** el toggle usa color (`bg-maison-primary` / `bg-gray-300`) + posición visual del thumb como indicador de estado. Los campos de hora deshabilitados muestran `opacity-40 cursor-not-allowed` para señal adicional.
- **Orden de días:** Lunes→Domingo (array `DAY_ORDER = [1,2,3,4,5,6,0]`) — convenio local argentina.
- **Fechas UTC:** uso de `formatCalendarDate` en la lista de días bloqueados; evita el off-by-one day UTC-3.
- **Botón Guardar:** no está dentro de un `<form>` (es `type="button"` + `onClick`) porque la vista usa `useState` sin react-hook-form y no hay submit implícito.

---

## Resultado del Build y Lint

### Build: `pnpm --filter @estetica/client build`
```
✓ 695 modules transformed.
✓ built in 879ms
Exit Code: 0
```

### Lint: `pnpm --filter @estetica/client lint`
```
✖ 5 problems (1 error, 4 warnings)
```
- 1 error preexistente: `ProductoModal.tsx:37` — `'stock' is assigned a value but never used` (conocido, documentado en progress/current.md)
- 4 warnings preexistentes: `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` (todos preexistentes, no introducidos por esta feature)
- 0 errores nuevos introducidos por EP-16.
