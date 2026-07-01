# Reporte de Revisión Técnica — Bug Fix EP-11 (crash 409 turnos futuros)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-01T22:19:28Z

## Alcance auditado

Fix puntual (no feature nueva de `feature_list.json`, no se toca ese archivo ni ningún status):

- `apps/server/src/controllers/professionalController.ts`
- `apps/client/src/api/professionalApi.ts`
- `apps/client/src/views/Profesionales.tsx`

Verificado con `git diff` real (no solo bitácoras de implementers) — ver evidencia abajo.

## Verificación empírica de builds (ejecutados por el reviewer, no solo reportados)

- `pnpm --filter @estetica/server build` → **Exit Code 0** (`tsc` sin errores).
- `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, bundle generado; warning de chunk size preexistente y no relacionado).
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, pero el único **error** es el ya documentado y preexistente `'stock' is assigned a value but never used` en `apps/client/src/components/ProductoModal.tsx:37` (confirmado que no aparece en el diff de este fix). Los 4 *warnings* restantes (`ProfesionalModal.tsx:83`, `RegistroModal.tsx:110`, `Negocio.tsx:73`, `Turnos.tsx:392`) son de React Compiler sobre `watch()` de react-hook-form, preexistentes, ninguno en los archivos tocados por este fix. **Ningún error o warning nuevo en `professionalApi.ts` o `Profesionales.tsx`.**

## Hallazgos verificados sobre el diff real

1. **Anti mass-assignment (`confirm`):** `updateProfessional` lee `const confirm = req.body?.confirm === true;` (línea 170) por separado del destructuring de `$set`. El bloque `$set` (líneas 206-210) solo incluye `name`, `color`, `linkedAdmin`, `isActive` — `confirm` nunca se persiste. Correcto.
2. **Guard estricto (`isActive === false`):** línea 174, `if (isActive === false && !confirm)`. Verificado:
   - `isActive: true` (reactivación, usado por `Profesionales.tsx:53` vía `reactivate` mutation) → `false !== true` no dispara el guard. Comportamiento intacto.
   - `isActive` ausente del body (edición de `name`/`color`/`linkedAdmin` sin togglear estado) → `undefined === false` es `false`, no dispara el guard. Comportamiento intacto.
   - Solo `isActive === false` sin `confirm === true` dispara el 409. Simétrico con `deleteProfessional`.
3. **Multi-tenancy:** `findFutureAppointments(tenantId, professionalId)` (líneas 13-32) filtra `Appointment.find({ tenantId, professional: professionalId, ... })`. El `updateProfessional` sigue usando `Professional.findOne({ _id: id, tenantId: req.tenantId })` implícito vía `findOneAndUpdate({ _id: id, tenantId: req.tenantId }, ...)` (línea 212-216) — nunca `findByIdAndUpdate`. `deleteProfessional` mantiene `Professional.findOne({ _id: id, tenantId: req.tenantId })` (línea 235). Ningún IDOR cross-tenant introducido: aunque `updateProfessional` no verifica existencia de la profesional *antes* de correr el guard de turnos futuros, la query de `findFutureAppointments` ya filtra por `tenantId`, por lo que un `id` de otro tenant no puede filtrar turnos ajenos (devuelve array vacío) y el flujo termina en 404 vía `findOneAndUpdate`. Sin fuga de datos cross-tenant.
4. **Tipo `FutureAppointment` (frontend):** `apps/client/src/api/professionalApi.ts:19-24` ahora tipa `client: { _id: string; firstName: string; lastName: string }` y `service: { _id: string; name: string }`, coincidiendo exactamente con el shape real que devuelve `findFutureAppointments` en el backend (`.populate('client', 'firstName lastName')` / `.populate('service', 'name')`, más `_id` implícito de Mongoose). Matching correcto.
5. **Render en `Profesionales.tsx:191`:** `{appt.client.firstName} {appt.client.lastName} · {appt.service.name}` — ya no intenta renderizar el objeto completo. Se buscó (según bitácora, confirmado con el diff) que no queden otros consumidores de `FutureAppointment` con el shape viejo; el único uso está en esta línea y en el `queryKey`/estado `conflictAppointments` que solo tipa el array, no renderiza directo.
6. **Reutilización DRY:** `deleteProfessional` fue refactorizado para usar el mismo `findFutureAppointments` (líneas 242-249), eliminando duplicación y garantizando que ambos caminos (`DELETE` y `PUT isActive:false`) compartan exactamente la misma query y el mismo shape de respuesta 409 — mitiga el riesgo de que ambos guards diverjan en el futuro.
7. **Contrato de API (C8):** No hay cambio de contrato del backend — el shape de la respuesta 409 (`futureAppointments` con objetos populados) siempre fue así; el bug era exclusivamente un tipo TS incorrecto en el frontend que no reflejaba el runtime real. No corresponde entrada en `CHANGELOG.md`.
8. **Variables sensibles:** `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` sobre `professionalController.ts` con filtro de asignación literal → sin matches. Sin hardcodeo.

## Observación no bloqueante

- La ruta `PUT /api/profesionales/:id` (`apps/server/src/routes/professionalRoutes.ts`, bloque `router.put`) no declara `body('confirm').optional().isBoolean()` como sí lo hace la ruta `DELETE` (línea ~80). No es un fallo de seguridad (el controller usa comparación estricta `=== true`, cualquier valor no-booleano-`true` literal simplemente no activa el bypass del guard) ni bloquea el fix, pero rompe la simetría de validación entre ambas rutas. Sugerido para un fix de higiene posterior, fuera del alcance de este bug fix puntual.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — fix quirúrgico, no toca `feature_list.json`, archivos modificados pertenecen exclusivamente al alcance del bug (backend `professionalController.ts`, frontend `professionalApi.ts` + `Profesionales.tsx`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — `findOneAndUpdate`/`findOne` con `{ _id, tenantId }` preservados; sin `findByIdAndUpdate`. No aplica paginación (no es un listado nuevo).
- [x] C4 (Compilación Estática + Lint) — server build exit 0, client build exit 0, lint exit 1 solo por deuda preexistente ajena documentada.
- [x] C5 (Cierre de Sesión Append-Only) — no aplica a este ciclo de review (bug fix, no feature; el usuario indicó explícitamente no tocar `feature_list.json`). Bitácoras de implementers presentes en disco.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — sin cambios de modelo; `Appointment`/`Professional` ya multi-tenant, sin alteración de schemas.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — guard nuevo respeta aislamiento de tenant, anti mass-assignment de `confirm` verificado, sin secretos hardcodeados.
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — sin cambio de contrato real, solo corrección de tipo TS que no matcheaba el runtime.

## Cambios Requeridos
Ninguno. El fix es correcto, simétrico, multi-tenant-safe y no introduce regresiones. Ver observación no bloqueante arriba para higiene futura opcional.
