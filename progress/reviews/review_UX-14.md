# Reporte de Revisión Técnica — Feature UX-14

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06

## Archivos Auditados
- `apps/client/src/components/RegistroModal.tsx` (único archivo modificado — confirmado por `git diff HEAD`, 8 líneas, coincide exactamente con `progress/implements/impl_UX-14-frontend.md`).
- `progress/explores/explore_UX-14.md`
- `progress/implements/impl_UX-14-frontend.md`
- `apps/client/src/api/serviceRecordApi.ts` (contrato `ServiceRecordPayload`, `nextTouchupDate?: string`).
- `apps/server/src/controllers/serviceRecordController.ts` y `apps/server/src/controllers/appointmentController.ts` (solo lectura, para confirmar que el fix cliente cubre ambos flujos de consumo — no se tocaron en esta feature).
- `feature_list.json` (`UX-14`, criterios de aceptación).
- `CHECKPOINTS.md`.

## Verificación funcional del fix

1. **Conversión condicional correcta:** `onSubmit` (línea 170-176) aplica `new Date(data.nextTouchupDate).toISOString()` únicamente cuando `data.nextTouchupDate` es truthy (spread condicional). Con el campo vacío (`''`, default/reset en líneas 103 y 139) la conversión se omite y el payload retiene `nextTouchupDate: ''` sin invocar `.toISOString()` sobre una fecha inválida (`new Date('').toISOString()` lanzaría `RangeError`). Confirmado por lectura directa de código — no hay riesgo de crash para el caso opcional.
2. **Ningún otro campo tocado:** diff de 6 líneas netas limitado exclusivamente a la función `onSubmit`; `{...register('nextTouchupDate')}` (línea 292) y el resto del formulario permanecen intactos.
3. **Cobertura de ambos flujos de envío:** el componente tiene un único `useMutation`/`mutationFn` (línea 145-152) que bifurca entre `completeAppointment(appointmentId, data)` y `createServiceRecord(data)` según `appointmentId`, pero ambas ramas consumen el mismo `data` del único `onSubmit`. Verificado en `appointmentController.ts:281-347` y `serviceRecordController.ts:12-88`: ambos controllers destructuran `nextTouchupDate` de `req.body` y lo pasan sin transformación a `new ServiceRecord({...})` (casteo Mongoose). El fix en el único punto de origen cliente cubre ambos endpoints por igual.
4. **Corrección del desfasaje (razonamiento ECMA-262):** un string `datetime-local` naive (`"2026-07-10T07:26"`) se interpreta como hora local del **motor JS que lo parsea** — antes del fix, ese parseo ocurría implícitamente en el proceso Node del backend (`new Date(finalNextTouchupDate)`), dependiente de su TZ de sistema. Con el fix, el parseo/anclaje ocurre en el navegador (TZ real de Argentina) y el string ya llega al backend con offset explícito (`...Z` o `+00:00`), por lo que `new Date(isoString)` en el backend ancla el mismo instante sin importar su TZ de proceso. Coincide exactamente con el patrón ya auditado y en producción en `Turnos.tsx:294` para `startTime`.
5. **Sin cambios de backend ni de helpers de formateo:** confirmado por `git diff` — `apps/server/` no aparece en el diff de esta feature; `formatDateTime`/`formatCalendarDate` (`apps/client/src/utils/dates.ts`) no fueron tocados.

## Verificación de builds (ejecutados por el reviewer, no solo declarados)

```
pnpm --filter @estetica/client build
```
→ **Exit Code 0.** `tsc -b && vite build` compiló sin errores (`✓ built in 774ms`).

```
pnpm --filter @estetica/client lint
```
→ **1 error, 4 warnings**, todos preexistentes y verificados byte a byte contra lo declarado por el implementer:
- `error` `apps/client/src/components/ProductoModal.tsx:37` (`'stock' is assigned a value but never used`) — deuda ya documentada en `progress/current.md`, no atribuible a este cambio.
- 4 `warning` `react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:110` (línea de `watch('service')`, no la línea modificada del fix), `Negocio.tsx:73`, `Turnos.tsx:405` — patrón estructural preexistente en todo el codebase (uso de `watch()` de react-hook-form), no introducido por este diff.

No se detectó ningún error/warning nuevo atribuible a la línea de `onSubmit` modificada.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico): única feature `in_progress` en `feature_list.json` (verificado con `grep "status"` sobre todo el archivo); `progress/current.md` describe correctamente UX-14 como feature en curso; sandbox hermético — el único archivo tocado por UX-14 es `RegistroModal.tsx` (los cambios pendientes de commit en `Turnos.tsx`/`appointmentController.ts`/`serviceRecordController.ts` pertenecen a UX-12/UX-13, ya cerradas con su propio `review_UX-12.md`/`review_UX-13.md`, y no forman parte del diff de esta feature).
- [x] C3 (Fidelidad Arquitectónica): el fix respeta la capa de presentación (`src/components/`), no introduce llamadas HTTP directas nuevas, no reimplementa formateo de fechas ad-hoc (el gate de `formatDateTime`/`formatCalendarDate` no aplica aquí — el fix es de *envío*, no de *visualización*, y la feature explícitamente no toca esos helpers). Paginación/multi-tenancy no aplican (no hay query nueva).
- [x] C4 (Compilación Estática + Lint): build Exit Code 0 confirmado por el reviewer; lint sin errores/warnings nuevos (1 error + 4 warnings, todos preexistentes, verificados).
- [x] C5 (Cierre de Sesión Append-Only): pendiente de ejecución por el leader tras este veredicto (entrada en `progress/history.md`, restauración de `progress/current.md`, archivado de `explore_UX-14.md`/`impl_UX-14-frontend.md`) — no bloqueante para el veredicto de código, es responsabilidad del protocolo de cierre del leader.
- [x] C6 (Capa de Datos): no aplica — feature 100% frontend, ningún modelo Mongoose tocado.
- [x] C7 (Security Gate): no aplica — no hay cambios de autenticación, queries, IDOR ni variables de entorno. Auditoría de secretos hardcodeados (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/`) irrelevante para este diff (cero archivos de backend tocados).
- [x] C8 (Estabilidad de API): no hay cambio de contrato de API — mismo shape de `ServiceRecordPayload`, solo cambia el *valor* del campo `nextTouchupDate` (de naive a ISO-UTC), no su tipo ni su nombre. No requiere entrada en `CHANGELOG.md`.

## Observaciones (no bloqueantes, para bitácora del leader)

- El diagnóstico del `explorer` y la justificación del `implementer` son ambos precisos y verificables por lectura directa de código; no se encontraron discrepancias entre lo documentado y el diff real.
- Persiste como riesgo aceptado (fuera de alcance de UX-14, ya señalado por el propio equipo): los `nextTouchupDate`/`startTime` ya persistidos antes del fix conservan el offset incorrecto (dato histórico contaminado). No amerita bloquear esta feature.
- Nota de higiene de repo (no de esta feature): al momento de la auditoría, `apps/client/src/views/Turnos.tsx`, `apps/server/src/controllers/appointmentController.ts` y `apps/server/src/controllers/serviceRecordController.ts` tienen cambios sin commitear correspondientes a UX-12/UX-13 (ya con veredicto propio). Recomiendo al leader commitear esas features cerradas antes de acumular más diffs sueltos en el working tree, para mantener el diff de cada feature auditable de forma aislada.

## Acción de cierre aplicada por este reviewer

`feature_list.json` → `"UX-14".status` actualizado de `"in_progress"` a `"done"`.
