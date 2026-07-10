# Implementación — UX-28 (frontend)

**Feature:** Edición inline de la fecha/hora del próximo retoque desde el modal "Detalle del Retoque" del Dashboard.

## Archivos modificados

- `apps/client/src/views/Dashboard.tsx`
  - Import: agregado `useRef`, `FiEdit2` (react-icons/fi) y `getTodayDateString` (utils/dates).
  - Nuevo estado local: `isEditingTouchupDate`, `touchupDateInput`, `touchupTimeInput`, `originalTouchupIsoRef` (useRef).
  - Nuevos handlers: `openRetoqueDetail` / `closeRetoqueDetail` (wrappers que sincronizan `selectedRetoqueDetail` + reset de `isEditingTouchupDate` para que el modo edición nunca quede "pegado" al abrir/cerrar el modal o cambiar de retoque), `handleStartEditTouchupDate`, `handleCancelEditTouchupDate`, `handleSaveTouchupDate`.
  - Nueva mutation `saveTouchupDate` (`useMutation` sobre `updateServiceRecord(id, { nextTouchupDate })`, ya existente en `api/serviceRecordApi.ts`). En `onSuccess` actualiza `selectedRetoqueDetail` localmente con el nuevo `nextTouchupDate` (merge parcial, sin reemplazar `client`/`service`/`professional` porque el `PUT` del backend no popula esos campos en la respuesta), invalida `['upcoming-touchups']` y `['dashboard-stats']`, resetea a modo lectura y dispara `toast.success`. `onError` usa `handleApiError`.
  - Bloque JSX del campo "Retoque: {fecha}" (dentro del modal de detalle) ahora renderiza condicionalmente: modo lectura (texto igual que antes) vs. modo edición (`<input type="date" min={getTodayDateString()}>` + `<input type="time">` nativos, botones "Guardar"/"Cancelar"). Ícono `FiEdit2` (`<button type="button">`, `aria-label`/`title="Editar fecha de retoque"`) solo visible en modo lectura, mismo patrón visual/semántico que `AppointmentDetail.tsx:141-148` (UX-16).
  - `onClick` de cada fila de la timeline de retoques y el `onClose` del `Modal` de detalle ahora usan `openRetoqueDetail`/`closeRetoqueDetail` en vez de `setSelectedRetoqueDetail` directo, para garantizar el reset del modo edición.

- `apps/client/src/utils/dates.ts`
  - Nuevo helper exportado `getTodayDateString()` (fecha local de hoy `YYYY-MM-DD`, para `min` de `<input type="date">`). Extraído tras detectar la 3ra duplicación idéntica (ya vivía localmente en `RegistroModal.tsx` y `Turnos.tsx`); UX-28 hubiera sido la 4ta copia.

- `apps/client/src/components/RegistroModal.tsx`
  - Eliminada la función local `getTodayDateString`; ahora importa la versión compartida de `../utils/dates`.

- `apps/client/src/views/Turnos.tsx`
  - Eliminada la función local `getTodayDateString`; ahora importa la versión compartida de `../utils/dates`.

## Decisiones técnicas

1. **Edición inline, no sub-modal:** el texto "Retoque: {fecha}" se reemplaza en el mismo bloque por los inputs + botones guardar/cancelar, replicando el espíritu del toggle de `AppointmentDetail.tsx` (que usa `FiEdit2` para "Editar turno" abriendo un formulario en el mismo contenedor visual, aunque en un flujo distinto por navegación). Decisión de producto ya cerrada por el leader — no requiere reconfirmación.
2. **Controles nativos (`<input type="date">` + `<input type="time">`), no el `react-select` de disponibilidad de UX-17/UX-24:** esta edición es una reprogramación de un registro ya existente (sin reasignación de profesional ni chequeo de solapamiento), no una nueva reserva de turno. Replicar el selector de slots de `RegistroModal.tsx` (que depende de `professional`, `businessHours` y `dayAppointments`) hubiera sido sobre-ingeniería fuera del scope acotado por el leader.
3. **Combinación fecha+hora → ISO:** mismo patrón ya usado en `RegistroModal.tsx` (`new Date(\`${date}T${time}\`).toISOString()`), consistente con el cuidado de timezone de UX-14. Al prellenar los inputs en modo edición se hace la operación inversa con getters **locales** (`getFullYear`/`getMonth`/`getDate`/`getHours`/`getMinutes`) sobre `new Date(nextTouchupDate)`, para que el round-trip prellenado → guardado sin cambios produzca el mismo ISO string (ver punto 4).
4. **Guard anti-reenvío de fecha vencida (patrón P8 del catálogo):** se guarda el ISO original en un `useRef` al entrar en modo edición. Si el usuario abre el editor y guarda sin cambiar nada, el ISO recién construido coincide con el original y el `handleSaveTouchupDate` corta antes de llamar a la mutation (evita un 400 innecesario del backend si el retoque ya estaba "Atrasado" — UX-27 rechaza cualquier `nextTouchupDate` en el pasado, incluido el valor sin modificar).
5. **Merge parcial en `onSuccess`, no reemplazo total del registro:** `updateServiceRecord` (`PUT /api/registros/:id`) no popula `client`/`service`/`professional` en la respuesta (confirmado en `apps/server/src/controllers/serviceRecordController.ts:206-216`, sin `.populate()`). Reemplazar `selectedRetoqueDetail` completo con la respuesta del backend hubiera roto el resto del modal (esos campos habrían quedado como ObjectId string en vez de objetos poblados). Se actualiza únicamente `nextTouchupDate` sobre el estado local existente.
6. **`touchupStatus` intacto:** el payload de la mutation solo envía `{ nextTouchupDate }`; no se toca `touchupStatus` en ningún punto del flujo, conforme a la decisión de producto ya cerrada.
7. **Deduplicación de `getTodayDateString`:** extraído a `utils/dates.ts` tras cruzar el umbral de 3 ocurrencias idénticas (era la 3ra vez que se necesitaba). `RegistroModal.tsx` y `Turnos.tsx` actualizados para importar la versión compartida; UX-28 la reutiliza directamente sin agregar una 4ta copia.

## Verificación

- `pnpm --filter @estetica/client build` → **Exit Code 0** (tsc -b + vite build, sin errores; único warning preexistente de chunk size >500kB, no relacionado).
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, pero el único error real es el preexistente `ProductoModal.tsx:37:25` ('stock' is assigned a value but never used), explícitamente aceptado como no relacionado a esta tarea. Los demás hallazgos son warnings preexistentes de "Compilation Skipped: Use of incompatible library" (react-hooks/incompatible-library sobre `watch()` de react-hook-form) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — ninguno introducido por este cambio.

No se modificó backend (no era necesario — `PUT /api/registros/:id` ya soportaba `nextTouchupDate` aislado con la validación UX-27).

No se marcó la feature como `"done"` en `feature_list.json` — pendiente de revisión del `reviewer`.
