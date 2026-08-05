# Reporte de Revisión Técnica — Feature UX-70

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-04

## Alcance auditado

`git diff -- apps/server/src/controllers/serviceRecordController.ts` (único archivo de código tocado):

```diff
-import { Appointment } from '../models/Appointment';
...
-        // Auto-create next touchup appointment in calendar
-        if (finalNextTouchupDate) {
-            const touchupStart = new Date(finalNextTouchupDate);
-            const duration = foundService.duration || 60;
-            const touchupEnd = new Date(touchupStart.getTime() + duration * 60000);
-            await Appointment.create({
-                tenantId, client, service, professional,
-                startTime: touchupStart, endTime: touchupEnd,
-                status: 'pending',
-                notes: 'Retoque programado automáticamente',
-                createdBy: req.adminInfo!._id,
-                isActive: true,
-            });
-        }
-
         return res.status(201).json(savedRecord);
```

Coincide exactamente con lo descrito en `progress/implements/impl_UX-70.md` y con el bloque identificado en `progress/explores/explore_UX-70.md` (antiguas líneas 108-127 + import de `Appointment`). Nada fuera de este bloque fue tocado.

## Checklist de Acceptance Criteria (`feature_list.json` → `UX-70`)

1. **"createServiceRecord YA NO llama a Appointment.create(...)"** → CUMPLE. `grep -n "Appointment" apps/server/src/controllers/serviceRecordController.ts` no devuelve ningún resultado (ni el import ni ninguna referencia residual).
2. **"El ServiceRecord sigue guardando nextTouchupDate y touchupStatus:'pending' exactamente igual que hoy"** → CUMPLE. Verificado por lectura línea por línea del archivo resultante (líneas 92-105): `newRecord` sigue construyéndose con `nextTouchupDate: finalNextTouchupDate` y `touchupStatus: 'pending'` sin cambios. `getUpcomingTouchups` no fue tocado.
3. **"La agenda deja de mostrar el evento 'Retoque programado automáticamente'"** → CUMPLE por construcción: al eliminarse el único punto del código que creaba un `Appointment` con ese `notes` literal, ningún flujo puede seguir generándolo. Verificación manual en UI no aplicable a este auditor (sin entorno corriendo); la garantía es estática (no queda código que lo produzca) — aceptable dado que es un borrado puro sin lógica condicional nueva.
4. **"Ningún otro flujo que cree Appointments se modifica"** → CUMPLE. `git diff --stat` confirma un único archivo de código modificado (`serviceRecordController.ts`); `appointmentController.ts` no aparece en el diff.
5. **"Decisión explícita registrada sobre el efecto colateral en reminderScheduler.ts"** → CUMPLE PARCIALMENTE. La decisión del usuario (trade-off aceptado, sin cron de reemplazo) está registrada en `progress/current.md` (sección "Decisiones del usuario (2026-08-04)"). El AC pide explícitamente que quede en `progress/history.md` "al cerrar" — no hay todavía entrada en `progress/history.md` para UX-70 al momento de este review. Esto corresponde al Protocolo de Cierre de Sesión (paso 3, `CLAUDE.md`), que es responsabilidad del `leader` posterior a este veredicto, no del `reviewer`. **No es bloqueante para este review**, pero queda como pendiente explícito para el leader antes de dar la sesión por cerrada.
6. **"pnpm --filter @estetica/server build pasa con exit code 0"** → CUMPLE. Ver sección Build.

## Verificación de no-tocar `reminderScheduler.ts` / `mailService.ts` (efecto colateral ya aceptado, no se marca como hallazgo)

```
git diff --stat
 .../src/controllers/serviceRecordController.ts     | 22 ---------
 feature_list.json                                  | 56 +++++++++++++++++++++-
 progress/current.md                                | 23 +++++++--
```

Ninguno de los dos archivos aparece en el diff. Confirmado: no se tocaron.

## Resultado del Build

```
pnpm --filter @estetica/server build
> tsc
EXIT_CODE=0
```

## Resultado de Tests

```
pnpm --filter @estetica/server test  (vitest run)
Test Files  1 failed | 2 passed (3)
Tests  4 failed | 31 passed (35)
```

Los 4 fallos son todos en `apps/server/src/__tests__/tenantIsolation.test.ts`, suite `POST /api/registros` (líneas 263-320). **Confirmado como pre-existente y NO causado por este diff**: se hizo `git stash push -- apps/server/src/controllers/serviceRecordController.ts` (revirtiendo únicamente el cambio de UX-70) y se corrió la suite de nuevo — los mismos 4 tests fallan idénticamente sin el cambio de UX-70 aplicado. Causa raíz (no atribuible a esta feature): esos 4 tests no envían el campo `professional` en el body de `POST /api/registros`, y el controlador exige `professional` obligatorio desde una feature previa (EP-11, validación en líneas 30-36, sin tocar por UX-70) — el request cae en `400 "La profesional (professional) es obligatoria"` antes de llegar a las validaciones de tenant que los tests esperan ejercitar. Deuda de test desactualizado ajena al alcance de UX-70; no bloquea este review (`git stash pop` restauró el estado correcto tras la comprobación).

`tenantSettings.test.ts` y `onboarding.test.ts` pasan completos (31/35 tests OK, los 4 restantes son los descritos arriba).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` era UX-70; sandbox hermético confirmado (solo `serviceRecordController.ts` + artefactos de proceso `feature_list.json`/`progress/current.md`); `impl_UX-70.md` y este `review_UX-70.md` en disco.
- [x] C3 (Fidelidad Arquitectónica) — cambio puramente de eliminación de código dentro de `controllers/`; no introduce ni rompe validación, soft-delete, control de stock, ni paginación existente. Multi-tenancy de las queries no tocadas (`findOne({ _id, tenantId })` intacto en `foundClient`/`foundService`/`Product`).
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/server build` exit code 0. (Frontend no aplica — no se tocó `apps/client`.)
- [ ] C5 (Cierre de Sesión Append-Only) — pendiente de completar por el `leader`: falta entrada en `progress/history.md` y restaurar `progress/current.md` a plantilla vacía tras el cierre. Fuera del alcance de este `reviewer` (ver AC #5 arriba).
- [x] C6 (Capa de Datos) — ningún modelo Mongoose tocado.
- [x] C7 (Security Gate) — SEC-B/IDOR no afectado (las validaciones `findOne({ _id, tenantId })` de `client`/`service`/`product` permanecen intactas). No se leyó ni tocó configuración de entorno en este archivo — gate de variables sensibles no aplica. No hay dependencias nuevas ni endpoints nuevos.
- [x] C8 (Estabilidad de API) — el contrato de respuesta de `POST /api/registros` (el `ServiceRecord` creado) no cambia de forma; lo que deja de ocurrir es un efecto colateral (creación implícita de un recurso en otra colección), no un campo de la respuesta. No aplica CHANGELOG.

## Cambios Requeridos

Ninguno bloqueante. Único punto de seguimiento (no bloqueante, responsabilidad del `leader` en el cierre de sesión):

1. `progress/history.md`: agregar entrada para UX-70 documentando el trade-off aceptado (pérdida del recordatorio por mail 24h para retoques), tal como exige el AC #5 de la feature y el Protocolo de Cierre de Sesión de `CLAUDE.md`. La decisión ya está registrada en `progress/current.md` — falta trasladarla al registro append-only permanente.

## Cierre

`feature_list.json` → `UX-70.status` actualizado de `"in_progress"` a `"done"` por este reviewer.
