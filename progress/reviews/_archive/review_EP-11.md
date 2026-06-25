# Reporte de Revisión Técnica — Feature EP-11 (Gestión de Profesionales agendables)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-06-24 (re-verificación C8 tras corrección del leader)

---

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico)** — EP-11 es la única feature `in_progress`. Sandbox hermético: backend tocó solo `apps/server/src/`, frontend solo `apps/client/src/`. Existen `impl_EP-11-backend.md`, `impl_EP-11-frontend.md` y `explore_EP-11.md` en disco.
- [x] **C3 (Fidelidad Arquitectónica — incl. multi-tenancy en queries)** — Backend en capas correctas (models/controllers/routes/scripts). Todo query Mongoose de `professionalController.ts` filtra por `req.tenantId` con `findOne`/`findOneAndUpdate({_id, tenantId})`. Frontend consume datos exclusivamente vía `src/api/professionalApi.ts` + TanStack Query, 4 estados cubiertos, HTML semántico con `<button>` + `cursor-pointer`. Ver nota de deuda preexistente abajo.
- [x] **C4 (Compilación Estática + Lint)** — Builds verificados por el leader: server Exit Code 0, client Exit Code 0. Lint: único error es PRE-EXISTENTE en `ProductoModal.tsx:37` (`'stock' unused`), fuera del diff de EP-11. No es nuevo ni bloqueante.
- [x] **C5 (Cierre de Sesión Append-Only)** — Evidencias en disco presentes (impl + este review). El cierre de `history.md`/`current.md` y el flip a `done` los gobierna el leader/reviewer tras VERDE (no aplica aquí por el defecto C8).
- [x] **C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades)** — `Professional.ts`: interfaz `IProfessional`, `tenantId` required+index, `timestamps`, `color` validado `/^#[0-9A-Fa-f]{6}$/`, índices compuestos `{tenantId,isActive}` y `{tenantId,name}` (anteponen `tenantId`), `isActive` default true (soft delete). `Appointment.professional` → `ref:'Professional'` required. `ServiceRecord.professional` → `ref:'Professional'` index, opcional en schema (legacy) — coincide con la decisión documentada.
- [x] **C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404)** — SEC-A: router aplica `checkAdminAccess`+`checkTenantAccess` vía `router.use`. SEC-B: lectura de profesional por `_id` siempre con `{_id, tenantId}` → 404 cross-tenant (`getProfessionalById`); refs del body (`professional`, `linkedAdmin`) validadas contra tenant+activo antes de usarse en `createAppointment`/`updateAppointment`/`createServiceRecord`/`createProfessional`/`updateProfessional` → 400 si no pertenecen. SEC-E: `express-validator` con `validateRequest` último en POST/PUT/DELETE. SEC-G: sin `dangerouslySetInnerHTML`/`alert` en el set de EP-11. SEC-H: `grep` de secretos hardcodeados en `apps/server/src/` → sin matches.
- [x] **C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato)** — **RESUELTO.** El leader agregó la entrada de EP-11 en `CHANGELOG.md → ## [Unreleased]`. Verificado: `Added` (línea 9) documenta la entidad/endpoints; `Changed` (líneas 13-16) cubre los 3 breaking changes con marca `[BREAKING]` (permitido por estar `in_progress`): (1) `professional` requerido en `POST /api/turnos`, (2) `professional` requerido en `POST /api/registros`, (3) forma de respuesta `professional` `{_id,email}`→`{_id,name,color}` en los GET de turnos y `GET /api/registros/cliente/:clientId`, más el cambio de `ref` del modelo. Referencia al migration guide incluida. Gate C8 satisfecho.

---

## Verificación de la Asociación professional_id y "no Admin" (foco de la feature)

- `grep -rnE "professional:\s*req\.adminInfo"` en `apps/server/src/` → **sin matches**. Se eliminó por completo el placeholder de EP-14.
- `appointmentController.createAppointment` (`appointmentController.ts:18-22, :58`): lee `professional` del body, valida `Professional.findOne({_id, tenantId, isActive:true})` → 400, persiste `professionalId` real.
- `appointmentController.completeAppointment:298`: el retoque auto-creado usa `appointment.professional` (Professional), no admin.
- `serviceRecordController.createServiceRecord` (`serviceRecordController.ts:29-35, :100, :121`): `professional` requerido (400 si falta), validado tenant+activo, persistido en el record y propagado al turno de retoque.
- Guard de baja (`professionalController.ts:133-157`): cuenta turnos futuros `pending`/`confirmed` `startTime >= now`; sin `confirm:true` → 409 con `futureAppointments` poblados; con `confirm:true`/sin futuros → soft delete `isActive=false` (sin borrado físico). Cumple criterios 4 y 5.
- Selectores solo activos: `Turnos.tsx:134` y `RegistroModal.tsx:78` usan `getProfessionals()` (activos por defecto). Cumple criterio 2.
- Sección separada de Usuarios: `AppLayout.tsx:118-130` bloque "Equipo" con NavLink `/profesionales`; `ProfesionalModal.tsx` no pide mail ni contraseña (solo name/color/vínculo opcional). Cumple criterio 1.
- Migración idempotente (`scripts/migrate-ep11-professionals.ts`): Admin→Professional por `linkedAdmin`, remapeo de `Appointment.professional`, saltea ya-migrados. Cumple criterio 6 (no ejecutada — requiere DB, esperado).

---

## Cambios Requeridos (Bloqueantes)

Ninguno pendiente. El único defecto bloqueante original (C8 — ausencia de entrada de breaking changes en `CHANGELOG.md → [Unreleased]`) fue resuelto por el leader y re-verificado en esta pasada. Registro del defecto original y su cierre:

1. ~~**`CHANGELOG.md → [Unreleased]`: faltaban los 3 breaking changes de contrato de EP-11.**~~ **RESUELTO** (verificado en `CHANGELOG.md` líneas 9, 13-16):
   - `POST /api/turnos`: `professional` ahora **requerido** — documentado en `Changed` con `[BREAKING]`.
   - `POST /api/registros`: `professional` ahora **requerido** — documentado en `Changed` con `[BREAKING]`.
   - Cambio de forma de respuesta `professional` `{_id,email}`→`{_id,name,color}` en GET de turnos y `GET /api/registros/cliente/:clientId` — documentado en `Changed` con `[BREAKING]`.
   - Bonus: cambio de `ref` del modelo (`Admin`→`Professional`) también documentado. Migration guide referenciado. Breaking permitido por estar `in_progress`.

---

## Deuda Preexistente (NO bloqueante, señalada)

- **Lint:** `apps/client/src/components/ProductoModal.tsx:37` — `'stock' is assigned a value but never used`. Fuera del diff de EP-11. No corregido por respeto al alcance atómico.
- **Helper de fechas:** `Profesionales.tsx:72` usa `new Date(iso).toLocaleDateString('es-AR', {...})` ad-hoc para un timestamp real. El C3 nombra `formatDateTime`, pero ese helper **no existe** en `apps/client/src/utils/dates.ts` (solo expone `formatDate` date-only y `getTimelineStatus`). El patrón replica exactamente el ya presente en `Turnos.tsx:360` y `:657` para timestamps reales. Al no introducir el desfase UTC-3 de date-only y ser consistente con la convención vigente, se trata como deuda preexistente del codebase, no como violación nueva de EP-11.

---

## Conclusión

Implementación técnicamente sólida en multi-tenancy, IDOR, guard de baja, asociación `professional_id` y trifecta de accesibilidad. El único defecto bloqueante original (C8) fue corregido por el leader y re-verificado: la entrada de breaking changes está presente en `CHANGELOG.md → [Unreleased]`. **Los 7 gates (C2–C8) quedan en `[x]`. Veredicto: APPROVED.** `feature_list.json` actualizado: EP-11 → `"status": "done"`.
