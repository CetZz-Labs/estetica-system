# Reporte de Revisión Técnica — Feature UX-19

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-07

## Alcance auditado

Diff real (`git diff --stat`) confirmado idéntico a lo declarado en `progress/implements/impl_UX-19.md`:

```
apps/client/src/api/productApi.ts    |  5 +++++
apps/client/src/views/Inventario.tsx | 32 +++++++++++++++++++++++++++++---
feature_list.json                    |  2 +-  (status pending -> in_progress, cambio del leader, no del implementer)
```

Sin cambios en `apps/server/` (`git diff --stat -- apps/server/` vacío). El endpoint `DELETE /api/productos/:id` preexistente fue inspeccionado directamente en `apps/server/src/controllers/productController.ts:103-117` y `apps/server/src/routes/productRoutes.ts:50-54`: usa `findOneAndUpdate({ _id: id, tenantId: req.tenantId, isActive: true }, { $set: { isActive: false } })`, responde 404 si no matchea (cross-tenant → 404, nunca 403, cumple SEC-B) y está protegido por `checkAdminAccess` + `checkTenantAccess` + `requireRole('ADMIN')` + `param('id').isMongoId()` + `validateRequest`. Confirmado, no había gap de backend.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** única feature `in_progress` en `feature_list.json` era UX-19. Diff acotado a 2 archivos de `apps/client/` + el propio status flag. `progress/implements/impl_UX-19.md` y `progress/explores/explore_UX-19.md` presentes en disco.
- [x] **C3 (Fidelidad Arquitectónica):**
  - Frontend: no hay llamadas HTTP directas en el componente — `deleteProduct` vive en `productApi.ts` y se consume via `useMutation` en la vista, patrón idéntico a `serviceApi.ts:29-31`/`Servicios.tsx`.
  - HTML semántico: `<button type="button" onClick={...} className="... cursor-pointer">` (`Inventario.tsx:171`) — cumple `.claude/rules/frontend.md` §3 (acción → button, `type="button"` explícito, `cursor-pointer` presente).
  - Confirmación: usa el componente compartido `ConfirmModal` (`apps/client/src/components/ui/ConfirmModal.tsx`), no `window.confirm`. Verificado con `grep` — cero ocurrencias de `window.confirm`/`alert(` en el diff.
  - Notificaciones: `toast.success('Producto eliminado')` en éxito, `handleApiError(error, 'No se puede eliminar el producto')` en error — vía sonner, sin duplicar en un `<div>` de alerta inline.
  - Refresco sin recargar: `queryClient.invalidateQueries({ queryKey: ['products'] })` en `onSuccess`, misma `queryKey` que el `useQuery` de la vista (`Inventario.tsx:26`) → refetch automático.
  - No hay paginación involucrada en este cambio (no se tocó el listado de `getProducts`, fuera de alcance de esta feature — deuda preexistente, no introducida ni agravada acá).
- [x] **C4 (Compilación Estática + Lint):** ejecutado por este auditor, no solo tomado del reporte del implementer.
  - `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, `dist/` generado, único warning preexistente de chunk >500kB no relacionado).
  - `pnpm --filter @estetica/client lint` → Exit Code 1, pero el único **error** es el preexistente y ya documentado `ProductoModal.tsx:37 'stock' is assigned a value but never used` (fuera de alcance, no tocado). Los 4 `warning`s restantes (`ProfesionalModal.tsx:83`, `RegistroModal.tsx:110`, `Negocio.tsx:73`, `Turnos.tsx:350`, todos `react-hooks/incompatible-library`) son preexistentes y no relacionados. **Confirmado: ni `Inventario.tsx` ni `productApi.ts` aparecen en el output del lint** — cero errores/warnings nuevos introducidos por esta feature.
- [x] **C5 (Cierre de Sesión Append-Only):** no aplica en su totalidad a este reviewer (la entrada en `progress/history.md` y la limpieza de `progress/current.md` son responsabilidad del leader al cerrar sesión), pero las evidencias mínimas exigibles a esta auditoría están en disco: `progress/implements/impl_UX-19.md` y este mismo `progress/reviews/review_UX-19.md`.
- [x] **C6 (Capa de Datos):** no aplica — no se tocó ningún modelo Mongoose (feature 100% frontend, confirmado por ausencia de diff en `apps/server/src/models/`).
- [x] **C7 (Security Gate):** SEC-A/B/C/D/E ya satisfechos por el endpoint preexistente (auditado arriba, sin cambios). SEC-G (`dangerouslySetInnerHTML`): ausente en el diff. SEC-H: no aplica (sin archivos de backend tocados en esta feature). Multi-tenancy en el cliente: confirmado que `deleteProduct(id)` (`productApi.ts`) solo envía el `id` por URL param, sin `tenantId` en body/query — correcto, el aislamiento es 100% responsabilidad del backend vía JWT de Clerk.
- [x] **C8 (Estabilidad de API):** no aplica — no hay cambio de contrato (mismo endpoint preexistente, mismo formato de respuesta `{ message }`), no requiere entrada en `CHANGELOG.md`.

## Criterios de aceptación (`feature_list.json`, id "UX-19") — verificación

1. "Cada fila del listado de productos tiene un botón con ícono de eliminación" → ✅ `Inventario.tsx:171`, `FiTrash2` en el grupo de acciones de cada fila.
2. "Al confirmar (modal de confirmación, no window.confirm), el producto queda con isActive:false" → ✅ `ConfirmModal` (`Inventario.tsx:186-194`) dispara `deleteProduct(confirmDelete.id)` → `DELETE /api/productos/:id` → controller confirmado hace `$set: { isActive: false }`.
3. "El listado se actualiza sin recargar la página" → ✅ `queryClient.invalidateQueries({ queryKey: ['products'] })` en `onSuccess`.

## Observaciones menores (no bloqueantes)

- El botón nuevo usa `title="Eliminar producto"` (mejora sobre el patrón de `Servicios.tsx:82`, que no tiene `title`) — no es una violación, es una mejora de accesibilidad menor, consistente con el botón "Editar detalles" ya existente en la misma fila (`Inventario.tsx:170`).
- Decisión documentada del implementer de conectar `isPending` al `ConfirmModal` (a diferencia del cierre optimista de `Servicios.tsx`) es una variación menor razonable dentro del contrato ya soportado por el componente compartido — no introduce inconsistencia de UX perceptible ni viola ningún patrón documentado.
- No se retrofitteó `type="button"` a los botones preexistentes "Ajustar Stock"/"Editar detalles" de la misma fila — deuda preexistente, correctamente fuera de alcance según la instrucción de mantener el diff acotado a esta feature.

## Cambios Requeridos

Ninguno.
