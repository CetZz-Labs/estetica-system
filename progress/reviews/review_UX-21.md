# Reporte de Revisión Técnica — Feature UX-21

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-07

## Contexto auditado

- `feature_list.json` → UX-21, "Validar unicidad de nombre de servicio en el catálogo", `status: in_progress` al momento de la auditoría.
- `progress/implements/impl_UX-21-backend.md` (tocó `apps/server/src/controllers/serviceController.ts`).
- `progress/implements/impl_UX-21-frontend.md` (tocó `apps/client/src/components/ServicioModal.tsx`).
- Diff real verificado con `git diff HEAD` (no solo las bitácoras): confirma que **únicamente** esos dos archivos de código fueron modificados (más el propio `feature_list.json` para el flag `in_progress`).

## Criterios de aceptación (UX-21) — verificación empírica

1. **"No debe poder crearse (ni renombrarse a) un servicio con el mismo nombre que otro servicio activo del mismo tenant (case-insensitive)"**
   - `createService` (serviceController.ts:12-21): `Service.findOne({ tenantId: req.tenantId, isActive: true, name: { $regex: new RegExp('^'+safeName+'$', 'i') } })` con `escapeRegex` para evitar inyección de regex. Cubre creación. ✅
   - `updateService` (serviceController.ts:80-94): mismo check, dentro de `if (name !== undefined)`, ejecutado antes del `findOneAndUpdate`. Cubre renombrado. ✅
   - Case-insensitive: flag `'i'` en el `RegExp` en ambos casos. ✅

2. **"El error se muestra de forma clara en el formulario (inline, no solo toast genérico)"**
   - `ServicioModal.tsx:45-52`: el `onError` de la mutation intercepta el mensaje exacto y llama `setError('name', { type: 'manual', message })`, seguido de `return` — no cae al `handleApiError` (toast) para este caso puntual. El bloque JSX de `errors.name` (líneas 94-98) ya renderiza color rojo (`text-maison-red`) + ícono (`FiAlertCircle`) + texto — trifecta visual completa, reutilizada sin duplicar componente. ✅
   - Verificado que NO hay duplicación toast+inline para este caso (regla dura `.claude/rules/frontend.md §5`): el `return` corta el flujo antes de `handleApiError`. ✅

3. **"La validación respeta el aislamiento multi-tenant (EP-08)"**
   - Ambos checks de duplicado filtran por `tenantId: req.tenantId` (nunca del body/params). `req.tenantId` es inyectado por `checkTenantAccess` (montado en `serviceRoutes.ts:17`), no modificado en esta feature. Mismo nombre en tenants distintos NO colisiona (el filtro exige coincidencia de `tenantId`). ✅

## Puntos críticos de fragilidad — verificación carácter por carácter

- **Contrato del mensaje de error:** confirmado idéntico en ambos archivos:
  - Backend (`serviceController.ts:20` y `:92`): `'Ya existe un servicio activo con este nombre.'`
  - Frontend (`ServicioModal.tsx:47`): `'Ya existe un servicio activo con este nombre.'`
  - Match exacto (mayúsculas, tilde, punto final, sin espacios extra). Comparación por igualdad estricta (`===`), no `includes`, evitando falsos positivos con otros 400 del mismo endpoint (ej. validación de `duration`). ✅
- **`isActive: true` explícito** en el filtro de duplicado de `createService` y `updateService` — confirmado en código real, no solo en la bitácora. Un servicio soft-deleted con el mismo nombre no bloquea la creación/renombrado. ✅
- **Auto-exclusión en `updateService`:** `_id: { $ne: id }` presente en el filtro (línea 85) — un servicio no choca contra sí mismo al guardar sin cambiar el nombre (o cambiando solo `duration`/`defaultTouchupDays`). ✅
- **Multi-tenancy real:** `req.tenantId` usado en ambos checks; no se acepta `tenantId` de body/params en ningún punto de `serviceController.ts` (grep manual del archivo completo). ✅
- **Diff acotado:** confirmado con `git diff --stat HEAD` → solo `ServicioModal.tsx`, `serviceController.ts` y `feature_list.json` (flag de estado). No se tocó `Service.ts`, `serviceRoutes.ts` ni `productController.ts`. ✅

## Verificación de builds (ejecutados por el reviewer, no solo referidos por el implementer)

- `pnpm --filter @estetica/server build` → **Exit Code 0** (`tsc` sin salida de error).
- `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, único warning preexistente de chunk >500kB, no relacionado).
- `pnpm --filter @estetica/client lint` → 1 error preexistente y ya documentado (`ProductoModal.tsx:37:25 'stock' is assigned a value but never used`), 4 warnings preexistentes de React Compiler (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, todos por uso de `watch()`, sin relación con esta feature). `ServicioModal.tsx` no aparece en la salida de ESLint — sin errores ni warnings nuevos. Consistente con lo reportado por el implementer.

## Auditoría de variables sensibles (Gate Bloqueante)

`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin resultados. No aplica a esta feature (no se tocó configuración de entorno) y no se detectaron hardcodeos preexistentes en el árbol.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, diff acotado a los archivos que corresponden a UX-21.
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — check de duplicado es una query puntual (`findOne`), no un listado; no aplica paginación. Multi-tenancy correcto (`req.tenantId`, nunca del body).
- [x] C4 (Compilación Estática + Lint) — ambos builds Exit Code 0; lint sin errores/warnings nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de completar por el leader tras este veredicto (entrada en `progress/history.md`, archivado de `impl_*`/`explore_*`).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se modificó `Service.ts`; el modelo ya tenía `tenantId` (EP-08), consistente con la decisión documentada de no agregar índice `unique`+`collation` (resuelto a nivel de aplicación, igual que el patrón ya validado para `Product`).
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — no aplica IDOR nuevo (no se tocó lookup por `_id` sin tenant); SEC-F (unicidad + soft-delete) cumplido explícitamente por el AC de esta feature.
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — no hay cambio de contrato de respuesta existente; se agrega un nuevo código de error 400 a un endpoint ya documentado como fuente de 400s (validación), no rompe consumidores existentes. No requiere entrada en `CHANGELOG.md`.

## Cambios Requeridos (Si aplica)

Ninguno. Todos los criterios de aceptación y puntos críticos fueron verificados directamente contra el código fuente (no solo contra las bitácoras de los implementers), con match exacto del contrato de error y aislamiento multi-tenant correcto.
