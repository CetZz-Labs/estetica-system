# impl_UX-77 — Eliminar tarjeta "Servicios de la semana" del Dashboard

## Archivo modificado
- `apps/client/src/views/Dashboard.tsx` (único archivo tocado, sandbox frontend)

## Qué se eliminó
1. Bloque JSX completo de la tarjeta wine "Servicios de la semana" (título, número, subtítulo, fondo `bg-wine`) dentro del panel lateral de la sección "Turnos del día + panel lateral".
2. Función `getCurrentWeekRange()` (calculaba lunes/domingo de la semana actual) — verificado con grep que no tenía otros usos en el archivo.
3. Bloque `useQuery` de `weekRecordsPage`/`isLoadingWeek` (queryKey `['service-records-week', ...]`), la variable `weekRange` y su comentario asociado (`/** Lunes y domingo... */`).
4. Variable derivada `totalThisWeek` y el comentario que la precedía ("Bloque destacado wine (§7.5)...").
5. Import `getServiceRecords` de `../api/serviceRecordApi` (sin otros usos en el archivo — se conservan `getDashboardStats`, `getUpcomingTouchups`, `getRecentRecords`, `updateServiceRecord`).
6. Import de tipo `Paginated` de `../types` (sin otros usos en el archivo — se conservan `ServiceRecord`, `Appointment`, `Product`).

## Qué se conservó
- Todo el resto del archivo intacto: KPIs, alerta de turnos pendientes de registrar, "Próximos turnos", "Poco stock", "Próximos retoques", "Últimos movimientos", ambos modales (`Modal` de detalle de turno/retoque, `RegistroModal`, `ConfirmModal`).
- El grid `grid-cols-1 lg:grid-cols-3` de la sección "Turnos del día + panel lateral" se mantiene: columna izquierda ("Próximos turnos", `lg:col-span-2`) + columna derecha ahora solo con la tarjeta "Poco stock" (antes compartía un wrapper `<div className="flex flex-col gap-6">` con la tarjeta wine).

## Decisión técnica: simplificación del wrapper lateral
El wrapper `<div className="flex flex-col gap-6">` que envolvía "Poco stock" + la tarjeta wine quedaba redundante con un solo hijo (un `flex-col gap-6` de un único elemento no aporta nada visualmente). Se eliminó el wrapper y la tarjeta "Poco stock" pasó a ser directamente el segundo hijo del grid de 3 columnas (mismo comportamiento visual: ocupa 1 columna en `lg:`, igual que antes). Se corrigió la indentación de todo el bloque interno de "Poco stock" (estaba desalineado 4 espacios de más tras remover el wrapper).

## Resultado de verificación
- `pnpm --filter @estetica/client build` → **exit code 0**. Compiló `tsc -b` sin errores (confirma que no quedaron imports/variables sin usar, ya que `noUnusedLocals` está activo) + `vite build` exitoso.
- `pnpm --filter @estetica/client lint` → **exit code 0**. Solo 4 warnings preexistentes de `react-hooks/incompatible-library` (`watch()` de react-hook-form) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx` — ninguno relacionado con `Dashboard.tsx` ni introducido por este cambio.

## Hallazgos
Ninguno adicional. El cambio fue puramente de eliminación (JSX + estado derivado + query + imports), sin tocar lógica de negocio, sin agregar dependencias.
