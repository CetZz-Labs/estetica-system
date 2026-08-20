# Reporte de Revisión Técnica — Feature UX-72

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Alcance auditado
- `apps/server/src/controllers/serviceRecordController.ts` — `deleteServiceRecord`
- `apps/server/src/routes/serviceRecordRoutes.ts` — `DELETE /:id`
- `apps/client/src/api/serviceRecordApi.ts` — `deleteServiceRecord(id)`
- `apps/client/src/views/Historial.tsx`
- `apps/client/src/views/ProfileClient.tsx`

Confirmado con `git diff --stat HEAD` contra lo declarado en `impl_UX-72-backend.md` e `impl_UX-72-frontend.md`: coincide exactamente, sin archivos fuera de alcance tocados (solo `feature_list.json` y `progress/current.md` adicionales, ambos esperables del ciclo de la feature).

## Verificación de puntos específicos

1. **Restauración de stock (tenant-scoped, edge cases):**
   `deleteServiceRecordController.ts:379-392`. Fetch previo tenant-scoped (`ServiceRecord.findOne({ _id: id, tenantId: req.tenantId })`) → 404 temprano si no existe/es de otro tenant. Loop sobre `existingRecord.productsUsed` con `Product.updateOne({ _id: item.product, tenantId: req.tenantId }, { $inc: { stock: item.quantity } })` — también tenant-scoped. `productsUsed` vacío → el `for` no itera, no rompe nada. Producto huérfano (ya no existe o no matchea tenant) → `updateOne` no matchea documentos, no lanza error, el borrado del `ServiceRecord` continúa sin bloquearse. Cumple el criterio de aceptación tal cual está redactado en `feature_list.json`.

2. **Orden de operaciones / riesgo TOCTOU:**
   Stock se restaura ANTES del `findOneAndDelete` (líneas 387-392 antes de 395). Si el loop de `$inc` falla a mitad de camino (ej. error de red en el 2do de 3 productos), el registro queda sin borrar y el stock parcialmente restaurado — riesgo real, pero es el **mismo patrón ya aceptado explícitamente por el leader como P17** en `updateServiceRecord` (ausencia de transacciones/locks, ver bitácora backend punto "Riesgo TOCTOU" y comentario `updateServiceRecord:246-253`). No introduce un escenario nuevo peor: es una restauración pura (siempre suma, sin validación de suficiencia que pudiera fallar a mitad de camino por regla de negocio), así que el blast radius es menor que en `updateServiceRecord`. Hallazgo no bloqueante, documentado, consistente con el riesgo ya aceptado en el resto del código.

3. **Restricción de rol:**
   `serviceRecordRoutes.ts:112-120` — `requireRole('ADMIN')` como primer elemento del array, antes de `param('id')` y `validateRequest`. Mismo patrón exacto que `clientRoutes.ts:78-84` (`requireRole('ADMIN')` primero, luego `param`, luego `validateRequest`). Frontend: `Historial.tsx` (`isAdmin = adminInfo?.role === 'ADMIN'`, botón renderizado condicionalmente con `{isAdmin && (...)}` — no solo deshabilitado) y `ProfileClient.tsx` (idéntico patrón `{isAdmin && (...)}`). Confirmado que en ambas vistas el botón se OCULTA, no se deshabilita, para roles no-ADMIN.

4. **Anti-IDOR:**
   El filtro `tenantId: req.tenantId` se mantiene en las tres operaciones de la función (`findOne` inicial, `updateOne` de stock, `findOneAndDelete` final). Un `_id` de otro tenant devuelve 404 en el fetch inicial, nunca llega a tocar stock ni a intentar el delete. No se rompió el aislamiento multi-tenant preexistente.

5. **No `window.confirm`/`window.alert`:**
   Ambas vistas usan `<ConfirmModal>` (`src/components/ui/ConfirmModal.tsx`, patrón P9), instanciado una vez por vista con estado local propio (`confirmDelete` en `Historial.tsx`, `confirmDeleteRecord` en `ProfileClient.tsx`). Props (`isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `isPending`) coinciden con la interfaz real del componente compartido.

6. **Invalidación de queries:**
   Confirmado en ambas mutations: `['service-records']`, `['client-history']`, `['products']`. El historial paginado de `ProfileClient.tsx` (UX-69) usa exactamente `queryKey: ['client-history', id, page, PAGE_SIZE, dateFrom, dateTo]` (`ProfileClient.tsx:51`) — el prefijo `['client-history']` invalida correctamente por partial match de TanStack Query. Coincide con lo declarado en la bitácora.

7. **HTML semántico:**
   Ambos botones nuevos son `<button type="button">` con `cursor-pointer` en su className (`Historial.tsx` botón `FiTrash2`, `ProfileClient.tsx` botón `FiTrash2`). Sin `<div onClick>`.

8. **Separación de flujos en `ProfileClient.tsx`:**
   Estado (`confirmDeleteRecord`) y mutation (`deleteServiceRecord`, alias local sin colisión con `deleteClientApi`/`deleteClient` existentes) completamente independientes del flujo preexistente de "eliminar cliente" (`isDeleteConfirmOpen`/`deleteClient`, líneas 26/65/306-312). Dos instancias separadas de `<ConfirmModal>` al final del componente, cada una con su propio `isOpen`/`onConfirm`. No hay pisada de estado entre ambos flujos.

## Verificación técnica

- `pnpm --filter @estetica/server build` → **Exit Code 0**, sin errores TS.
- `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, warning preexistente de tamaño de chunk, no relacionado con la feature).
- `pnpm --filter @estetica/client lint` → **Exit Code 0**, 4 warnings preexistentes (`ProfesionalModal.tsx:83`, `RegistroModal.tsx:128`, `Negocio.tsx:87`, `Turnos.tsx:208`, todos `react-hooks/incompatible-library` por `watch()`). Ningún warning nuevo en los archivos tocados por esta feature.
- Auditoría de variables sensibles: `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` sobre los archivos backend tocados → sin matches de hardcodeo.
- Higiene: sin `console.log`/`debugger`/`TODO` sin ticket en los archivos tocados.
- `git stash list` → vacío (no se usó stash durante esta revisión).

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — un solo `in_progress` correspondiente, bitácoras de ambos implementers en disco, sandbox respetado (backend en `apps/server/`, frontend en `apps/client/`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — no aplica paginación nueva (delete de un recurso); multi-tenancy respetado en las 3 operaciones de `deleteServiceRecord`.
- [x] C4 (Compilación Estática + Lint) — ambos builds y lint en 0, sin warnings nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete `progress/history.md` y `progress/current.md` tras este veredicto (fuera del scope del reviewer, pero evidencias en disco de implementers y reviewer ya existen).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se tocaron modelos; el uso de `Product`/`ServiceRecord` respeta `tenantId` ya declarado en los schemas existentes.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — `requireRole('ADMIN')` (SEC-A/rol), fetch/update/delete tenant-scoped (SEC-B, IDOR → 404), sin secretos hardcodeados (SEC-H).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — sin cambio de contrato de respuesta (el endpoint ya existía con el mismo shape `{ message, record }`); no aplica CHANGELOG.

## Hallazgos no bloqueantes
1. `apps/server/src/controllers/serviceRecordController.ts:387-395` — riesgo TOCTOU entre la restauración de stock (loop de `$inc`) y el `findOneAndDelete` final: si el proceso cae a mitad del loop, queda stock parcialmente restaurado y el registro sin borrar. Riesgo aceptado explícitamente por el leader, consistente con el mismo patrón ya presente en `updateServiceRecord` (P17). No requiere corrección para este veredicto.

## Cambios Requeridos
Ninguno.
