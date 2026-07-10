# Reporte de Exploración — UX-27 (nextTouchupDate acepta fechas pasadas)

**Pregunta:** ¿Dónde falta la validación que impida guardar una visita con `nextTouchupDate` anterior a la fecha de la visita, y qué patrón de UX-12 hay que replicar?
**Contexto:** Feature UX-27 (bug), precedente directo UX-12 (appointments)
**Timestamp:** 2026-07-10

## Hallazgos

1. `apps/server/src/controllers/serviceRecordController.ts:37-38`: `createServiceRecord` toma `nextTouchupDate` del body tal cual (`const finalNextTouchupDate = nextTouchupDate;`) — **cero validación** contra `serviceDate` ni contra "ahora". Causa raíz principal.
2. `apps/server/src/controllers/appointmentController.ts:305,340-350` (`completeAppointment`): segundo entry point que crea `ServiceRecord` (usado por `RegistroModal` cuando viene de un turno, ver `RegistroModal.tsx:204-209`). Mismo problema: `finalNextTouchupDate = nextTouchupDate` sin chequeo contra `serviceDate = appointment.startTime`. **Debe corregirse en los dos controllers**, no solo en uno.
3. `apps/server/src/controllers/serviceRecordController.ts:164-194` (`updateServiceRecord`): whitelist incluye `nextTouchupDate` como editable sin validar contra `serviceDate` existente del registro. Falta decidir si aplica ahí también.
4. Patrón UX-12 ya aplicado en `appointmentController.ts:81-84` (create) y `:192-195` (update): compara **contra `Date.now()`** (`startDate.getTime() < Date.now()`), no contra otra fecha de negocio — caso distinto al de UX-27, donde el bug pide comparar contra `serviceDate` (la fecha de la visita), que puede ser pasada legítimamente (se puede cargar una visita retroactiva). **No es el mismo eje de comparación** — replicar el mensaje/status (400 + `error: '...'`) pero no la comparación contra `Date.now()`.
5. Frontend UX-12 (`Turnos.tsx:660-665`): usa atributo nativo `min={getTodayDateString()}` en el `<input type="date">` — es un helper **local** a `Turnos.tsx` (línea 55), no compartido. No hay validación inline con `react-hook-form` `validate` para la regla de negocio; se apoya en el 400 del backend + `handleApiError` (toast).
6. `apps/client/src/components/RegistroModal.tsx:354-381`: `touchupDate` (input date) **no tiene `min`** ni regla `validate` de fecha mínima. Solo `touchupTime` tiene un `validate` (líneas 359-366) que exige par fecha+hora, nada relacionado a orden temporal. El payload arma `nextTouchupDate` en líneas 228-236 combinando `touchupDate` + `touchupTime` sin chequear contra `serviceDate` (línea 337, watched como `watchedServiceDate`).
7. `handleUseSuggestedDate` (`RegistroModal.tsx:171-180`, EP-05) calcula `touchupDate` sumando `defaultTouchupDays` a `watchedServiceDate` — siempre da una fecha posterior a la visita, por lo que el fix **no debe tocar esta función**; solo hay que asegurar que la validación nueva no la contradiga (ese flujo ya cumple la regla, sirve de caso de test "camino feliz").
8. `apps/server/src/models/ServiceRecord.ts:16`: `nextTouchupDate: { type: Date, index: true }` — no requerido, sin validador propio a nivel schema. `serviceDate` (línea 30) es el campo de la fecha de la visita (nombre confirmado, no `date`/`visitDate`).
9. `apps/server/src/routes/serviceRecordRoutes.ts:59,74` y `apps/server/src/routes/appointmentRoutes.ts:72`: `nextTouchupDate` solo tiene `isISO8601()` vía express-validator, sin `.custom()` que compare contra `serviceDate`/`startTime` del mismo body — es el lugar natural para agregar la regla en backend (o alternativamente inline en el controller, siguiendo el estilo ya usado para UX-12 que fue inline en el controller, no en la ruta).
10. `docs/patterns-backend.md` y `docs/patterns-frontend.md`: no existe ningún patrón documentado de "validación de fecha no pasada" — es candidato a promoverse a `patterns-backend.md` una vez implementado (regla del CLAUDE.md sobre extraer reutilizables).

## Diagnóstico

El bug es real y reproducible: ni `createServiceRecord` ni `completeAppointment` (los dos paths que generan `ServiceRecord`) validan que `nextTouchupDate` sea posterior a `serviceDate`; tampoco lo hace `updateServiceRecord` al editar. El frontend (`RegistroModal.tsx`) no tiene `min` ni `validate` en el campo `touchupDate`, a diferencia de `Turnos.tsx` que sí usa `min={getTodayDateString()}` para UX-12. La comparación correcta para UX-27, según el reporte del usuario, es `nextTouchupDate >= serviceDate` (la fecha de la visita, que puede estar en el pasado si se carga una visita retroactiva), **no** `nextTouchupDate >= now()` como en UX-12 — son ejes de comparación distintos y no intercambiables. El flujo EP-05 de sugerencia automática (`handleUseSuggestedDate`) ya es compatible con la nueva regla y no debe tocarse.

## Recomendación

Antes de implementar, el leader debe resolver con el usuario estas ambigüedades de producto:
1. **Eje de comparación:** ¿`nextTouchupDate` debe ser posterior a `serviceDate` (fecha de la visita, como pide el reporte) o a `Date.now()` (como UX-12)? El texto del bug apunta a `serviceDate`, pero conviene confirmarlo explícitamente porque cambia el `.custom()` validator.
2. **¿Igualdad permitida?** ¿`nextTouchupDate === serviceDate` (mismo día) es válido o debe ser estrictamente posterior (`>`)?
3. **Alcance:** ¿aplica solo a `createServiceRecord` + `completeAppointment` (creación), o también a `updateServiceRecord` (edición, donde `serviceDate` puede venir del registro existente y no del body)?

Archivos a tocar (una vez resuelta la ambigüedad): `apps/server/src/controllers/serviceRecordController.ts` (createServiceRecord, y updateServiceRecord si aplica), `apps/server/src/controllers/appointmentController.ts` (completeAppointment), `apps/client/src/components/RegistroModal.tsx` (agregar `validate`/`min` al campo `touchupDate`, en el mismo espíritu de `Turnos.tsx:661` pero comparando contra `watchedServiceDate` en vez de contra hoy). **No tocar** `handleUseSuggestedDate`, `checkBusinessHours`, la lógica de auto-completado de retoques (UX-13, líneas 61-77/324-337), ni la validación `touchupTime` existente (líneas 359-366).
