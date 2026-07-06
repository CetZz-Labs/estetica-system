# Reporte de Revisión Técnica — Feature UX-13

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06

## Alcance auditado
UX-13 — Retoques futuros ocultos cuando existe un retoque pendiente. Fix quirúrgico: acotar el `updateMany` de auto-completado de retoques (EP-05) para que solo cierre retoques con `nextTouchupDate <= fecha de la nueva visita`, dejando `pending` los retoques con fecha futura.

## Archivos auditados
- `apps/server/src/controllers/serviceRecordController.ts` (`createServiceRecord`, líneas 61-77)
- `apps/server/src/controllers/appointmentController.ts` (`completeAppointment`, líneas 324-337)
- `progress/explores/explore_UX-13.md`
- `progress/implements/impl_UX-13-backend.md`
- `feature_list.json` (entrada `UX-13`)
- `CHECKPOINTS.md`
- `apps/server/src/__tests__/tenantIsolation.test.ts` (regresión de test suite, ver abajo)

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` en `feature_list.json` (confirmado con `git diff feature_list.json`: UX-12 ya `done`, UX-14 a UX-21 `pending`, ninguna otra tocada). `progress/current.md` describe correctamente UX-13 como feature en curso.
- [x] C3 (Fidelidad Arquitectónica — incl. multi-tenancy en queries) — cambio acotado exclusivamente al filtro del `updateMany` en ambos controllers, sin tocar cálculo de `nextTouchupDate`, descuento de stock, ni creación del nuevo `ServiceRecord`/`Appointment` de retoque automático. Ver detalle funcional abajo.
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/server build` → Exit Code 0. Frontend no aplica (feature exclusivamente backend, `Turnos.tsx` con cambios preexistentes de UX-12 ya aprobado, no tocado por este diff).
- [ ] C5 (Cierre de Sesión Append-Only) — pendiente: corresponde al `leader` tras este veredicto (entrada en `history.md`, `current.md` restaurado a plantilla).
- [x] C6 (Capa de Datos) — sin cambios de modelos Mongoose.
- [x] C7 (Security Gate) — `tenantId` preservado sin cambios en ambos filtros de `updateMany` (`serviceRecordController.ts:68`, `appointmentController.ts:330`). Sin variables sensibles hardcodeadas en `apps/server/src/` (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` sin matches de asignación literal).
- [x] C8 (Estabilidad de API) — sin cambio de contrato de respuesta.

## Verificación de Builds
```
pnpm --filter @estetica/server build   → Exit Code 0
```

## Verificación funcional del fix

1. **Fecha de comparación correcta en cada controller** — confirmado por lectura directa:
   - `serviceRecordController.ts:72`: `nextTouchupDate: { $lte: new Date(serviceDate) }`, donde `serviceDate` es el campo del body de la visita que se está registrando (no `new Date()` actual). Correcto.
   - `appointmentController.ts:334`: `nextTouchupDate: { $lte: serviceDate }`, donde `serviceDate = appointment.startTime` (línea 298), la fecha del turno que se completa. Correcto.
   - Ninguno de los dos usa la fecha del reloj del servidor por error.

2. **Multi-tenancy** — ambos `updateMany` conservan `tenantId`/`req.tenantId` sin alteración, junto con `client`/`service` como antes. Sin regresión de aislamiento cross-tenant.

3. **Alcance quirúrgico** — `git diff` confirma que el único cambio real en ambos controllers es la línea `nextTouchupDate: { $lte: ... }` agregada al filtro (más comentarios). No se tocó el bloque de descuento de stock, la creación del `ServiceRecord`/`Appointment` de retoque automático, ni ninguna validación de pertenencia al tenant.

4. **Caso borde `nextTouchupDate` null/undefined (verificado empíricamente, no solo por lectura)** — se corrió una prueba aislada con `mongodb-memory-server` (documentos con `nextTouchupDate: null`, campo ausente, fecha pasada y fecha futura, consultados con `{ $lte: <fecha> }`): **solo el documento con fecha pasada matcheó**; los documentos con `nextTouchupDate` `null` o ausente **no matchean** el operador `$lte` contra un `Date`. Esto confirma la hipótesis del implementer en `impl_UX-13-backend.md` (nota 2): un `ServiceRecord` `pending` sin `nextTouchupDate` deja de ser auto-completado por una visita posterior (antes del fix, sí se cerraba indiscriminadamente).
   - **Evaluación:** no es una regresión respecto a los criterios de aceptación de UX-13 tal como están redactados (criterio 1 exige explícitamente que la fecha "sea anterior o igual"; un valor nulo no cumple esa condición por definición, por lo que dejarlo `pending` es la lectura literal correcta del criterio). Tampoco genera el síntoma visible original (`getUpcomingTouchups`, `serviceRecordController.ts:148`, ya filtra `nextTouchupDate: { $ne: null }`, por lo que estos registros no aparecen en el dashboard).
   - **No bloqueante, pero requiere seguimiento:** queda como deuda técnica genuina — un `ServiceRecord` `pending` sin fecha nunca podrá auto-cerrarse por esta vía (antes sí, aunque de forma indiscriminada). Es consistente con que `createServiceRecord` (`serviceRecordController.ts:89`) crea el registro con `touchupStatus: 'pending'` incondicionalmente, sin exigir `nextTouchupDate` (a diferencia de `completeAppointment`, que sí condiciona `touchupStatus` a la presencia de `finalNextTouchupDate`, línea 348). Esta asimetría es preexistente a UX-13, no introducida por este fix. Recomiendo que el `leader` la registre en `progress/current.md` § Bloqueos y Riesgos Conocidos como candidata a feature separada (validar `nextTouchupDate` obligatorio cuando el registro nace `pending`).

## Test-runner (hallazgo relevante, no atribuible a UX-13)

Al correr `pnpm --filter @estetica/server test` con el binario de `mongodb-memory-server` ya disponible localmente, fallan 4 tests en `tenantIsolation.test.ts` (bloque "POST /api/registros..."): reciben `400` donde se esperaba `404`/`201`. **Se verificó por aislamiento** (`git stash` de los dos controllers tocados por UX-13 + re-run) que **estos 4 tests fallan exactamente igual sin el cambio de UX-13** — la causa es que esos tests no envían el campo `professional` en el body, y el checkeo `if (!professional) return 400` (comentario `// 0.c. EP-11`, preexistente, no tocado por esta feature) corta el flujo antes de llegar a las validaciones de `client`/`service`/stock que el test intenta ejercitar. Es deuda de test preexistente de EP-11, no una regresión de UX-13. No se agregó ningún test nuevo para el escenario de UX-13 (confirmado, coincide con lo declarado por el implementer) — recomendado como seguimiento, no bloqueante para este fix puntual.

## Otros hallazgos (no bloqueantes)
- Higiene de archivos: `progress/explores/_test.md` y `progress/explores/_test2.md` son archivos de debris sin relación aparente con UX-13 (contenido de prueba genérico, no diagnóstico). No fueron generados por el `impl_UX-13-backend.md` declarado; recomiendo que el `leader` los limpie en el ciclo de cierre de sesión.
- Sin `console.log`/`debugger`/`TODO` en los archivos tocados.

## Conclusión
El fix cumple los 3 criterios de aceptación de UX-13 de forma literal y quirúrgica, preserva multi-tenancy, compila sin errores, y no introduce regresiones de test (las 4 fallas observadas son preexistentes y no atribuibles a este diff). El caso borde de `nextTouchupDate` nulo queda documentado como deuda técnica de seguimiento, no como bloqueo.

## Estado del backlog
`feature_list.json` → `UX-13` actualizado de `"status": "in_progress"` a `"status": "done"`.
