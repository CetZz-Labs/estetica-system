# Implementación — UX-17: Selector de horario mejorado con slots de disponibilidad

**Feature:** `UX-17` (`feature_list.json`, sandbox: `apps/client/`)
**Fecha:** 2026-07-07
**Digest de referencia:** `progress/explores/explore_UX-17.md`

## Archivos tocados

1. `C:\_dev\Cetzz\shear-system\apps\client\src\utils\timeSlots.ts` (nuevo)
2. `C:\_dev\Cetzz\shear-system\apps\client\src\views\Turnos.tsx` (modificado)
3. `C:\_dev\Cetzz\shear-system\apps\client\src\components\RegistroModal.tsx` (modificado)

## Diff resumido por archivo

### `apps/client/src/utils/timeSlots.ts` (nuevo)

Función pura, sin dependencias de React/Express, importa solo `type Appointment` (`../types`) y `type BusinessHours` (`../api/disponibilidadApi`):

- `toMinutes(time: string): number` / `fromMinutes(minutes: number): string` — helpers `"HH:MM"` ↔ minutos, exportados.
- `getLocalDayRangeISO(dateStr: string): { start; end }` — arma el rango horario local (00:00–23:59:59.999) de un día `"YYYY-MM-DD"` en ISO, con la misma interpretación local que usa el resto de la app al crear un turno (`new Date(localString).toISOString()`). Se usa para scopear las queries de turnos del día, **no** para el cálculo de día-de-semana (son dos cálculos independientes, documentado con comentario `// por qué`).
- `getAvailableSlots({ dateStr, professionalId?, durationMin, businessHours?, dayAppointments?, intervalMin = 15, excludeAppointmentId? }): string[]` — replica exactamente `checkBusinessHours` (backend, `appointmentController.ts:10-48`) y la condición de overlap (`start < b.end && end > b.start`) sobre turnos `pending`/`confirmed`. Día bloqueado (`blockedDates`) o cerrado (`!daySchedule.isOpen`) → `[]`. Genera candidatos desde `openTime` en pasos de `intervalMin` (15 min por defecto) mientras `start + durationMin <= closeMin`. Sin `professionalId`, omite el filtro de superposición (igual que el backend). Descarta horarios ya pasados si `dateStr` es hoy (comparación local).

### `apps/client/src/views/Turnos.tsx`

- `interface AppointmentFormData` → renombrada a `AppointmentFormValues`, con `startTime: string` reemplazado por `date: string` + `time: string`. Se importa el tipo de payload real de la API con alias: `import type { AppointmentFormData as AppointmentApiPayload } from '../api/appointmentApi'` — evita colisión de nombres y mantiene el contrato exacto que esperan `createAppointment`/`updateAppointment`.
- `getNowLocalDateTimeString()` → reemplazada por `getTodayDateString()` (solo fecha, usada como `min` del `<input type="date">`).
- Nueva query `useQuery(['appointments', 'day', watchedDate, watchedProfessional], ...)` (habilitada con `isFormModalOpen && !!watchedDate`, `placeholderData: keepPreviousData`), usa `getLocalDayRangeISO` para construir `startDate`/`endDate` del día elegido — independiente del `dateRange` del calendario grande.
- Nuevo `useMemo` `availableSlots` que llama a `getAvailableSlots(...)` con `watch('date')`, `watch('professional')`, duración de `selectedService` (`?? 60`), `businessHoursData` (ya cargado), `dayAppointments`, y `excludeAppointmentId: editingAppointment?._id`.
- `timeOptions`: agrega `watchedTime` a la lista si no está entre los slots calculados (preserva la hora ya guardada de un turno "vencido" respecto a la configuración actual — mismo espíritu del patrón P8, aplicado también a nuevos turnos si el click en el calendario cae fuera de un slot recalculado).
- Campo de formulario: `<input type="datetime-local">` único → `<input type="date">` (`register('date')`) + `<Select>` de hora (`Controller` + `name="time"`, mismo `selectStyles` que `client`/`service`/`professional`). El `validate` del campo `time` preserva la semántica de P8 (bypass si `${watchedDate}T${value}` coincide con `originalStartTimeRef.current`).
- `handleDateClick`, botón "Nuevo Turno" y `openEditModal` adaptados para prellenar `date`+`time` por separado (antes armaban un solo string `datetime-local`).
- `onSubmit` recombina `data.date` + `data.time` en `combinedStartTime` y lo convierte a ISO igual que antes (`new Date(combinedStartTime).toISOString()`); el contrato del payload hacia el backend (`startTime` ISO) **no cambió**.
- `handleEventDrop` (drag&drop) **no se tocó** — sigue usando `.toISOString()` directo.
- Gotcha de lint resuelto: la primera versión del `validate` del campo `time` llamaba a `watch('date')` inline dentro del JSX, lo que generaba una advertencia *nueva* de "Compilation Skipped" del compilador de React en una línea distinta a la preexistente. Se reemplazó por la variable ya memorizada `watchedDate` (calculada una sola vez cerca del `useForm`), dejando el warning en el mismo lugar/cantidad que ya existía en el baseline (ver sección de Build/Lint).

### `apps/client/src/components/RegistroModal.tsx`

- Nueva interfaz local `RegistroFormValues extends Omit<ServiceRecordPayload, "nextTouchupDate">` con `touchupDate: string` + `touchupTime: string`. `useForm<RegistroFormValues>()` reemplaza a `useForm<ServiceRecordPayload>()`.
- Nueva query `useQuery(['business-hours'], getDisponibilidad, { enabled: isOpen })` — este modal no tenía ninguna carga de horario de atención.
- Nueva query `useQuery(['appointments', 'day', watchedTouchupDate, watchedProfessional], ...)` (scopeada a la fecha del retoque y a la `professional` ya seleccionada en el form, obligatoria en este modal), mismo patrón que en `Turnos.tsx` (`getLocalDayRangeISO`, `placeholderData: keepPreviousData`, `enabled: isOpen && !!watchedTouchupDate`).
- `availableTouchupSlots` / `touchupTimeOptions` (mismo patrón `useMemo` que en `Turnos.tsx`, reutilizando `selectedService.duration` ya existente en el componente, `?? 60` de fallback). `touchupTimeOptions` agrega `watchedTouchupTime` si no está en los slots calculados (no se descarta un retoque prellenado, ej. por "Usar fecha sugerida", aunque caiga fuera de un slot libre).
- `handleUseSuggestedDate` ahora hace `setValue('touchupDate', suggestedDate)` + `setValue('touchupTime', '09:00')` en vez de un solo `setValue('nextTouchupDate', ...)`.
- Campo `nextTouchupDate` (`<input type="datetime-local">`) reemplazado por `<input type="date">` (`register('touchupDate')`) + `<Select>` de hora (`Controller` + `name="touchupTime"`, mismo `selectStyles` ya usado en el resto del form). Validación cruzada mínima: si se completa uno de los dos (fecha/hora) sin el otro, error inline bajo el selector de hora.
- `onSubmit` desestructura `touchupDate`/`touchupTime` del form y arma `nextTouchupDate` ISO (`new Date(`${touchupDate}T${touchupTime}`).toISOString()`) solo si ambos están presentes, preservando el contrato `ServiceRecordPayload` que espera `createServiceRecord`/`completeAppointment`.
- Nada del flujo de stock/insumos/cliente/servicio/profesional se tocó.

## Decisiones técnicas

- **Intervalo de 15 minutos** (parámetro `intervalMin` con default 15 en `getAvailableSlots`), tal como pide el enunciado — el digest había dejado abierta la duda entre 15/30 min recomendando 30 por consistencia visual con FullCalendar, pero la instrucción explícita de esta tarea fija 15 min.
- **`getLocalDayRangeISO` vs. el cálculo de día-de-semana de `getAvailableSlots`:** son dos interpretaciones de fecha deliberadamente distintas y documentadas con comentarios (`// por qué`) en `timeSlots.ts`, para no repetir el bug de timezone ya documentado en `.claude/rules/frontend.md` (`new Date(dateStr).getUTCDay()` para día-de-semana vs. `new Date(`${dateStr}T00:00:00`)` para rango horario local real).
- **Fallback de "no perder el valor ya guardado":** en vez de replicar el ref `originalStartTimeRef` dentro de `timeOptions`, se optó por un criterio más simple y general — si el valor actualmente seleccionado en el campo (`watchedTime` / `watchedTouchupTime`) no figura en los slots recién calculados, se agrega a la lista de opciones. Cubre tanto la edición de un turno "vencido" (P8) como el caso de un click en el calendario grande que cae en un minuto no alineado a la grilla de 15 min, sin depender de si el modal está en modo creación o edición.
- **`AppointmentFormData` (tipo de la API) vs. `AppointmentFormValues` (tipo del form):** se separaron los nombres para evitar que el tipo interno del formulario (con `date`+`time`) colisionara con el contrato real que espera el backend (`startTime` ISO). El payload final sigue siendo idéntico al que se enviaba antes de esta feature.
- **Backend no tocado:** `checkBusinessHours` y el overlap Mongo de `createAppointment`/`updateAppointment` siguen siendo la validación final (400/409); este cambio solo reduce la probabilidad de que el usuario llegue a un rechazo del backend.

## Resultado de build/lint

```
pnpm --filter @estetica/client build
```
→ Exit Code 0 (tsc -b + vite build, sin errores de tipos).

```
pnpm --filter @estetica/client lint
```
→ Exit Code 1, pero el conjunto de problemas es **idéntico al baseline** (verificado con `git stash` + lint sobre el código previo a esta feature):
- 1 error preexistente, no tocado: `ProductoModal.tsx:37:25` (`'stock' is assigned a value but never used`).
- 4 warnings preexistentes de "Compilation Skipped" (React Compiler, `watch()` de react-hook-form no memoizable): `ProfesionalModal.tsx:83`, `Negocio.tsx:73`, y una en cada uno de los dos archivos tocados por esta feature (`RegistroModal.tsx:125`, antes en línea 110; `Turnos.tsx:212`, antes en línea 350). Es la misma categoría de warning que ya existía en ambos archivos antes de UX-17 (por el uso preexistente de `watch('service')` en ambos) — solo se desplazó de línea por las inserciones de código nuevo. No se introdujeron errores ni warnings nuevos.

## Verificación de criterios de aceptación

1. **"El selector de hora presenta opciones en intervalos fijos de 15 min, no texto libre."**
   - `Turnos.tsx`: campo `time` es un `<Select>` (react-select + `Controller`), opciones generadas por `getAvailableSlots(..., intervalMin: 15 por default)`. Verificado en build (sin `datetime-local` remanente para `startTime`).
   - `RegistroModal.tsx`: campo `touchupTime` (retoque) es el mismo tipo de `<Select>`, mismas opciones de 15 min. Verificado (sin `datetime-local` remanente para `nextTouchupDate`).

2. **"Las opciones se filtran según el horario de atención configurado (EP-16) y los turnos existentes del profesional (sin superposición)."**
   - Ambos formularios pasan `businessHoursData` (vía `getDisponibilidad`, ya cargado/agregado) y `dayAppointments`/`touchupDayAppointments` (nueva query scopeada a fecha+profesional) a `getAvailableSlots`, que aplica `blockedDates`, `daySchedule.isOpen`, `openTime`/`closeTime`, y el filtro de overlap `pending`/`confirmed` por `professional._id` — replicando `checkBusinessHours` y la condición Mongo del backend.

3. **"El selector se actualiza dinámicamente al cambiar de fecha o profesional."**
   - En ambos componentes, `availableSlots`/`availableTouchupSlots` son `useMemo` dependientes de `watchedDate`/`watchedTouchupDate` y `watchedProfessional`, y las queries de turnos del día tienen esos mismos valores en su `queryKey` — cualquier cambio de fecha o profesional dispara refetch + recálculo de opciones sin intervención adicional del usuario.

## Notas para el reviewer

- No se tocó `apps/server/`.
- No se agregaron dependencias nuevas (solo se reutilizó `react-select`, `@tanstack/react-query`, `react-hook-form`, ya presentes).
- El campo `RegistroModal.tsx` → `nextTouchupDate` sí quedó incluido en el alcance de esta feature (la instrucción del leader lo confirmó explícitamente, resolviendo la ambigüedad que había dejado abierta `explore_UX-17.md`).
