# Reporte de Revisión Técnica — Feature UX-20

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-08

## Resumen de lo auditado
- Diff real inspeccionado con `git diff apps/client/src/views/Turnos.tsx` (no solo el resumen del implementer).
- Único archivo de código tocado: `apps/client/src/views/Turnos.tsx` (+35/-3 líneas). Confirmado con `git diff --name-only`: no se tocó `apps/server/`, `AppointmentDetail.tsx` ni `appointmentApi.ts`.
- `feature_list.json` y `progress/current.md` también aparecen modificados en el working tree, pero corresponden a la transición `pending → in_progress` de UX-20 y al plan de sesión (responsabilidad del leader, no del implementer) — no son una violación de sandbox.
- Builds y lint corridos por el propio reviewer (no solo tomados de la palabra del implementer):
  - `pnpm --filter @estetica/client build` → **Exit Code 0**, `✓ 704 modules transformed`, `✓ built in 820ms`. Único warning: chunk >500kB (preexistente, no relacionado).
  - `pnpm --filter @estetica/client lint` → 1 error + 4 warnings, **todos preexistentes y verificados uno por uno**: error `ProductoModal.tsx:37` (`'stock' is assigned a value but never used`); warnings `react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:125`, `Negocio.tsx:73`, `Turnos.tsx:214` (`watch('date')`, línea preexistente, no relacionada con el código nuevo en líneas 514-586). Cero hallazgos nuevos.

## Verificación de los 3 criterios de aceptación (feature_list.json)
1. **Acción rápida visible al hover** — confirmado: `Turnos.tsx:514-516` agrega `.event-quick-cancel { opacity: 0 }` + `.appointment-event:hover .event-quick-cancel, .appointment-event:focus-within .event-quick-cancel { opacity: 1 }` (hover-reveal, con `:focus-within` para teclado). Botón `<FiTrash2 />` insertado en ambas ramas de `eventContent` (`Turnos.tsx:576-590`).
2. **Modal de confirmación (no `window.confirm`)** — confirmado: `onClick` invoca `openCancelModal(appointment)` (`Turnos.tsx:320-325`), que abre el modal de cancelación existente con motivo opcional (`isCancelModalOpen`, líneas ~720-739 sin modificar). `grep` sobre el diff confirma ausencia de `window.confirm`/`alert(` en el cambio.
3. **Calendario se actualiza sin recargar** — confirmado por reutilización: la mutation `cancelMutate` (ya auditada en features previas) invalida queries en `onSuccess`; no se tocó esa lógica.

## Verificación de las 3 decisiones de producto (2026-07-08)
1. **"Eliminar" = cancelar, sin borrado físico** — confirmado. No se agregó ningún endpoint ni llamada de `delete`; se reutiliza 100% `openCancelModal`/`cancelMutate` existente.
2. **Ícono oculto en vista mes** — confirmado: `isMonth = arg.view.type === 'dayGridMonth'` (`Turnos.tsx:548`) y `canQuickCancel = !isMonth && ...` (`Turnos.tsx:549-553`). Los 3 tipos de vista reales del calendario son `dayGridMonth`, `timeGridWeek`, `timeGridDay` (confirmado en `headerToolbar`, `Turnos.tsx:526`), por lo que `isMonth` cubre exactamente el caso a excluir sin falsos positivos/negativos.
3. **Ícono oculto en `cancelled`/`completed`/`overdue`** — confirmado: `canQuickCancel` excluye explícitamente los tres vía `getRenderStatus(appointment)` (`utils/appointmentStatus.tsx:48-50`, que ya recalcula `overdue` para turnos `pending` con `endTime` pasado). Contrastado contra `AppointmentDetailFooter` (`AppointmentDetail.tsx:127`, `appointment.status === 'cancelled' || appointment.status === 'completed'`, sin excluir `overdue` porque usa `status` crudo, no `renderStatus`): la divergencia (ícono rápido más restrictivo que el footer del modal de detalle) es **intencional y coincide exactamente con la decisión de producto documentada**, no una inconsistencia accidental. Criterio correctamente justificado en `impl_UX-20-frontend.md`.

## HTML semántico e interacción (frontend.md §3, CHECKPOINTS.md C3)
- `<button type="button" className="event-quick-cancel cursor-pointer">` — cumple regla de elemento nativo + `cursor-pointer` obligatorio (`Turnos.tsx:559-573`).
- `aria-label="Cancelar turno"` + `title="Cancelar turno"` presentes.
- `onPointerDown`/`onMouseDown` con `stopPropagation()` (`Turnos.tsx:565-566`) previenen que el `pointerdown` nativo delegado de `interactionPlugin` (drag&drop, `editable={true}` + `eventDrop`) interprete el press como inicio de arrastre.
- `onClick` con `stopPropagation()` + `preventDefault()` (`Turnos.tsx:567-570`) frena la propagación hacia `eventClick` (que abriría el modal de detalle) sin cancelar el propio evento `click` del botón (stopPropagation en un ancestro no impide que el listener nativo del propio elemento se dispare — el click sigue ejecutando `openCancelModal`).
- Patrón consistente con el precedente ya auditado en `Dashboard.tsx` (UX-16, botones rápidos con `stopPropagation` dentro de card clickeable), citado correctamente por el implementer.
- `.appointment-event-content { overflow: hidden }` con el botón `flex-shrink: 0` + `margin-left: auto`: el título (`.event-title`, `overflow: hidden; text-overflow: ellipsis`) es el que cede espacio, no el botón — no hay riesgo de recorte del ícono en el layout flex.

## Riesgo no verificable (aceptado explícitamente, no bloqueante)
- No hay forma de probar en navegador real (sin credenciales de Clerk de prueba en el entorno) el posible conflicto visual entre el tooltip de `react-tooltip` (UX-18, adjunto a `info.el` vía `data-tooltip-id`) y el ícono anidado durante el hover. Riesgo documentado por el implementer y por el leader como aceptable — verificación quedó acotada a lectura de código + build/lint, según lo indicado explícitamente en la tarea.

## Auditoría de variables sensibles (Gate Bloqueante)
- No aplica: ningún archivo de backend fue tocado por esta feature. `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin resultados (repositorio limpio en este aspecto, no relacionado con UX-20).

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, sandbox de código acotado a 1 archivo de frontend, `progress/current.md` describe la feature en curso.
- [x] C3 (Fidelidad Arquitectónica — HTML semántico, sin filtrado client-side nuevo, `export default` intacto, tipado explícito preservado; no aplica paginación/multi-tenancy porque no hay query nueva).
- [x] C4 (Compilación Estática + Lint) — build Exit Code 0; lint sin regresiones (1 error + 4 warnings, todos preexistentes y verificados línea por línea).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de completar por el leader tras este veredicto (history.md, current.md, archivado de progress/); no bloquea el veredicto de la feature en sí.
- [ ] C6 (Capa de Datos) — N/A, no aplica (feature 100% frontend, sin cambios a modelos Mongoose).
- [x] C7 (Security Gate) — N/A backend; SEC-G (`dangerouslySetInnerHTML`) verificado ausente en el diff.
- [ ] C8 (Estabilidad de API) — N/A, no hay cambio de contrato de API.

## Cambios Requeridos
Ninguno.
