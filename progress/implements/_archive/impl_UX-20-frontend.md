# Implementación — UX-20 (frontend): Eliminación rápida de turno desde el calendario

**Feature:** UX-20 — Eliminación rápida de turno desde el calendario (`feature_list.json`, `in_progress` → pendiente de review)
**Sandbox:** `apps/client/` (frontend). No se tocó `apps/server/` (no hacía falta — backend/API de cancelación ya completos, ver `progress/explores/explore_UX-20.md`).

## Archivos modificados

- `apps/client/src/views/Turnos.tsx` (único archivo tocado)

## Cambios realizados

1. **Import:** agregado `FiTrash2` a la línea de import de `react-icons/fi` (ya existía `FiPlus, FiAlertCircle`).
2. **CSS embebido (bloque `<style>` ya existente, líneas ~507-513):** agregadas 3 reglas nuevas:
   - `.event-quick-cancel`: botón hover-reveal (`opacity: 0` por defecto), `flex-shrink: 0`, `margin-left: auto` para empujarlo al final del contenido flex del evento, `color: inherit` para heredar el `textColor` de contraste ya calculado por evento (paleta de estado o color de profesional + `getContrastTextColor`).
   - `.appointment-event:hover .event-quick-cancel, .appointment-event:focus-within .event-quick-cancel { opacity: 1 }`: revela el ícono al hacer hover sobre el bloque completo del turno (clase `.appointment-event` ya aplicada vía `classNames` en el array `events`). Se agregó también `:focus-within` para no dejar el botón invisible/inalcanzable en navegación por teclado.
   - `.event-quick-cancel:hover`: fondo sutil `rgba(0,0,0,0.12)` al pasar el mouse directamente sobre el ícono.
3. **`eventContent` (render function de FullCalendar):**
   - Se calcula `renderStatus = getRenderStatus(appointment)` una sola vez (antes se llamaba `getRenderStatus(appointment)` dos veces de forma redundante en cada rama `isDay`/`!isDay`).
   - Nueva variable `isMonth = arg.view.type === 'dayGridMonth'`.
   - Nueva variable `canQuickCancel = !isMonth && renderStatus !== 'cancelled' && renderStatus !== 'completed' && renderStatus !== 'overdue'` — replica el criterio de `AppointmentDetailFooter` (`AppointmentDetail.tsx:127`, oculta si `cancelled`/`completed`) y le suma la exclusión de `overdue` pedida explícitamente para esta feature.
   - Nuevo `<button type="button" className="event-quick-cancel cursor-pointer">` con ícono `<FiTrash2 />`, `aria-label`/`title="Cancelar turno"`, renderizado condicionalmente (`canQuickCancel &&`) al final de `.appointment-event-content` en **ambas** ramas (`isDay` y `!isDay`, esta última compartida hoy por las vistas semana y mes — la exclusión de mes ya queda cubierta por `canQuickCancel`, no hizo falta bifurcar el JSX).
   - Handlers del botón:
     - `onPointerDown={(e) => e.stopPropagation()}` y `onMouseDown={(e) => e.stopPropagation()}`: frenan la propagación antes de que el manejador nativo de drag&drop de `interactionPlugin` (adjunto más arriba en el árbol) interprete el press como inicio de un arrastre.
     - `onClick={(e) => { e.stopPropagation(); e.preventDefault(); openCancelModal(appointment); }}`: frena la propagación hacia el `eventClick` de FullCalendar (que abriría el modal de detalle) e invoca directamente `openCancelModal(appointment)` — la función ya existente en `Turnos.tsx` (líneas ~320-325) que abre el modal de cancelación con motivo (líneas ~720-739), reutilizada sin cambios.

## Decisiones técnicas

- **No se creó ningún modal nuevo ni mutation nueva.** Se reutiliza 100% el flujo de cancelación existente (`cancelMutate` sobre `cancelAppointment(id, reason?)`, `isCancelModalOpen`, `cancelReason`, `handleConfirmCancel`) — el único cambio es el punto de entrada.
- **Criterio de visibilidad:** se usa `getRenderStatus` (no `appointment.status` crudo) para excluir también turnos `overdue` (pending cuyo `endTime` ya pasó), tal como se pidió — a diferencia de `AppointmentDetailFooter`, que solo excluye `cancelled`/`completed` (ese footer no necesita la exclusión de `overdue` porque en el modal de detalle sí tiene sentido seguir permitiendo cancelar un turno atrasado manualmente; la decisión de producto para el ícono rápido del calendario fue más restrictiva).
- **Vista mes excluida por variable dedicada (`isMonth`)** en vez de reutilizar `isDay` invertido, para no acoplar accidentalmente el criterio de "vista compacta" (que hoy agrupa semana+mes) con el criterio de "dónde mostrar el ícono" (que es semana+día). Si en el futuro se separa el render de semana y mes, el criterio de visibilidad del ícono no se ve afectado.
- **Posicionamiento del ícono:** se optó por `margin-left: auto` dentro del `display:flex` existente de `.appointment-event-content` en vez de `position: absolute`, para evitar problemas de recorte con `overflow: hidden` (regla ya presente en `.appointment-event-content` y `.fc-timegrid-event .fc-event-main`) — motivo documentado en `docs/patterns-frontend.md § P11` (elementos flotantes atrapados por stacking context/overflow de contenedores FullCalendar); al ser un ítem flex normal, no compite con ese problema.
- **Color heredado (`color: inherit`)** en vez de un color fijo, para mantener el contraste WCAG ya calculado por evento (paleta de estado o `getContrastTextColor(professionalColor)`) — no rompe la trifecta de accesibilidad existente en el bloque (color + ícono de estado + texto de hora/título siguen intactos, el ícono de cancelar es una acción, no un estado).
- **No se tocó** `AppointmentDetail.tsx`, `appointmentApi.ts`, ni ningún archivo de backend — confirmado que el gap era exclusivamente de exposición en `Turnos.tsx`.

## Verificación

- `pnpm --filter @estetica/client build` → **Exit Code 0.**
  ```
  tsc -b && vite build
  ✓ 704 modules transformed.
  ✓ built in 3.89s
  ```
  (warning preexistente de Vite sobre chunk size >500kB, no relacionado con este cambio).
- `pnpm --filter @estetica/client lint` → **1 error preexistente, 4 warnings preexistentes, ninguno introducido por este cambio:**
  - Error `ProductoModal.tsx:37` (`'stock' is assigned a value but never used`) — deuda preexistente ya documentada en `progress/current.md`, fuera de alcance de esta feature (confirmado explícitamente en las instrucciones de la tarea).
  - Warnings `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx:214` (`watch('date')`, línea preexistente sin relación con el código agregado) — mismo patrón preexistente de React Compiler con `react-hook-form`, no relacionado con el ícono agregado.

## Hallazgos / notas para el reviewer

- No fue posible verificación manual en navegador real (mismo blocker de proceso ya documentado en `progress/current.md`: no hay credenciales de Clerk de prueba en este entorno). El `reviewer` debería auditar por lectura de código, con foco en:
  1. Que `stopPropagation()` en `onClick`/`onMouseDown`/`onPointerDown` efectivamente evite: (a) abrir el modal de detalle (`eventClick`), y (b) iniciar un drag accidental del turno (`editable={true}` + `eventDrop`).
  2. Que el ícono no aparezca en vista mes (`dayGridMonth`) ni en turnos `cancelled`/`completed`/`overdue`.
  3. Que el hover-reveal (CSS `opacity`) funcione visualmente sin quedar tapado por el tooltip de `react-tooltip` (UX-18) que comparte el mismo elemento raíz `.appointment-event` vía `data-tooltip-id`/`data-tooltip-content` (adjuntado en `handleEventDidMount` sobre `info.el`, el nodo raíz completo del evento — no debería competir con el ícono anidado, pero es la única capa de riesgo visual no verificable sin navegador real).
- Sin cambios en `docs/patterns-frontend.md` — el patrón de hover-reveal + stopPropagation ya está cubierto conceptualmente por P11 (elementos flotantes) y el precedente de `Dashboard.tsx` (UX-16, botones rápidos con stopPropagation dentro de card clickeable); no se detectó un patrón genuinamente nuevo que amerite promoción al catálogo.

## Estado

`done -> progress/implements/impl_UX-20-frontend.md`

No se modificó `feature_list.json` (sigue en `"status": "in_progress"`) — la transición a `"done"` es responsabilidad exclusiva del `reviewer`.
