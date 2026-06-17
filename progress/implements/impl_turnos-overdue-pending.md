# Ajuste visual: distingo de turno "pendiente vencido" en Turnos.tsx

> Nota: este NO es un item de `feature_list.json`. Ajuste de pulido visual acordado directamente con el usuario, sin impacto en `progress/current.md`.

## Archivo modificado

- `apps/client/src/views/Turnos.tsx` (único archivo tocado)

## Resumen del cambio

Se agregó un distingo visual para turnos con `status === 'pending'` cuya `endTime` ya pasó, sin alterar el campo `status` real ni la lógica de negocio. El tratamiento es puramente de renderizado:

1. **Helper `isOverduePending(appointment)`**: determina si un turno pendiente está vencido comparando `endTime` contra `new Date()`. No muta ningún dato.
2. **Helper `getRenderStatus(appointment)`**: devuelve `'overdue'` si `isOverduePending` es true, o el `status` real en cualquier otro caso. Este valor derivado reemplaza el uso directo de `appointment.status`/`selectedAppointment.status` en todos los puntos de renderizado de color/ícono/label.
3. **`STATUS_PALETTE`**: nueva entrada `overdue` con los mismos tonos rojos que `cancelled` (`bg: '#FEF2F2', border: '#FECACA', text: '#E06B5E'`) — mismo significado semántico de "atención urgente" (consistente con la convención rojo = atrasado de AGENTS.md §3.6), pero diferenciado por ícono.
4. **`getStatusIcon`**: nuevo caso `'overdue'` → `<FiAlertTriangle />` (importado de `react-icons/fi`, catalogado en `docs/design.md` §10 para alertas). El ícono de `cancelled` (`FiX`) y los demás quedaron intactos.
5. **`getStatusLabel`**: nuevo caso `'overdue'` → `'Atrasado'` (mismo término que usa el Dashboard para retoques vencidos).
6. **Puntos de aplicación de `getRenderStatus`**:
   - `useMemo` de `events`: la paleta de color del chip de calendario (mes y semana) ahora usa `getStatusPalette(getRenderStatus(a))`.
   - `eventContent` del `FullCalendar`: el ícono del chip ahora usa `getStatusIcon(getRenderStatus(appointment))`.
   - Badge de estado del modal de detalle (~línea 554-562 original): el bloque condicional de clases ahora evalúa `getRenderStatus(selectedAppointment)` en lugar de `selectedAppointment.status` crudo, agregando la rama `'overdue' → bg-red-50 text-maison-red border-red-200` (mismas clases que `cancelled`, pero el ícono y label vienen de `getStatusIcon`/`getStatusLabel` que sí distinguen ambos casos).

## Fuera de alcance (no tocado)

- Lógica de negocio: creación, edición, cancelación, completar turno.
- Footer del modal de detalle (`detailFooter`), toolbar del calendario.
- El campo real `status` del turno — nunca se envía ni modifica, solo se deriva para renderizado.
- `feature_list.json` y `progress/current.md` — no aplica, no es una feature del backlog.

## Resultado de verificación

### Build
```
pnpm --filter @estetica/client build
```
Resultado: **Exit Code 0**. `tsc -b && vite build` completado sin errores. Bundle generado correctamente (`dist/assets/index-*.js`, warning preexistente de tamaño de chunk > 500kB no relacionado con este cambio).

### Lint
```
pnpm --filter @estetica/client lint
```
Resultado: **Exit Code 1**, pero el único error (`'stock' is assigned a value but never used` en `apps/client/src/components/ProductoModal.tsx:37`) es preexistente y no relacionado — `ProductoModal.tsx` no fue tocado en esta tarea (confirmado vía `git diff --stat`, sin cambios pendientes en ese archivo). Los dos warnings restantes (`Negocio.tsx:73` y `Turnos.tsx:356`, ambos sobre incompatibilidad del React Compiler con `watch()` de react-hook-form) son preexistentes; la línea de `Turnos.tsx` señalada por el warning no fue modificada, solo se desplazó de número de línea por las inserciones realizadas más arriba en el archivo.

No se modificó ningún otro archivo además de `Turnos.tsx`.
