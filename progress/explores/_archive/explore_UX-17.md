# Reporte de Exploración — UX-17 (Selector de horario mejorado con slots de disponibilidad)

**Pregunta:** Digest completo de implementación para UX-17 (8 puntos: formulario actual, datos ya cargados, duración de servicio, `checkBusinessHours`, overlap, endpoint de slots, componente reutilizable, convenciones).
**Contexto:** Feature `UX-17` (`feature_list.json`, `status: "in_progress"`, módulo Appointments, Fase 4).
**Timestamp:** 2026-07-07

## Resumen ejecutivo

- El campo de hora hoy es un único `<input type="datetime-local">` (`register('startTime')`) en `apps/client/src/views/Turnos.tsx:580-595`. No hay separación fecha/hora.
- El frontend YA tiene cargada la disponibilidad del negocio (`businessHoursData` vía `getDisponibilidad`) pero la usa solo para pintar `businessHours` de FullCalendar (línea 502), no para el formulario.
- El frontend tiene una query `appointments` (línea 90-99) pero está scopeada al rango visible del calendario (semana/mes) y al filtro superior de profesional (`professionalFilter`, un `<select>` fuera del form) — no al profesional/fecha elegidos dentro del modal. No sirve tal cual para calcular slots libres de un día arbitrario elegido en el form; hace falta una query dedicada.
- No existe ningún endpoint backend de slots (grep "slot" en `apps/server/src` sin resultados). La feature es resolvible 100% en frontend reutilizando `GET /api/disponibilidad` y `GET /api/turnos` ya existentes.
- La duración del servicio ya está disponible en el form vía `selectedService.duration` (`Turnos.tsx:351,555`), poblada desde `Service.duration` (default 60, `apps/server/src/models/Service.ts:16`).
- `checkBusinessHours` (backend) calcula día de semana a partir de un string `YYYY-MM-DD` con `new Date(localDateStr).getUTCDay()` — el frontend puede replicar exactamente esto porque un `<input type="date">` también entrega un string `YYYY-MM-DD`, evitando el bug clásico de off-by-one de timezone.
- Hay un segundo lugar con un campo de hora libre relacionado a "retoques": `RegistroModal.tsx:292` (`nextTouchupDate`, `type="datetime-local"`). Su tratamiento es ambiguo — ver Diagnóstico.

## Hallazgos por punto

### 1. Formulario de turnos actual

`apps/client/src/views/Turnos.tsx`:
- Interface del form (línea 63-69): `client`, `service?`, `professional?`, `startTime: string`, `notes?`.
- Campo de fecha/hora (líneas 579-595), input HTML nativo `datetime-local`, NO `Controller`, usa `register`:
```tsx
<input type="datetime-local"
    min={getNowLocalDateTimeString()}
    {...register('startTime', {
        required: 'La fecha y hora son obligatorias',
        validate: (value) => {
            if (originalStartTimeRef.current && value === originalStartTimeRef.current) return true;
            return new Date(value) >= new Date() || 'La fecha y hora no pueden ser anteriores al momento actual';
        }
    })}
/>
```
- `getNowLocalDateTimeString()` (líneas 57-61) arma `YYYY-MM-DDTHH:mm` en horario local del browser.
- Armado del payload en `onSubmit` (líneas 247-265): si `startTime` no cambió respecto a `originalStartTimeRef.current` (patrón P8 de `docs/patterns-frontend.md:369-396`), se omite del payload; si cambió, se convierte con `new Date(data.startTime).toISOString()`.
- `originalStartTimeRef` (línea 88, seteado en `openEditModal` línea 272, limpiado en creación) — debe seguir funcionando igual si se parte `startTime` en `date`+`time`.
- `handleDateClick` (líneas 213-231) y el botón "Nuevo Turno" (líneas 360-374) también arman manualmente el string `datetime-local` para prellenar `reset()` — ambos puntos de entrada deberán adaptarse.
- `handleEventDrop` (línea 239-245) actualiza `startTime` directo con `.toISOString()` sin pasar por el form — no se ve afectado por UX-17 (drag&drop en el calendario).

### 2. Datos ya disponibles en frontend

- `businessHoursData` (líneas 116-119) vía `getDisponibilidad`, ya con forma completa `{ schedule, blockedDates }`. Hoy solo alimenta `calendarBusinessHours` (líneas 194-203, sombreado visual de FullCalendar) — reutilizable directo para el cálculo de slots.
- `appointments` (líneas 90-99):
```ts
const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ['appointments', dateRange.start, dateRange.end, professionalFilter],
    queryFn: () => getAppointments({ startDate: dateRange.start, endDate: dateRange.end, ...(professionalFilter ? { professional: professionalFilter } : {}) }),
    enabled: !!dateRange.start && !!dateRange.end,
    placeholderData: keepPreviousData,
});
```
  `dateRange` se actualiza únicamente por `handleDatesSet` (FullCalendar `datesSet`, línea 209-211) — el rango visible del calendario. `professionalFilter` es el `<select>` de línea 380-391, independiente del campo `professional` del formulario modal.
  **Gap confirmado:** si el usuario abre "Nuevo Turno" y elige una fecha fuera del rango visible del calendario, o un profesional distinto al filtro superior, `appointments` no contendrá los turnos relevantes → falsos positivos de disponibilidad. Hace falta una query dedicada scopeada a `watch('date')` + `watch('professional')` dentro del modal.

### 3. Duración del servicio

- Backend: `apps/server/src/models/Service.ts:16` — `duration: { type: Number, default: 60 }`.
- Frontend ya la conoce al elegir servicio: `serviceOptions` (`Turnos.tsx:191`, label con `(${s.duration} min)`), `selectedService` derivado de `watch('service')` (líneas 350-351), ya se muestra "Duración estimada: X minutos" (línea 554-556).
- Si no se elige servicio, backend usa 60 min por defecto (`createAppointment` línea 69, `updateAppointment` línea 206) — el frontend debe replicar ese fallback (`selectedService?.duration ?? 60`) para no divergir del cálculo que hará el backend al validar.

### 4. Backend `checkBusinessHours` (forma exacta)

`apps/server/src/controllers/appointmentController.ts:10-48`:
```ts
async function checkBusinessHours(tenantId, startDate, endDate) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant?.businessHours?.schedule || tenant.businessHours.schedule.length !== 7) return null;
    const tz = tenant.timezone || 'America/Argentina/Buenos_Aires';
    const localDateStr = startDate.toLocaleDateString('en-CA', { timeZone: tz }); // "YYYY-MM-DD"
    // startMin/endMin: hh*60+mm de startDate/endDate en tz (toLocaleTimeString 'en-GB')
    const dayOfWeek = new Date(localDateStr).getUTCDay(); // 0=Dom...6=Sáb
    const daySchedule = schedule.find(d => d.day === dayOfWeek);
    if (!daySchedule) return null;
    if (!daySchedule.isOpen) return 'El negocio no atiende ese día de la semana';
    if (startMin < openMin || endMin > closeMin) return 'fuera de horario...';
    if (blockedDates.some(bd => bd.date === localDateStr)) return 'no atiende en esa fecha';
    return null;
}
```
- Forma de `IDaySchedule` (`apps/server/src/models/Tenant.ts:15-18,49-56`): `{ day: 0-6, isOpen: boolean, openTime: 'HH:MM', closeTime: 'HH:MM' }`, array de exactamente 7. `blockedDates: [{ date: 'YYYY-MM-DD', reason? }]`.
- Contrato idéntico del lado cliente en `apps/client/src/api/disponibilidadApi.ts:3-18` (`DaySchedule`, `BlockedDate`, `BusinessHours`), mismo `day` numbering (0=Dom).
- Default cuando el tenant no configuró nada (`disponibilidadController.ts:4-12`): Lun-Sáb 09:00-18:00 (Sáb 09:00-14:00), Domingo cerrado. `getDisponibilidad` (controller) devuelve este default si `schedule.length !== 7`, así que `GET /api/disponibilidad` SIEMPRE devuelve un `schedule` de 7 días válido — el frontend no necesita replicar el fallback default por su cuenta.
- Gotcha de timezone a replicar con cuidado: el backend calcula `dayOfWeek` a partir de un string `YYYY-MM-DD` derivado de la tz del tenant. El frontend parte de un `<input type="date">` que ya entrega directamente `YYYY-MM-DD` sin necesidad de conversión de tz — por lo tanto `new Date(dateStr).getUTCDay()` en el frontend da el mismo resultado que el backend, siempre que el día que el usuario ve en el date-picker coincida con el día en la tz del tenant (asunción ya vigente en toda la app: negocio y usuarios en la misma tz, `America/Argentina/Buenos_Aires` por default). No usar `new Date(dateStr + "T00:00:00")` sin `Z` porque eso sí ancla a la tz local del browser y puede correr el día (mismo bug ya documentado en `.claude/rules/frontend.md` sección de Formateo de Fechas).

### 5. Overlap de turnos existentes (backend)

- `createAppointment` (líneas 87-108) y `updateAppointment` (líneas 224-249, con `_id: { $ne: id }` para excluirse a sí mismo) comparten la misma condición Mongo:
```ts
{
  tenantId, professional: professionalId, isActive: true,
  status: { $in: ['pending', 'confirmed'] },
  startTime: { $lt: endDate },
  endTime:   { $gt: startDate }
}
```
  Dos intervalos `[startTime, endTime)` se pisan si `existing.startTime < candidateEnd && existing.endTime > candidateStart`.
- Overlap solo se valida si hay `professionalId` (línea 87, `if (professionalId) {...}`). El frontend debe replicar esto: sin profesional elegido en el form, no filtrar por superposición.
- Estados que ocupan horario: `pending` y `confirmed` únicamente. `cancelled` y `completed` no bloquean.
- `GET /api/turnos` (`getAppointments`, líneas 134-160) siempre filtra `isActive: true` (línea 138) pero no filtra por status salvo que se pase `?status=`, y el validador de ruta (`appointmentRoutes.ts:41`) solo acepta un único valor (`isIn([...])`), no una lista — conviene NO pasar `status` en la query de slots y filtrar client-side los que sean `pending`/`confirmed`.

### 6. Existe un endpoint de slots ya calculado server-side?

No existe. Confirmado por:
- Grep de "slot"/"Slot" en `apps/server/src` -> 0 archivos.
- `apps/server/src/routes/appointmentRoutes.ts` (rutas completas, líneas 1-119) -> solo CRUD + `complete`/`cancel`/`proximos`/`pending-registration`, ningún endpoint de disponibilidad horaria.
- `apps/server/src/routes/disponibilidadRoutes.ts` (líneas 1-25) -> solo `GET /` y `PUT /` de `businessHours`, nada de slots.

La feature se resuelve 100% en frontend combinando `GET /api/disponibilidad` (ya cargado) + `GET /api/turnos` (con query dedicada nueva, ver punto 2) + duración del servicio (ya disponible). El backend sigue siendo la fuente de verdad final (`checkBusinessHours` + overlap en `createAppointment`/`updateAppointment` ya devuelven 400/409) y actúa como red de seguridad si el cálculo frontend difiere.

### 7. Componente de selector reutilizable / otros formularios con hora libre

- Patrón de `<Select>` (react-select) + `Controller` ya usado 3 veces en el mismo form (`client`, `service`, `professional`, líneas 518-577) con `selectStyles` (líneas 31-47) y el mismo shape `{ value, label }`. Es el candidato natural para el nuevo selector de horarios (mismo estilo visual, consistente).
- Alternativa: `docs/design.md` documenta un patrón de "Badges / Pills" (`rounded-full`, sección 4.7) usado hoy para status — podría adaptarse a una grilla de pill-buttons de horario, pero no hay precedente de ese patrón aplicado a un selector de formulario en el código actual; el precedente real y ya auditado es `react-select`.
- Segundo formulario con campo de hora libre relacionado a "retoques": `apps/client/src/components/RegistroModal.tsx:292`:
```tsx
<input type="datetime-local" className="..." {...register('nextTouchupDate')} />
```
  Este campo alimenta `finalNextTouchupDate`, que en `completeAppointment` (backend, `appointmentController.ts:358-378`) crea automáticamente un nuevo `Appointment` (turno de retoque) con `startTime = touchupStart`, `endTime = touchupStart + duration`. Es, en los hechos, un segundo punto donde se agenda un turno futuro con un campo de hora libre.
  Dato relevante: existe un ADR explícito en `progress/history.md` (entrada EP-16): "`completeAppointment` NO valida horario: el turno ya existe; validar al completar puede bloquear registros legítimos fuera de horario". Ese ADR es sobre no bloquear el registro de la visita ya ocurrida, pero `nextTouchupDate` agenda algo a futuro (el retoque), conceptualmente análogo al form de `Turnos.tsx`. La descripción de UX-17 menciona explícitamente "turnos/retoques", pero los 3 criterios de aceptación hablan en singular de "el selector de hora" sin nombrar `RegistroModal` — es ambiguo si el alcance incluye este segundo campo (ver Diagnóstico).
- `RegistroModal.tsx` también tiene `professional` obligatorio (líneas 252-270) y `serviceDate` tipo `date` (líneas 274-276) separado, y conoce `selectedService.duration` (línea 112) — pero no tiene ninguna query de `appointments` cargada (no hay `useQuery(['appointments'...])` en el archivo); habría que agregarla desde cero si se decide incluir este modal en el alcance.

### 8. Convenciones de formularios/selects

- `docs/patterns-frontend.md` P5 (línea 184, "Modal con react-hook-form") es el patrón base para cualquier campo nuevo del form.
- P8 (líneas 369-396, "Validar solo el campo que cambió al editar un registro con valor vencido") es el patrón que ya usa `startTime`/`originalStartTimeRef` — debe preservarse su semántica al partir el campo en fecha+hora.
- `.claude/rules/frontend.md` sección Modales: `useForm` + `reset()` al abrir, `Controller` para campos custom (no-HTML-nativo) como `react-select`.
- `.claude/rules/frontend.md` sección HTML Semántico: si se opta por pill-buttons en vez de `react-select`, cada slot debe ser `<button type="button">` con `cursor-pointer`, nunca `<div onClick>`.
- No aplica el mandato de paginación (P3 es para listados de negocio con `{data, meta}`; los slots de un día son un set acotado).

## Diagnóstico

UX-17 es resolvible enteramente en frontend: los tres insumos necesarios (horario de atención + fechas bloqueadas, turnos existentes del profesional, duración del servicio) ya están modelados y expuestos por endpoints existentes (`GET /api/disponibilidad`, `GET /api/turnos`, `Service.duration`), y el backend ya valida ambas reglas (`checkBusinessHours` + overlap Mongo) como red de seguridad, por lo que no hace falta backend nuevo. El único gap real es que la query `appointments` de `Turnos.tsx` está atada al rango visible del calendario y al filtro superior de profesional, no a la fecha/profesional elegidos dentro del modal, por lo que se necesita una query adicional scopeada a `watch('date')` + `watch('professional')`. El campo `startTime` (`datetime-local` único) debe partirse en fecha + selector de hora, preservando el comportamiento de `originalStartTimeRef`/P8 al editar un turno vencido. Queda una ambigüedad de producto real: si `RegistroModal.tsx:292` (`nextTouchupDate`) entra en el alcance de "retoques" mencionado en la descripción de la feature — hay evidencia de que ese modal crea un `Appointment` real a futuro (mismo objeto de negocio que un turno) pero también un ADR explícito que exime a `completeAppointment` de validar horario, y ese modal hoy no tiene ninguna query de turnos cargada.

## Recomendación

Antes de lanzar el implementer, resolver con el usuario/leader si el alcance de UX-17 incluye `RegistroModal.tsx:292` (`nextTouchupDate`) o se limita a `Turnos.tsx` (recomendado empezar solo por `Turnos.tsx`, que es el caso explícito de "agendar turnos" y el que tiene el ADR de negocio menos ambiguo; tratar el campo de retoque como un follow-up separado si el usuario lo confirma).

### Algoritmo de generación de slots (pseudocódigo, 100% frontend)

```
function getAvailableSlots({ dateStr, professionalId, durationMin, businessHours, dayAppointments, intervalMin = 30, excludeAppointmentId }) {
  // 1. Día bloqueado completo
  if (businessHours.blockedDates.some(bd => bd.date === dateStr)) return [];

  // 2. Horario del día (mismo day-numbering 0=Dom que backend)
  const dayOfWeek = new Date(dateStr).getUTCDay(); // dateStr = "YYYY-MM-DD" de <input type="date">
  const daySchedule = businessHours.schedule.find(d => d.day === dayOfWeek);
  if (!daySchedule || !daySchedule.isOpen) return [];

  const openMin  = toMinutes(daySchedule.openTime);
  const closeMin = toMinutes(daySchedule.closeTime);

  // 3. Turnos existentes del profesional ese día (pending/confirmed, excluyendo el propio si se edita)
  const busy = (dayAppointments || [])
    .filter(a => a.status === 'pending' || a.status === 'confirmed')
    .filter(a => a._id !== excludeAppointmentId)
    .filter(a => !professionalId || a.professional?._id === professionalId)
    .map(a => ({ start: toMinutesFromISO(a.startTime), end: toMinutesFromISO(a.endTime) }));

  // 4. Generar candidatos en pasos de intervalMin, validar que el turno completo (duration) entre antes del cierre
  const slots = [];
  for (let start = openMin; start + durationMin <= closeMin; start += intervalMin) {
    const end = start + durationMin;
    const overlaps = professionalId && busy.some(b => start < b.end && end > b.start);
    const isPast = isToday(dateStr) && start < nowMinutesLocal();
    if (!overlaps && !isPast) slots.push(fromMinutes(start)); // "HH:MM"
  }
  return slots;
}
```

- `intervalMin`: el criterio de aceptación permite 15 o 30 min; no hay precedente de step configurable por tenant. Recomiendo confirmar con el usuario un valor fijo (30 min es consistente con `slotDuration="00:30"` del propio FullCalendar en `Turnos.tsx:450`; 15 min da más granularidad pero listas más largas). Sin preferencia explícita, usar 30 min por consistencia visual con el calendario existente.
- Sin profesional elegido: omitir el filtro de `busy` (igual que el backend omite el chequeo de overlap sin `professionalId`), pero sí aplicar horario de atención.
- Sin servicio elegido: `durationMin = 60` (mismo fallback que `createAppointment`/`updateAppointment`).

### Archivos a tocar (estimado, a validar por el implementer)

1. Nuevo `apps/client/src/utils/timeSlots.ts` — función pura `getAvailableSlots(...)` (sin dependencias de Express/React) + helpers `toMinutes`/`fromMinutes`, testeable en aislamiento.
2. `apps/client/src/views/Turnos.tsx`:
   - Partir `AppointmentFormData.startTime` en dos campos de formulario (ej. `date: string` + `time: string`), recombinar en `onSubmit` a `startTime` ISO igual que hoy.
   - Nueva query `useQuery(['appointments','day', watchedDate, watchedProfessional], ...)` habilitada solo con `isFormModalOpen && watchedDate`, para traer los turnos del día/profesional elegidos en el modal (independiente del `dateRange` del calendario).
   - Reemplazar el `<input type="datetime-local">` de hora por un `<Select>` (react-select + `Controller`, mismo patrón que `client`/`service`/`professional`) cuyas `options` sean el resultado de `getAvailableSlots(...)`, recalculado con `useMemo` dependiendo de `watch('date')`, `watch('professional')`, `selectedService`, `businessHoursData`, `dayAppointments`.
   - Adaptar `handleDateClick`, el botón "Nuevo Turno" y `openEditModal` para prellenar `date`+`time` en vez de un solo string combinado, preservando la semántica de `originalStartTimeRef`/P8 (mostrar la hora original aunque ya no figure en las opciones disponibles calculadas, para no romper la edición de un turno "vencido").
3. Sin cambios de backend — `checkBusinessHours` y el overlap Mongo actúan como validación final (400/409) tal como hoy.

### Riesgo a vigilar en implementación

Si se edita un turno existente y su horario original ya no aparece entre los slots calculados (por ejemplo, porque el turno se agendó fuera del horario configurado actualmente, o porque el propio turno "ocupa" ese slot y se excluye mal del filtro de `busy`), el `<Select>` debe seguir mostrando la opción original aunque no esté en la lista "libre" (agregarla manualmente a `options` si `field.value` no está incluida), replicando el espíritu de P8.
