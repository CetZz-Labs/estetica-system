# impl_UX-CONFIRM — Card clickeable + ConfirmModal

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `apps/client/src/components/ui/ConfirmModal.tsx` | Creado — componente reutilizable de confirmacion |
| `apps/client/src/views/Clients.tsx` | Modificado — card clickeable con FiChevronRight |
| `apps/client/src/views/ProfileClient.tsx` | Modificado — window.confirm reemplazado por ConfirmModal |
| `apps/client/src/views/Dashboard.tsx` | Modificado — window.confirm reemplazado por ConfirmModal |
| `apps/client/src/views/Servicios.tsx` | Modificado — window.confirm reemplazado por ConfirmModal |

## Resumen de cambios

### TAREA 1 — Clients.tsx
- Reemplazado FiUser por FiChevronRight en el import.
- El `<li>` ya no lleva `p-4` ni el `<div>` intermedio. Todo el contenido envuelto en `<Link to="/clientes/:id">` con `p-4 w-full`.
- El boton "Ver Perfil" sustituido por `<FiChevronRight>` con transicion de color en hover.

### TAREA 2 — ConfirmModal.tsx
- Componente nuevo en `apps/client/src/components/ui/ConfirmModal.tsx`.
- Props: isOpen, onClose, onConfirm, title, message, confirmLabel (default "Confirmar"), isPending (default false).
- Usa el `<Modal>` compartido con `maxWidth="max-w-sm"` e icono `FiAlertTriangle` en rojo.
- Boton de confirmacion usa `bg-maison-red` con estado disabled cuando `isPending`.

### TAREA 3 — Reemplazo de window.confirm

**ProfileClient.tsx**
- Estado `isDeleteConfirmOpen: boolean` agregado.
- `handleDelete` ahora solo llama `setIsDeleteConfirmOpen(true)`.
- `<ConfirmModal>` montado despues de `<ClienteModal>`.

**Dashboard.tsx**
- Estado `confirmCancelId: string | null` agregado.
- `handleCancelTouchup` ahora solo llama `setConfirmCancelId(recordId)` (mantiene `e.stopPropagation()`).
- `<ConfirmModal>` montado al final del JSX, antes del cierre del div raiz.

**Servicios.tsx**
- Estado `confirmDelete: { id: string; name: string } | null` agregado.
- `handleDelete` ahora solo llama `setConfirmDelete({ id, name })`.
- `<ConfirmModal>` montado despues de `<ServicioModal>`.
- El mensaje interpola el nombre del servicio desde `confirmDelete?.name`.

## Verificacion

- `window.confirm`: 0 ocurrencias en `apps/client/src/`.
- Build: `pnpm --filter @estetica/client build` → Exit code 0 (865ms, 693 modulos).
