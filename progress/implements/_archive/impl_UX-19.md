# Implementación — UX-19: Eliminación rápida de producto desde el listado de inventario

**Alcance:** solo frontend (`apps/client/`). No se tocó `apps/server/` (el endpoint `DELETE /api/productos/:id` ya existía, tenant-scoped, soft-delete, rol ADMIN — confirmado en `progress/explores/explore_UX-19.md`).

## Archivos modificados

### 1. `apps/client/src/api/productApi.ts`
Se agregó al final del archivo (mismo patrón que `deleteService` en `serviceApi.ts:29-31`):

```typescript
/** DELETE /api/productos/:id — Soft delete de un producto */
export const deleteProduct = async (id: string): Promise<void> => {
    await api.delete(`/productos/${id}`);
};
```

Sin interfaz nueva (retorno `void`, sin payload). Ningún otro cambio en el archivo.

### 2. `apps/client/src/views/Inventario.tsx`
- **Imports agregados:** `useMutation`, `useQueryClient` (de `@tanstack/react-query`), `FiTrash2` (a la lista existente de `react-icons/fi`), `toast` (de `sonner`), `deleteProduct as deleteProductApi` (de `../api/productApi`, renombrado para no chocar con el `mutate` local), `handleApiError` (de `../api/errorHandler`), `ConfirmModal` (de `../components/ui/ConfirmModal`).
- **Estado nuevo:** `const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);` — mismo shape que `Servicios.tsx`.
- **Mutation nueva:**
  ```typescript
  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
      mutationFn: (id: string) => deleteProductApi(id),
      onSuccess: () => {
          toast.success('Producto eliminado');
          queryClient.invalidateQueries({ queryKey: ['products'] });
          setConfirmDelete(null);
      },
      onError: (error) => handleApiError(error, 'No se puede eliminar el producto')
  });
  ```
  Invalida la `queryKey: ['products']` (misma key que usa el `useQuery` de la vista) → refresco del listado sin recargar la página.
- **Handler:** `const handleDeleteProduct = (id: string, name: string) => { setConfirmDelete({ id, name }); };`
- **Botón en la fila de la tabla** (grupo de acciones, junto a "Ajustar Stock" y "Editar detalles"):
  ```jsx
  <button type="button" onClick={() => handleDeleteProduct(product._id, product.name)} className="p-1.5 text-gray-400 hover:text-maison-red transition-colors cursor-pointer" title="Eliminar producto"><FiTrash2 size={16} /></button>
  ```
  Usa `type="button"` explícito (regla dura de HTML semántico) y `cursor-pointer`. Color hover `maison-red` para diferenciarlo de "Editar" (`hover:text-maison-text`), consistente con `Servicios.tsx:82`.
- **`<ConfirmModal>` renderizado** al final del componente, junto a los otros modales:
  ```jsx
  <ConfirmModal
      isOpen={confirmDelete !== null}
      onClose={() => setConfirmDelete(null)}
      onConfirm={() => { if (confirmDelete) deleteProduct(confirmDelete.id); }}
      title="Eliminar producto"
      message={`¿Seguro que querés eliminar el producto "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar producto"
      isPending={isDeleting}
  />
  ```

## Decisiones técnicas

1. **`isPending` conectado al `ConfirmModal`:** a diferencia de `Servicios.tsx` (que cierra el modal de forma optimista en `onConfirm`, antes de que la mutation resuelva), acá el cierre del modal (`setConfirmDelete(null)`) se hace en el `onSuccess` de la mutation, y se le pasa `isPending={isDeleting}` al `ConfirmModal`. Esto aprovecha el prop `isPending` que el componente ya soporta (deshabilita el botón de confirmar y muestra "Procesando...") — evita doble submit y deja el modal abierto si la request falla (ej. error de red), en vez de cerrarlo prematuramente. Es una variación menor y deliberada del patrón de `Servicios.tsx`, no una violación — el componente `ConfirmModal` fue diseñado con ese prop justamente para este caso.
2. **No se tocaron los botones preexistentes** "Ajustar Stock" y "Editar detalles" (no se les agregó `type="button"` retroactivamente) para mantener el diff acotado estrictamente a esta feature, según instrucción explícita de la tarea. Sí se aplicó `type="button"` al botón nuevo, que es lo requerido por la regla dura de HTML semántico para el código que yo introduzco.
3. **Mensaje de error de la mutation:** `'No se puede eliminar el producto'` como fallback de `handleApiError` — coincide con el estilo del mensaje de `Servicios.tsx` (`'No se puede eliminar porque tiene visitas asociadas'`), pero genérico porque no se confirmó una regla de negocio equivalente ("producto con ventas asociadas") en el controller backend explorado (`deleteProduct` en `productController.ts:103-117` solo hace soft-delete condicionado a `isActive: true`, sin bloqueo por relaciones). Si el reviewer detecta un caso de negocio específico (ej. producto con movimientos de stock recientes) que amerite un mensaje más preciso, es un ajuste de una sola línea.

## Resultado de build y lint

- `pnpm --filter @estetica/client build` → **Exit Code 0**. Output: `tsc -b && vite build` compiló sin errores, `dist/` generado correctamente (warning preexistente de chunk >500kB, no relacionado con esta feature).
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, pero el único `error` reportado es el preexistente y ya documentado `ProductoModal.tsx:37 'stock' is assigned a value but never used` (fuera de alcance, explícitamente indicado no tocar en `progress/current.md` y en las instrucciones de esta tarea). Los demás son `warning`s preexistentes de `react-hooks/incompatible-library` en otros archivos (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) no relacionados con esta feature. **Ningún archivo modificado en esta tarea (`productApi.ts`, `Inventario.tsx`) introduce errores ni warnings nuevos** — confirmado leyendo el output completo del lint, no aparece ninguna línea de `Inventario.tsx` ni `productApi.ts` en el listado de problemas.

## Criterios de aceptación — verificación

1. ✅ Cada fila de la tabla de productos en `Inventario.tsx` tiene un botón con ícono `FiTrash2` en el grupo de acciones.
2. ✅ Al confirmar en el `ConfirmModal` (no `window.confirm`), se dispara `deleteProduct(confirmDelete.id)` → `DELETE /api/productos/:id` → backend hace `isActive: false` (soft delete, ya verificado en el digest de exploración).
3. ✅ `onSuccess` invalida `queryClient.invalidateQueries({ queryKey: ['products'] })`, la misma key que usa el `useQuery` de la vista → refetch automático sin recargar la página del navegador.

## Hallazgos / notas para el reviewer

- No se requirió ningún cambio en `apps/server/`. Confirmar en la revisión que el endpoint sigue devolviendo 404 (no 403) en escenarios cross-tenant, según lo ya auditado en el digest de exploración — no verificado nuevamente acá porque está fuera del sandbox de este implementer.
- La deuda de lint `ProductoModal.tsx:37` sigue intacta, no se tocó, tal como se indicó explícitamente.
- Diff acotado a 2 archivos: `apps/client/src/api/productApi.ts` (+5 líneas) y `apps/client/src/views/Inventario.tsx` (imports + estado + mutation + handler + botón + modal).
