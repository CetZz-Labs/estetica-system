# Reporte de Revisión Técnica — Feature UX-69

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-04

## Resumen ejecutivo

La implementación cumple la gran mayoría de los `acceptance_criteria` y ambos builds + lint pasan en verde, pero se detectó una **regresión funcional real** en la integración backend↔frontend (el flujo "Completar y Registrar" de un turno vencido queda roto) y falta la entrada obligatoria en `CHANGELOG.md` para el breaking change de `getClientRecords`. Ambos hallazgos son bloqueantes y no fueron detectados por ninguno de los dos implementers (trabajaron en paralelo sin correr el escenario cruzado).

## Checklist de Acceptance Criteria (`feature_list.json`, id `UX-69`)

1. **[x]** `createServiceRecord` rechaza `serviceDate < hoy` con 400 salvo `isBackfill`.
   Evidencia: `apps/server/src/controllers/serviceRecordController.ts` líneas 54-58 (`backfillFlag` false → `isBeforeCalendarDay` → 400 `'La fecha del servicio no puede ser anterior al día de hoy'`).

2. **[x]** Mecanismo explícito `isBackfill: true` exige `serviceDate` estrictamente pasada (anti-abuso).
   Evidencia: mismo archivo, líneas 59-63 (`else` branch → 400 `'Una visita pasada debe tener una fecha anterior a hoy'` si NO es anterior a hoy). Comparación estricta `isBackfill === true || isBackfill === 'true'` documentada y correcta contra el gotcha de `express-validator.isBoolean()` sin `strict`.

3. **[x]** `RegistroModal.tsx` (flujo normal) agrega `min={getTodayDateString()}` a `serviceDate`.
   Evidencia: `apps/client/src/components/RegistroModal.tsx` línea 350 (`min={pastVisitMode ? undefined : getTodayDateString()}`).
   **Ver sin embargo el Cambio Requerido #1 — esta misma línea introduce una regresión no contemplada en el criterio.**

4. **[x]** Botón "Registrar visita pasada" en `ProfileClient.tsx`, reusa `RegistroModal` con `pastVisitMode`, quita `min`, agrega validación inline, preselecciona cliente, envía `isBackfill: true`.
   Evidencia: `apps/client/src/views/ProfileClient.tsx` líneas 132-139 (botón) y 264-269 (`<RegistroModal pastVisitMode preselectedClientId={id} />`); `RegistroModal.tsx` líneas 350-361 (`max`, `validate` inline con mensaje "La fecha debe ser anterior a hoy") y línea 240 (`isBackfill: true` en el payload).

5. **[x]** `getClientRecords` migra a `{ data, meta: { total, page, limit, totalPages } }`, page-size 7, `page/limit/dateFrom/dateTo` validados con `express-validator`, scopeado por `tenantId` + `clientId`.
   Evidencia: `apps/server/src/controllers/serviceRecordController.ts` líneas 182-215 (filtro `{ tenantId: req.tenantId, client: clientId }`, `Promise.all([find, countDocuments])`, contrato de salida); `apps/server/src/routes/serviceRecordRoutes.ts` líneas 46-57 (validators `page`, `limit`, `dateFrom`, `dateTo`).

6. **[x]** `ProfileClient.tsx` consume el contrato paginado: control de paginación (mismo patrón `Pagination`/P6), filtro por rango de fecha, contador lee `meta.total` (nunca `data.length`).
   Evidencia: `ProfileClient.tsx` línea 50 (`totalRegistros = historial?.meta.total ?? 0`), línea 257 (`<Pagination total={totalRegistros} .../>`), líneas 166-201 (inputs `dateFrom`/`dateTo` + botón "Limpiar filtros").

7. **[x]** `queryKey` incluye `page/limit/dateFrom/dateTo`; cambiar filtro resetea `page` a 1; `placeholderData: keepPreviousData`.
   Evidencia: `ProfileClient.tsx` línea 43 (`queryKey: ['client-history', id, page, PAGE_SIZE, dateFrom, dateTo]`), línea 46 (`placeholderData: keepPreviousData`), líneas 53-55 (`handleDateFromChange`/`handleDateToChange`/`clearDateFilters` todos hacen `setPage(1)`).

8. **[ ] (parcial)** `pnpm --filter @estetica/server build` y `pnpm --filter @estetica/client build` + `lint` pasan con exit code 0.
   Los 3 comandos efectivamente dan exit 0 (ver sección Verificación abajo), **pero** el criterio implícito de "integración end-to-end funcional" que el propio criterio #3 exige ("usado desde Dashboard y desde completar turnos") no se cumple — ver Cambio Requerido #1. Marco este ítem como parcial porque el build verde no es evidencia suficiente de que la feature funcione end-to-end; ver regresión detectada.

## Verificación de Builds / Lint / Tests

```
pnpm --filter @estetica/server build   → Exit 0 (tsc, sin errores)
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build)
pnpm --filter @estetica/client lint    → Exit 0 (0 errores, 4 warnings preexistentes react-hooks/incompatible-library, ninguno nuevo)
pnpm --filter @estetica/server test    → Test Files 1 failed | 2 passed (3), Tests 4 failed | 31 passed (35)
```

Los 4 tests fallidos (`tenantIsolation.test.ts`, bloque "Registros de visita: vectores de fuga cross-tenant") se verificaron **idénticos carácter por carácter** contra `git show HEAD:apps/server/src/__tests__/tenantIsolation.test.ts` (líneas 260-322): ninguno de los 4 `it(...)` fue tocado por esta feature, y todos fallan por no enviar `professional` en el body (`body('professional').isMongoId()` en `serviceRecordRoutes.ts` línea 70 rechaza con 400 en `validateRequest`, antes de que el guard nuevo de `serviceDate` se ejecute). Confirmado: deuda preexistente, no introducida por UX-69. Sin fallos nuevos.

## Integración backend↔frontend

- Flag `isBackfill`: mismo nombre en ambos lados (`ServiceRecordPayload.isBackfill?: boolean` en `apps/client/src/api/serviceRecordApi.ts` línea 12; `req.body.isBackfill` en `serviceRecordController.ts` línea 13). OK.
- Contrato paginado de `GET /api/registros/cliente/:clientId`: mismo shape `{ data, meta: { total, page, limit, totalPages } }` en backend (`serviceRecordController.ts` líneas 210-213) y frontend (`Paginated<ServiceRecord>` en `apps/client/src/types/index.ts`, consumido en `ProfileClient.tsx`). Mismos nombres de query params (`page`, `limit`, `dateFrom`, `dateTo`) en ambos lados. OK.
- Mensajes 400 del backend se muestran vía `handleApiError`/toast (no `alert()`), tanto en `RegistroModal.tsx` (`onError: (error) => handleApiError(error, 'Error al registrar la visita')`, línea 229) como en `ProfileClient.tsx` (trifecta inline para error de historial). OK.
- **Regresión detectada** (ver Cambio Requerido #1 abajo): el flujo de completar un turno vencido usa `completeAppointment` (`PATCH /api/turnos/:id/complete`, `appointmentController.ts`), endpoint que **no** recibió el guard nuevo de `serviceDate` (correcto, no estaba en el alcance del backend implementer) — pero el frontend aplica el `min={getTodayDateString()}` de forma incondicional a **todo** el modo normal, incluido cuando `appointmentId` está presente, sin distinguir que en ese caso `preselectedServiceDate` puede legítimamente ser una fecha pasada.

## Cambios Requeridos (Bloqueante)

1. **Regresión funcional — "Completar y Registrar" de un turno vencido queda bloqueado por el nuevo `min` del input `serviceDate`.**
   - `apps/client/src/components/RegistroModal.tsx` línea 350: `min={pastVisitMode ? undefined : getTodayDateString()}` se aplica también cuando `appointmentId` está presente (modo "completar turno"), sin excepción.
   - `apps/client/src/views/Dashboard.tsx` línea 276 (y `apps/client/src/views/Turnos.tsx` línea 326): `setPrefillServiceDate(new Date(appt.startTime).toISOString().split('T')[0])` — precarga `serviceDate` con la fecha **original del turno**, que puede ser anterior a hoy si el turno quedó pendiente/confirmado y no se completó el mismo día (no hay ningún mecanismo en el repo que cancele o oculte turnos vencidos: `AppointmentDetail.tsx` línea 127 solo oculta el botón "Completar y Registrar" si `status` es `cancelled`/`completed`, nunca por fecha; el calendario de `Turnos.tsx` no filtra eventos pasados).
   - `apps/client/src/components/RegistroModal.tsx` línea 278: `<form id="registroForm" onSubmit={handleSubmit(onSubmit)}>` **no** tiene `noValidate`, y el botón de submit (línea 262, `<button type="submit" form="registroForm">`) está asociado a ese `<form>` — por lo tanto, si `serviceDate` (precargado con una fecha anterior a `min`) queda en estado `rangeUnderflow` inválido según la Constraint Validation API del navegador, el evento `submit` **nunca se dispara** y `handleSubmit(onSubmit)` de react-hook-form no se ejecuta. El usuario ve el tooltip nativo del navegador (inconsistente con la trifecta de accesibilidad del resto de la app, que usa mensajes inline + toast) y no puede completar el turno vencido sin editar manualmente la fecha a mano — funcionalidad que **sí funcionaba antes de esta feature** (el input `serviceDate` no tenía `min`).
   - **Justificación normativa:** viola la instrucción explícita del criterio de aceptación #3 ("usado desde Dashboard **y desde completar turnos**") y el mandato de no-regresión de `docs/architecture.md`/`CHECKPOINTS.md` C3 (Fidelidad Arquitectónica — la feature no puede romper un flujo existente). También contradice la petición explícita del propio task de revisión de "verificar que el modo normal de RegistroModal.tsx (usado desde Dashboard) NO se haya roto por el nuevo prop `pastVisitMode`".
   - **Corrección esperada (no la implemento, solo señalo el punto de ajuste):** el `min` de `serviceDate` en modo normal debería exceptuar el caso `appointmentId` con `preselectedServiceDate` anterior a hoy (p. ej. no aplicar `min` cuando hay `appointmentId`, o usar `min={preselectedServiceDate && preselectedServiceDate < getTodayDateString() ? preselectedServiceDate : getTodayDateString()}`), y validar que el backend (`completeAppointment` en `appointmentController.ts`) siga sin restricción de fecha para ese camino (confirmado, no se tocó).

2. **C8 — Falta entrada en `CHANGELOG.md` para el breaking change de `getClientRecords`.**
   - `apps/server/src/controllers/serviceRecordController.ts` / `apps/client/src/api/serviceRecordApi.ts`: `GET /api/registros/cliente/:clientId` cambia de `ServiceRecord[]` plano a `{ data, meta }` — el propio `impl_UX-69-backend.md` (línea 28) lo etiqueta explícitamente como "Breaking change intencional".
   - `CHANGELOG.md` bajo `## [Unreleased]` no tiene ninguna entrada nueva para UX-69 (verificado con `git diff -- CHANGELOG.md`, sin cambios). El breaking change está permitido por estar la feature `in_progress` (C8), pero igual **requiere documentarse** con el mismo formato `[BREAKING] (permitido — feature in_progress)` usado para los breaking changes anteriores de EP-11/EP-12/EP-17-b en ese mismo archivo (sección `### Changed`).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, `progress/implements/impl_UX-69-backend.md` e `impl_UX-69-frontend.md` presentes, sandbox hermético (solo archivos de `ServiceRecords`/historial de cliente tocados en ambos sandboxes).
- [x] C3 (Fidelidad Arquitectónica — paginación y multi-tenancy en queries) — patrón P1/P3 replicado correctamente, `tenantId` presente en el filtro de `getClientRecords`. **Con la salvedad de la regresión funcional del Cambio Requerido #1**, que sí es una falla de fidelidad al comportamiento existente del sistema.
- [x] C4 (Compilación Estática + Lint) — los 3 comandos dan exit 0.
- [x] C5 (Cierre de Sesión Append-Only) — no aplica todavía (feature no se cierra en este veredicto).
- [x] C6 (Capa de Datos) — no se tocó ningún modelo Mongoose; `isBackfill` correctamente NO persistido en `ServiceRecord.ts` (confirmado, `grep isBackfill` sobre el modelo no devuelve nada).
- [x] C7 (Security Gate) — SEC-A/B/C/E intactos (rutas siguen bajo `checkAdminAccess`+`checkTenantAccess`, filtros `{ _id, tenantId }`, `express-validator` con `validateRequest`); SEC-H sin hardcodeo de secrets tocado por esta feature. Anti mass-assignment confirmado (`isBackfill` no se persiste, `newRecord` se construye con campos explícitos, no `...req.body`).
- [ ] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — **falla**, ver Cambio Requerido #2.

## Veredicto Final (primera pasada): CHANGES_REQUESTED

`feature_list.json` **NO** se modificó (permanece `"status": "in_progress"` para `UX-69`, tal como estaba antes de esta revisión — es tarea exclusiva del reviewer y no procede hasta resolver ambos Cambios Requeridos).

`git stash list` verificado vacío al cierre de esta revisión.

---

## Segunda pasada — Timestamp: 2026-08-04

### 1. Verificación del fix de la regresión (Cambio Requerido #1)

`git diff -- apps/client/src/components/RegistroModal.tsx` confirma el fix exacto descrito en `progress/implements/impl_UX-69-frontend.md` (sección "Fix post-review"):

```tsx
min={pastVisitMode || appointmentId ? undefined : getTodayDateString()}
```

Trazado el flujo de invocación en `Dashboard.tsx` (único punto de entrada al modo "completar turno" desde el Dashboard, `Turnos.tsx` sigue el mismo patrón):

- `handleOpenNewVisit` (línea 119-126, botón "+ Nueva visita" del topbar) y `handleTouchupCheck` (línea 172-180, tildar un retoque pendiente) setean explícitamente `setCompletedAppointmentId(undefined)` antes de abrir el modal → `appointmentId` prop llega `undefined` → `min={getTodayDateString()}` se aplica, el input sigue bloqueando fechas pasadas. **Caso normal no regresionado.**
- `handleCompleteFromDashboard` (línea 270-278) es el **único** punto que setea `setCompletedAppointmentId(appt._id)` con un valor real, y en la misma función precarga `setPrefillServiceDate(new Date(appt.startTime).toISOString().split('T')[0])` (fecha original del turno, potencialmente pasada) → `appointmentId` prop llega con valor → `min` queda `undefined`, el input ya no bloquea la Constraint Validation API nativa del navegador. **Regresión corregida.**
- `handleCloseRegistroModal` (línea 280-284) resetea `completedAppointmentId` a `undefined` al cerrar, evitando que el modal quede "pegado" en modo completar-turno en la siguiente apertura.

`pastVisitMode` (`ProfileClient.tsx`) no se tocó en este fix — sigue con `max={getYesterdayDateString()}` + `validate` inline (`if (!pastVisitMode) return true`), verificado en el mismo diff (sin cambios respecto a la primera pasada en esa rama de la condición).

**Conclusión:** el fix es exactamente el descrito, sin efectos secundarios nuevos. Los 3 caminos (normal / completar turno / visita pasada) quedan mutuamente exclusivos y correctamente aislados por la condición `pastVisitMode || appointmentId`.

### 2. Verificación de `CHANGELOG.md`

`git diff -- CHANGELOG.md` confirma la entrada nueva bajo `## [Unreleased] → ### Changed`, con el mismo formato `[BREAKING] (permitido — feature in_progress)` usado por EP-11/EP-12/EP-17-b:

> `[BREAKING]` (permitido — feature `in_progress`) **UX-69**: `GET /api/registros/cliente/:clientId` deja de devolver un array plano de `ServiceRecord[]` y pasa a devolver `{ data: ServiceRecord[], meta: { total, page, limit, totalPages } }` (page-size 7), agregando query params opcionales `page`, `limit`, `dateFrom`, `dateTo`. `POST /api/registros` acepta un nuevo body opcional `isBackfill: boolean` (no persistido en `ServiceRecord`): en `false`/ausente exige `serviceDate >= hoy`; en `true` exige `serviceDate` estrictamente anterior a hoy (habilita registrar una visita pasada olvidada, solo desde la ficha del cliente).

Contenido correcto y completo (describe ambos endpoints afectados y el comportamiento exacto del flag). C8 queda satisfecho.

### 3. Re-verificación de builds / lint / tests

```
pnpm --filter @estetica/server build   → Exit 0 (tsc, sin errores)
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, sin errores)
pnpm --filter @estetica/client lint    → Exit 0 (0 errores, 4 warnings preexistentes react-hooks/incompatible-library — RegistroModal.tsx, Negocio.tsx, Turnos.tsx — ninguno nuevo)
pnpm --filter @estetica/server test    → Test Files 1 failed | 2 passed (3), Tests 4 failed | 31 passed (35)
```

Los 4 tests fallidos (`tenantIsolation.test.ts`, bloque "Registros de visita: vectores de fuga cross-tenant", líneas 265-322) se re-verificaron: contenido idéntico al de la primera pasada (mismos 4 `it(...)`, mismas aserciones, mismo body sin `professional`), deuda preexistente no introducida por UX-69, sin fallos nuevos. Nota: el mismo archivo de test sí tiene un cambio propio de UX-69 fuera de ese bloque (línea 181-186, adapta la aserción de `GET /api/registros/cliente/:clientId` al nuevo contrato `{ data, meta }` — ese test pasa en verde, no forma parte de los 4 fallos).

### 4. Repaso de acceptance_criteria (`feature_list.json`, id `UX-69`)

Con el fix aplicado, el ítem #8 (antes parcial) queda completo: el criterio #3 ("usado desde Dashboard y desde completar turnos") ya no se rompe. Los ítems #1-#7 no fueron tocados por este segundo cambio y se mantienen en verde según la evidencia de la primera pasada. Los 9 acceptance_criteria de `UX-69` quedan satisfechos.

### Mapeo de Checkpoints (actualización)

- [x] C2 (Coherencia de Estados y Enfoque Atómico)
- [x] C3 (Fidelidad Arquitectónica — paginación y multi-tenancy en queries) — regresión del Cambio Requerido #1 corregida y verificada.
- [x] C4 (Compilación Estática + Lint)
- [x] C5 (Cierre de Sesión Append-Only) — se aplica ahora, ver cierre abajo.
- [x] C6 (Capa de Datos)
- [x] C7 (Security Gate)
- [x] C8 (Estabilidad de API — CHANGELOG) — entrada verificada, formato consistente.

## Veredicto Final (segunda pasada): APPROVED

Ambos Cambios Requeridos de la primera pasada quedaron resueltos y verificados empíricamente. `feature_list.json` se actualiza: `UX-69.status` pasa de `"in_progress"` a `"done"`.

`git stash list` verificado vacío al cierre de esta segunda pasada (no se usó `git stash` en esta sesión).
