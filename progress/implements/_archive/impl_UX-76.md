# impl_UX-76 — Eliminar gráfico de barras "Servicios de la semana" del Dashboard

## Alcance
Único archivo tocado: `apps/client/src/views/Dashboard.tsx`.

## Qué se eliminó

1. **JSX del bloque wine "Servicios de la semana"** (`bg-wine rounded-card p-6`):
   - `<div className="flex items-end gap-2 mt-5" style={{ height: '56px' }}>...</div>` — barras por día (`DAY_LABELS.map`, `heightPct`, `isToday`).
   - `<div className="flex gap-2 mt-1.5">...</div>` — etiquetas de día (L, M, X, J, V, S, D) debajo de las barras.

2. **Código muerto que solo alimentaba el gráfico** (verificado con `grep` que no se usaba en ningún otro lugar del archivo antes de borrar cada símbolo):
   - `const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];` (línea ~31).
   - `const dayCounts = [0, 0, 0, 0, 0, 0, 0];` + el `.forEach` que lo llenaba con `getUTCDay()`.
   - `const maxDayCount = Math.max(...dayCounts, 1);`
   - `const todayIdx = (new Date().getDay() + 6) % 7;`
   - `const weekRecords = weekRecordsPage?.data ?? [];` — **hallazgo no obvio**: el brief indicaba conservar `weekRecords` porque "alimenta el número total", pero al revisar su único uso real era `weekRecords.forEach(...)` dentro del cálculo de `dayCounts` (el gráfico eliminado). `totalThisWeek` se deriva de `weekRecordsPage?.meta.total`, no de `weekRecords.length` ni de iterar el array. Tras eliminar `dayCounts`, `weekRecords` quedaba sin ningún otro consumidor → variable muerta que rompía el build por `noUnusedLocals`. Se eliminó junto con el resto del bloque muerto. `weekRecordsPage` (la query) y `totalThisWeek` se conservaron intactos, tal como se pidió.

## Qué se conservó sin cambios
- Título `<p>` "Servicios de la semana".
- Número grande `{totalThisWeek}` con su skeleton `isLoadingWeek`.
- Subtítulo "{totalThisWeek} servicio(s) registrado(s) esta semana".
- Fondo wine del bloque (`bg-wine rounded-card p-6`).
- Query `weekRecordsPage` (`getServiceRecords` con `weekRange`), `getCurrentWeekRange()` y `totalThisWeek`.
- Resto del archivo (KPIs, próximos turnos, poco stock, próximos retoques, últimos movimientos, modales) sin tocar.

## Verificación

### `pnpm --filter @estetica/client build`
Exit code 0. `tsc -b && vite build` completó sin errores (789 módulos transformados, build en 5.38s). Sin errores de `noUnusedLocals` tras eliminar `weekRecords`/`dayCounts`/`maxDayCount`/`todayIdx`/`DAY_LABELS`.

### `pnpm --filter @estetica/client lint`
Exit code 0. `eslint .` reportó 4 warnings preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` por uso de `watch()` de react-hook-form) — ninguno relacionado con `Dashboard.tsx` ni con este cambio. 0 errores.

## Decisiones técnicas
- No se agregaron librerías ni se reformateó código fuera del bloque tocado.
- El bloque wine quedó con solo 3 elementos (`<p>` título, número/skeleton, `<p>` subtítulo) dentro del mismo `<div className="bg-wine rounded-card p-6">` — sin gráfico.
