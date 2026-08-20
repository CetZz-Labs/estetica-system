# impl_UX-72-frontend.md

## Feature
UX-72 — Eliminar un registro del historial de visitas (con restauración de stock). Alcance de este archivo: solo frontend (`apps/client`).

## Resumen de cambios

1. **`apps/client/src/api/serviceRecordApi.ts`**
   - Nueva función `deleteServiceRecord(id: string): Promise<void>` — `DELETE /registros/:id`, mismo estilo que `deleteProduct`/`deleteClient` (P1 del catálogo).

2. **`apps/client/src/views/Historial.tsx`**
   - Query `['admin-me']` (`getMe()`) para resolver `adminInfo.role`; `isAdmin = adminInfo?.role === 'ADMIN'`.
   - `useMutation` `deleteRecord` → `deleteServiceRecordApi`; `onSuccess`: `toast.success`, invalida `['service-records']`, `['client-history']` y `['products']`, cierra el modal; `onError`: `handleApiError`.
   - Estado `confirmDelete: { id, label } | null` (label = `"<servicio> — <cliente>"` para el mensaje de confirmación).
   - Nueva columna de acciones: botón `FiTrash2` (`<button type="button">`, `aria-label`/`title="Eliminar visita"`, `cursor-pointer`) agregado junto al botón de editar existente, **renderizado condicionalmente solo si `isAdmin`** (no solo deshabilitado).
   - `<ConfirmModal>` (componente compartido, patrón P9) al final del componente, con `isPending={isDeleting}`.

3. **`apps/client/src/views/ProfileClient.tsx`**
   - Misma query `['admin-me']` (TanStack Query dedupea con la de `AppLayout.tsx`/`ProtectedRoute`) y flag `isAdmin`.
   - `useMutation` `deleteServiceRecord` (alias local, no colisiona con `deleteClient` existente) → `deleteServiceRecordApi`; mismas invalidaciones (`service-records`, `client-history`, `products`) + `toast.success`/`handleApiError`.
   - Estado independiente `confirmDeleteRecord: { id, label } | null` (label = `"<servicio> — <fecha>"`), separado del `isDeleteConfirmOpen` que ya existía para borrar el cliente completo — evita colisión de estados entre "eliminar cliente" y "eliminar una visita puntual".
   - Botón `FiTrash2` agregado dentro de cada card del timeline de historial (junto a los badges de estado de retoque), envuelto en un `<div className="flex items-center gap-2 shrink-0">` para no romper el layout `flex justify-between` existente. Visible solo si `isAdmin`.
   - Segundo `<ConfirmModal>` al final del componente (independiente del de "Eliminar cliente"), con `isPending={isDeletingRecord}`.

## Decisiones técnicas

- No se creó ningún componente nuevo: se reutilizó `src/components/ui/ConfirmModal.tsx` tal cual (patrón P9 del catálogo), instanciándolo una vez por vista con estado local propio.
- En `ProfileClient.tsx` se usó un estado (`confirmDeleteRecord`) y una mutation (`deleteServiceRecord`) separados de los ya existentes para el borrado del cliente (`isDeleteConfirmOpen`/`deleteClient`) para no mezclar dos flujos de confirmación distintos sobre el mismo `<ConfirmModal>` compartido.
- El guard de rol replica exactamente el patrón ya usado en `AppLayout.tsx` (P7 del catálogo): `useQuery<AdminInfo>({ queryKey: ['admin-me'], queryFn: getMe })`, sin wrapper en `hooks/`.
- El botón de eliminar se oculta completamente (no solo `disabled`) para roles distintos de `ADMIN`, según el criterio de aceptación.

## Resultado de build/lint

- `pnpm --filter @estetica/client build` → exit code 0 (`tsc -b && vite build` compiló sin errores).
- `pnpm --filter @estetica/client lint` → exit code 0, 4 warnings preexistentes (`ProfesionalModal.tsx:83`, `RegistroModal.tsx:128`, `Negocio.tsx:87`, `Turnos.tsx:208`, todos `react-hooks/incompatible-library` por `watch()` de react-hook-form). Ningún warning nuevo introducido; ninguno en los 3 archivos tocados por esta feature.

## Archivos modificados
- `apps/client/src/api/serviceRecordApi.ts`
- `apps/client/src/views/Historial.tsx`
- `apps/client/src/views/ProfileClient.tsx`

## Nota de contrato con backend
Esta implementación consume `DELETE /api/registros/:id` según el contrato descrito por el leader (200 con `{ message, record }`, 404 si no existe, restringido a `ADMIN`). No se verificó contra el backend real porque otro agente lo está implementando en paralelo — el frontend no depende del cuerpo de la respuesta (usa `Promise<void>`), solo del código de estado (2xx éxito / error vía `handleApiError`).
