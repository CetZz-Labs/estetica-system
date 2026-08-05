# Reporte de Revisión Técnica — Feature UX-71

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-04

## Resumen ejecutivo

Cambio trivial y quirúrgico en `apps/client/src/components/RegistroModal.tsx`, exactamente el descrito en `progress/implements/impl_UX-71.md`. `git diff -w` confirma que sobre la base ya aprobada de UX-69 (no commiteada aún, ver `review_UX-69.md`, veredicto APPROVED en segunda pasada), UX-71 solo agrega dos líneas de estructura: la clase condicional del grid contenedor y el wrapper `{!pastVisitMode && (...)}` alrededor del bloque completo "Próximo Retoque". Ningún JSX interno del bloque fue alterado (mismo label, botón "Usar sugerida", inputs `touchupDate`/`touchupTime` vía `Controller`, mensaje de error de `touchupTime`). Build y lint pasan en verde, sin errores ni warnings nuevos.

## Checklist de Acceptance Criteria (`feature_list.json`, id `UX-71`)

1. **[x]** Bloque "Próximo Retoque" no se renderiza cuando `pastVisitMode` es `true`.
   Evidencia: `apps/client/src/components/RegistroModal.tsx`, wrapper `{!pastVisitMode && ( <div className="flex flex-col gap-1.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200 md:-mt-2"> ... </div> )}` envuelve el label, el botón condicional "Usar sugerida", el grid interno con `touchupDate`/`touchupTime` (`Controller`) y el `{errors.touchupTime && ...}` — todo el bloque descrito en el criterio queda dentro del condicional, nada quedó fuera.

2. **[x]** "Fecha del Servicio" ocupa el espacio disponible de forma prolija cuando el bloque de retoque no está; grid ajustado sin romper los otros dos modos.
   Evidencia: `<div className={`grid grid-cols-1 ${pastVisitMode ? '' : 'md:grid-cols-2'} gap-5`}>` — en `pastVisitMode` el grid queda en una sola columna (`grid-cols-1` sin el `md:grid-cols-2`), por lo que el input de fecha ocupa el ancho completo; en los otros dos modos la clase `md:grid-cols-2` se preserva íntegra.

3. **[x]** Modo normal (sin `pastVisitMode`) y modo completar turno (`appointmentId`) muestran el bloque exactamente igual que antes.
   Evidencia: en ambos casos `pastVisitMode` es `false` (default de la prop, no seteado por `Dashboard.tsx`/`Turnos.tsx` en el flujo de completar turno), por lo que `!pastVisitMode` evalúa `true` y el bloque completo se renderiza sin cambios; el grid mantiene `md:grid-cols-2`. Verificado por lectura estática — `pastVisitMode` solo se pasa explícitamente `true` desde `ProfileClient.tsx` (`<RegistroModal preselectedClientId={id} pastVisitMode />`, ya aprobado en UX-69).

4. **[x]** El payload en `pastVisitMode` nunca incluye `nextTouchupDate`, sin residuales al alternar modo en la misma sesión.
   Evidencia: `onSubmit` solo agrega `nextTouchupDate` al payload si `touchupDate && touchupTime` están presentes (`...(nextTouchupDate ? { nextTouchupDate } : {})`), y en `pastVisitMode` esos inputs no están montados (sin acceso del usuario para poblarlos). Además, el `useEffect` de apertura (`reset({..., touchupDate: '', touchupTime: '', ...})`) tiene `pastVisitMode` en su arreglo de dependencias, por lo que cualquier cambio de modo entre aperturas dispara un `reset()` limpio de esos campos — no hay ventana para un valor residual.

5. **[x]** `pnpm --filter @estetica/client build` y `pnpm --filter @estetica/client lint` pasan con exit code 0.
   Verificado empíricamente en esta revisión (no solo referido de la bitácora del implementer):
   ```
   pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, sin errores)
   pnpm --filter @estetica/client lint    → Exit 0 (0 errores, 4 warnings preexistentes de react-hooks/incompatible-library en ProfesionalModal.tsx:83, RegistroModal.tsx:128, Negocio.tsx:87, Turnos.tsx:208 — todos sobre uso de watch() de react-hook-form, ninguno introducido por este cambio ni relacionado al bloque tocado)
   ```

## Aislamiento del diff (validación anti "scope creep")

`git diff -- apps/client/src/components/RegistroModal.tsx` contra HEAD incluye, además de UX-71, los cambios de UX-69 (ya `APPROVED` en `review_UX-69.md`, aún no commiteados a git — mismo patrón de trabajo de la sesión, confirmado con `progress/implements/_archive/impl_UX-69-frontend.md`). Para aislar el delta real de UX-71 se corrió `git diff -w` (ignorando whitespace): las únicas líneas de contenido nuevas son exactamente las dos descritas en `impl_UX-71.md` — la clase condicional del `<div>` grid y los marcadores `{!pastVisitMode && (` / `)}` alrededor del bloque de retoque. Nada del resto del diff (prop `pastVisitMode`, `getYesterdayDateString`, `isBackfill`, `min`/`max` de `serviceDate`, título/subtítulo del `Modal`, invalidación de `client-history`) es atribuible a esta feature — pertenece a UX-69 y ya fue auditado en su propio ciclo de revisión.

## Sin uso de git stash

No fue necesario usar `git stash` en esta revisión (solo lectura de diffs + build/lint). `git stash list` verificado vacío antes y después.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` al momento de arrancar la revisión (`UX-71`), un solo archivo tocado, sandbox hermético (frontend puro, sin tocar `apps/server/`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — no aplica paginación/tenancy en este cambio (JSX de presentación puro); no se rompió ningún flujo existente de los otros dos modos (verificado punto 3 arriba).
- [x] C4 (Compilación Estática + Lint) — ambos comandos exit 0, verificado empíricamente en esta revisión.
- [x] C5 (Cierre de Sesión Append-Only) — se aplica en este cierre (ver actualización de `feature_list.json` abajo).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no aplica, no se tocó ningún modelo ni query.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — no aplica, cambio puramente de presentación condicional en un componente ya auditado en materia de seguridad (UX-69).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — no aplica, no hay cambio de contrato de API (el bloque oculto nunca envía datos en `pastVisitMode`, comportamiento de payload sin cambios respecto a antes de UX-71).

## Auditoría de variables sensibles

No aplica — el archivo tocado (`apps/client/src/components/RegistroModal.tsx`) no lee configuración de entorno ni contiene secretos.

## Veredicto Final: APPROVED

`feature_list.json`: `UX-71.status` actualizado de `"in_progress"` a `"done"`.
