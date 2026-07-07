# Reporte de Exploración — UX-19: Eliminación rápida de producto en Inventario

**Pregunta:** ¿Cómo se implementa "eliminación rápida de producto desde el listado" respetando patrones existentes, y el backend ya soporta el soft-delete?
**Contexto:** UX-19 (`feature_list.json`, in_progress) — botón de eliminación por fila en Inventario, modal de confirmación (no `window.confirm`), soft delete `isActive:false`, refresh sin recargar.
**Timestamp:** 2026-07-07

## Hallazgos

### 1. Vista de Inventario (`apps/client/src/views/Inventario.tsx`)
- Tabla de productos en `Inventario.tsx:112-163`. Columna "Acciones" ya existe en `Inventario.tsx:118` (`th` con `text-right`).
- Cada fila (`Inventario.tsx:140-158`) ya tiene dos botones de acción en un `div.flex.justify-end.gap-2` (`Inventario.tsx:152-155`): "Ajustar Stock" (`FiActivity`, `Inventario.tsx:153`) y "Editar detalles" (`FiEdit2`, `Inventario.tsx:154`). El botón de eliminar debe sumarse a este mismo grupo.
- State management: usa `useState` simple (`selectedProduct`, `isProductModalOpen`, etc. — `Inventario.tsx:13-18`), sin `useMutation` propio todavía (`getProducts` vía `useQuery`, `Inventario.tsx:20-23`). Faltaría: importar `useMutation`, `useQueryClient`, `toast`, `FiTrash2`, `handleApiError`, `ConfirmModal`, y agregar estado `confirmDelete`.
- `ProductoModal.tsx` (componente separado, no la vista) fue revisado: no tiene relación directa con el borrado — es el modal de crear/editar. Deuda de lint preexistente y ya documentada en `progress/current.md:53`: `ProductoModal.tsx:37` — variable `stock` destructurada y no usada (`const { stock, ...updateData } = data;`). No aplica a esta feature, no tocar salvo que el reviewer lo pida explícitamente.

### 2. Capa de API (`apps/client/src/api/productApi.ts`)
- **No existe** `deleteProduct` en `productApi.ts` (confirmado, archivo completo leído: solo `getProducts`, `createProduct`, `updateProduct`, `adjustStock`, `createBulkProducts` — `productApi.ts:29-60`).
- Patrón de referencia exacto a copiar: `apps/client/src/api/serviceApi.ts:29-31`:
  ```typescript
  /** DELETE /api/servicios/:id — Soft delete de un servicio */
  export const deleteService = async (id: string): Promise<void> => {
      await api.delete(`/servicios/${id}`);
  };
  ```
  Para productos sería idéntico pero apuntando a `/productos/${id}`.

### 3. Modal de confirmación
- **Ya existe** un componente reutilizable: `apps/client/src/components/ui/ConfirmModal.tsx` (55 líneas completas). Envuelve el `<Modal>` compartido, recibe `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel?`, `isPending?`. Usa `FiAlertTriangle` (trifecta: icono rojo + color `maison-red` + texto). **No hay que crear nada nuevo** — solo importarlo y usarlo.
- Ya está en uso en `apps/client/src/views/Servicios.tsx:103-110` para el borrado de servicios — es el ejemplo de referencia directo y más reciente (mismo dominio: catálogo de negocio con soft delete).

### 4. Backend — endpoint YA EXISTE, no requiere tocar `apps/server/`
- Ruta: `DELETE /api/productos/:id` — `apps/server/src/routes/productRoutes.ts:50-54`:
  ```typescript
  router.delete('/:id', [
      requireRole('ADMIN'),
      param('id').isMongoId().withMessage('ID inválido'),
      validateRequest
  ], deleteProduct);
  ```
  Middlewares previos aplicados a todo el router: `checkAdminAccess` (`productRoutes.ts:16`) + `checkTenantAccess` (`productRoutes.ts:17`).
- Controller: `apps/server/src/controllers/productController.ts:103-117` (`deleteProduct`). Hace `findOneAndUpdate({ _id: id, tenantId: req.tenantId, isActive: true }, { $set: { isActive: false } })`. 404 si no encuentra, 200 `{ message: 'Producto eliminado' }` si éxito. Ya tenant-scoped y ya soft-delete — coincide 100% con el criterio de aceptación #2.
- **Conclusión de alcance: la feature es 100% frontend.** No requiere ningún cambio en `apps/server/`.

### 5. Convenciones (`docs/patterns-frontend.md`, `.claude/rules/frontend.md`)
- P1 (función de API): tipado de retorno explícito, co-ubicar interfaces de formulario — no aplica interfaz nueva aquí (es un `void`).
- P2 (useMutation en la vista): invalidar `queryKey: ['products']` en `onSuccess`, `toast.success(...)`, `onError: handleApiError(error, '...')`.
- HTML semántico: botón de icono debe ser `<button type="button">` con `cursor-pointer` (regla `.claude/rules/frontend.md` §3). El patrón de `Servicios.tsx:82` usa exactamente esto: `<button onClick={...} className="p-2 text-gray-400 hover:text-maison-red transition-colors cursor-pointer"><FiTrash2 size={16} /></button>`.
- Icono: `FiTrash2` de `react-icons/fi` (ya usado en `Servicios.tsx:3,82`), color hover `hover:text-maison-red` para diferenciarlo de "Editar" (`hover:text-maison-primary`/`hover:text-maison-text`).
- Confirmación: al usar `ConfirmModal`, la Trifecta de accesibilidad (color rojo + `FiAlertTriangle` + texto) ya viene resuelta por el componente — no hay que reimplementarla.

### 6. Multi-tenancy
- El endpoint `DELETE /api/productos/:id` ya está protegido por `checkAdminAccess` + `checkTenantAccess` + filtro `{ _id, tenantId, isActive: true }` en el controller (`productController.ts:107`). El implementer de frontend **no necesita ni debe tocar nada de tenant** — es transparente desde el cliente (el JWT de Clerk ya viaja en el interceptor de `src/libs/axios.ts`).

## Diagnóstico
El backend ya expone el endpoint de soft-delete completo, tenant-scoped y con rol `ADMIN` (`productRoutes.ts:50-54` + `productController.ts:103-117`) — no hay deuda ni gap ahí. El único gap real es en el frontend: falta la función `deleteProduct` en `productApi.ts` y el wiring en `Inventario.tsx` (botón + estado + `useMutation` + `ConfirmModal`). Existe un precedente casi idéntico y muy reciente en `Servicios.tsx`/`serviceApi.ts` (borrado de servicios) que puede copiarse punto por punto, incluyendo el uso del `ConfirmModal` ya existente — no hace falta crear ningún componente de confirmación nuevo.

## Recomendación de implementación
**Alcance: solo frontend** (`apps/client/`, ningún cambio en `apps/server/`).

Archivos a tocar:
1. `apps/client/src/api/productApi.ts` — agregar `export const deleteProduct = async (id: string): Promise<void> => { await api.delete(\`/productos/${id}\`); };` (mismo patrón que `serviceApi.ts:29-31`).
2. `apps/client/src/views/Inventario.tsx` — importar `FiTrash2`, `useMutation`, `useQueryClient`, `toast` (de `sonner`), `handleApiError` (de `../api/errorHandler`), `ConfirmModal` (de `../components/ui/ConfirmModal`) y `deleteProduct`; agregar estado `confirmDelete` (`{ id: string; name: string } | null`), la mutation de borrado (invalida `['products']`, `toast.success`, `onError: handleApiError`), el botón `FiTrash2` en el grupo de acciones de la fila (junto a `Inventario.tsx:153-154`) y renderizar `<ConfirmModal>` al final del componente (junto a los otros modales, `Inventario.tsx:166-168`), replicando exactamente `Servicios.tsx:17,24-37,82,103-110`.

No se requiere `explore` adicional ni intervención de backend. `ProductoModal.tsx:37` (deuda de lint `'stock' unused`) queda fuera de alcance — ya documentada en `progress/current.md:53`.
