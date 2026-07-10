# Reporte de Revisión Técnica — Feature UX-28

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-10

## Historial de rondas

1. **Primera pasada:** `CHANGES_REQUESTED`. Hallazgo aparente: `min={getTodayDateString()}` en `apps/client/src/components/RegistroModal.tsx:356` parecía una adición nueva no autorizada, fuera del alcance de UX-28, basado en un diagnóstico contra `git show HEAD:...` (commit `fc2e585`).
2. **Corrección de línea base (leader):** ni UX-27 ni UX-28 estaban commiteadas todavía — `HEAD` (`fc2e585`) es anterior a **ambas**. El `min={getTodayDateString()}` y el helper local `getTodayDateString()` en `RegistroModal.tsx` fueron agregados durante UX-27 (confirmado en `progress/implements/_archive/impl_UX-27-frontend.md:12-13`: *"Se agregó un helper local `getTodayDateString()`... Se agregó el atributo nativo `min={getTodayDateString()}`"*), y ya habían sido revisados y aprobados por este mismo auditor en `progress/reviews/review_UX-27.md` (línea 83, segunda pasada: *"Frontend (`RegistroModal.tsx`): `git diff` confirma que el diff es idéntico al de la primera pasada (`getTodayDateString()` + `min={getTodayDateString()}` en el input `touchupDate`)"*). El diff visto en la primera pasada de esta revisión mezclaba ambas features porque UX-27 seguía sin commitear — error de línea base atribuible al leader (no commiteó UX-27 antes de arrancar UX-28), no al implementer de UX-28 ni a su bitácora.
3. **Segunda pasada (esta), APPROVED:** con la línea base correcta, lo único que corresponde a UX-28 en `RegistroModal.tsx` es el cambio de import de `getTodayDateString` (de la copia local, agregada por UX-27, a la versión compartida en `utils/dates.ts`) — exactamente el alcance de la decisión de producto #6. No hay scope creep ni inexactitud real en `impl_UX-28-frontend.md`.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — una sola feature `in_progress` en el ciclo; sandbox respetado (solo `apps/client/`); alcance de UX-28 limitado exactamente a las 6 decisiones cerradas con el usuario.
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — N/A paginación (no es un listado); no se creó ningún query nuevo de backend; se reutiliza `updateServiceRecord`/`PUT /api/registros/:id` ya existente sin cambio de contrato.
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/client build` → **Exit Code 0** (ejecutado por el reviewer). `pnpm --filter @estetica/client lint` → **Exit Code 1**, único hallazgo `ProductoModal.tsx:37:25` ('stock' is assigned a value but never used), preexistente y ya documentado en `progress/current.md` como deuda técnica; sin errores nuevos introducidos por esta feature.
- [x] C5 (Cierre de Sesión Append-Only) — procede: `feature_list.json` → `"done"`, entrada nueva en `progress/history.md`, `progress/current.md` actualizado, archivado de `impl_UX-28-frontend.md`/`explore_UX-28.md`.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se tocó ningún archivo de `apps/server/` ni modelo Mongoose para esta feature. Los cambios de `apps/server/` visibles en `git status` (`appointmentController.ts`, `serviceRecordController.ts`, `apps/server/src/utils/dateUtils.ts`) pertenecen a UX-27 (ya `done`, pendiente únicamente de commit por el leader).
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — sin cambios de autenticación/autorización; feature 100% frontend, no aplica grep de variables sensibles (sin tocar `apps/server/src/`).
- [x] C8 (Estabilidad de API) — sin cambio de contrato: el payload `{ nextTouchupDate }` ya era aceptado por `PUT /api/registros/:id` desde UX-27. No aplica CHANGELOG.

## Verificación de las 6 decisiones de producto (contra `git diff` real de `Dashboard.tsx`, `utils/dates.ts`, `RegistroModal.tsx`, `Turnos.tsx`)

1. **Edición inline (no sub-modal):** confirmado. `apps/client/src/views/Dashboard.tsx`: el bloque `<p>Retoque: {formatDate(...)}</p>` se reemplaza condicionalmente por `<input type="date">` + `<input type="time">` + botones Guardar/Cancelar dentro del mismo contenedor, sin abrir un `<Modal>` adicional.
2. **Fecha Y hora editables:** confirmado. `touchupDateInput` + `touchupTimeInput`, combinados en `handleSaveTouchupDate` como `new Date(\`${touchupDateInput}T${touchupTimeInput}\`).toISOString()`.
3. **`touchupStatus` intacto:** confirmado. La mutation llama `updateServiceRecord(vars.id, { nextTouchupDate: vars.nextTouchupDate })` — único campo en el payload.
4. **Controles nativos, no react-select de disponibilidad:** confirmado. `<input type="date">`/`<input type="time">` planos, sin `getAvailableSlots`/`professional`/`businessHours`.
5. **Backend no tocado para esta feature:** confirmado — los cambios de `serviceRecordController.ts`/`appointmentController.ts` en el working tree corresponden íntegramente a UX-27 (ya aprobada en 2 rondas), sin ninguna línea adicional relacionada a UX-28.
6. **Extracción de `getTodayDateString` a `utils/dates.ts`:** confirmado con línea base corregida. `Turnos.tsx` tenía la función local desde antes de UX-27 (ya existía en el `HEAD` previo a ambas features) y queda correctamente reemplazada por el import compartido. `RegistroModal.tsx` obtuvo su copia local durante UX-27 (no en UX-28); UX-28 la reemplaza por el mismo import compartido — 3ª ocurrencia correctamente extraída, ambos consumidores existentes actualizados, sin definiciones locales duplicadas ni imports rotos.

## Verificación de puntos técnicos adicionales

- **ISO string fecha+hora sin desfasaje (gotcha UX-14):** correcto. Guardado: `new Date(\`${date}T${time}\`).toISOString()` (sin sufijo `Z`, interpretado como hora local del navegador, mismo patrón ya auditado en `RegistroModal.tsx`). Prellenado: getters locales (`getFullYear`/`getMonth`/`getDate`/`getHours`/`getMinutes`) sobre `new Date(nextTouchupDate)`, evitando el bug de UX-14. El guard anti-reenvío (`originalTouchupIsoRef`, patrón P8) corta el submit si el ISO reconstruido es idéntico al original.
- **`min` en input date + propagación de error:** confirmado. `min={getTodayDateString()}` en el input de `Dashboard.tsx`. `onError: (error) => handleApiError(error, 'Error al actualizar la fecha de retoque')`, sin `<div>` de error inline duplicado.
- **HTML semántico:** confirmado. Ícono de editar es `<button type="button" aria-label="Editar fecha de retoque" title="Editar fecha de retoque" className="... cursor-pointer">`. Botones Guardar/Cancelar también `<button type="button">` con `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Refresco sin reload:** confirmado. `onSuccess` mergea `nextTouchupDate` en `selectedRetoqueDetail` (estado local, preserva `client`/`service`/`professional` poblados) e invalida `['upcoming-touchups']` y `['dashboard-stats']`.
- **Reset del modo edición:** confirmado. `openRetoqueDetail`/`closeRetoqueDetail` fuerzan `isEditingTouchupDate(false)` al seleccionar otro retoque o cerrar el modal, evitando que el modo edición quede "pegado".

## Builds (ejecutados por el reviewer)

- `pnpm --filter @estetica/client build` → **Exit Code 0**.
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, único error preexistente `ProductoModal.tsx:37:25`, sin hallazgos nuevos.

## Patrón promovido al catálogo

Se agregó `docs/patterns-frontend.md § P12` ("Edición inline de un campo dentro de un bloque de detalle") — el toggle lectura/edición en el mismo bloque, con reset obligatorio al cambiar de entidad/cerrar el modal padre y merge parcial en `onSuccess`, es genuinamente nuevo (no documentado antes; `AppointmentDetail.tsx` de UX-16 resuelve la edición navegando a otro flujo, no con este toggle in-place). El guard anti-reenvío en sí ya estaba documentado como P8 — no se duplicó, solo se referencia como parte de P12.

## Cambios Requeridos

Ninguno. Veredicto: **APPROVED**.
