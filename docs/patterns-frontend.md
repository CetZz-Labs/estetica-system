# Catálogo de Patrones de Implementación — Frontend (Maison CRM Web)

> **Qué es esto:** templates copy-paste extraídos de código ya auditado. Antes de crear una función de API, un consumo con TanStack Query, una tabla paginada, un modal o manejar estados async, **copiá el patrón de aquí**.
>
> **Stack:** React 19 + TypeScript + Vite 8 + Tailwind v4 + TanStack Query 5 + react-router 7 + Clerk React 6 + react-hook-form 7 + sonner 2 + react-icons (Feather). Sandbox: `apps/client/`.
>
> **Convención de capa de datos de Maison (importante):** este proyecto **no usa** una carpeta `src/hooks/` con wrappers. El patrón canónico es: **capa `src/api/` (funciones async sobre la instancia Axios central) + `useQuery`/`useMutation` consumidos directamente en las vistas**. No introducir la estructura `hooks/<dominio>/` de otros proyectos.
>
> **Fuente canónica de las reglas:** [`governance-rules.md`](governance-rules.md) (GOV-ACCESS, GOV-CLIENT) + `docs/design.md` (sistema de diseño). Este archivo da el **cómo**.

**Índice:**
- [P1 — Función de API](#p1--función-de-api)
- [P2 — useQuery / useMutation en la vista](#p2--usequery--usemutation-en-la-vista)
- [P3 — Consumo de listado paginado](#p3--consumo-de-listado-paginado)
- [P4 — Cuatro estados async + Trifecta WCAG](#p4--cuatro-estados-async--trifecta-wcag)
- [P5 — Modal con react-hook-form](#p5--modal-con-react-hook-form)
- [P6 — Tabla reutilizable + paginación](#p6--tabla-reutilizable--paginación)

---

## P1 — Función de API

> **Regla canónica:** [`governance-rules.md#gov-client`](governance-rules.md#gov-client--seguridad-de-frontend-clerk--sanitización). Toda petición HTTP pasa por la instancia central `src/libs/axios.ts` (interceptor JWT de Clerk). Prohibido instanciar Axios ad-hoc o llamar `fetch` crudo en componentes.

**Mandato:** cada recurso tiene su archivo `src/api/<recurso>Api.ts`. Las interfaces de formulario se **co-ubican** aquí. Tipado de retorno explícito siempre.

```typescript
// api/clientApi.ts
import api from '../libs/axios';
import type { Client, Paginated } from '../types';

// Interfaces de formulario co-ubicadas con su recurso
export interface ClientFormData {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
}

export const getClients = async (params: { page: number; limit: number; search?: string }): Promise<Paginated<Client>> => {
    const { data } = await api.get('/clientes', { params });
    return data;
};

export const createClient = async (payload: ClientFormData): Promise<Client> => {
    const { data } = await api.post('/clientes', payload);
    return data;
};

export const updateClient = async (id: string, payload: ClientFormData): Promise<Client> => {
    const { data } = await api.put(`/clientes/${id}`, payload);
    return data;
};

export const deleteClient = async (id: string): Promise<void> => {
    await api.delete(`/clientes/${id}`);
};
```

---

## P2 — useQuery / useMutation en la vista

> **Regla canónica:** [`governance-rules.md#gov-access`](governance-rules.md#gov-access--trifecta-de-accesibilidad-visual) (errores) + `docs/design.md` (sonner). Los hooks de TanStack Query se consumen **directamente en la vista** (no hay wrappers en `hooks/`).

**Mandato:** todo `useQuery<T>` lleva genérico explícito. Las mutaciones invalidan queries en `onSuccess`, muestran `toast.success` y manejan error con `handleApiError`.

```typescript
// Dentro de una vista
const queryClient = useQueryClient();

const { data, isLoading, isError } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: getClients,
});

const { mutate: create, isPending } = useMutation({
    mutationFn: (payload: ClientFormData) => createClient(payload),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success('Cliente creado correctamente');
        onClose();
    },
    onError: (error) => handleApiError(error, 'Error al crear cliente'),
});
```

`handleApiError(error, fallback)` vive en `src/api/errorHandler.ts`. Nunca `alert()` ni `console.error()` expuesto al usuario.

---

## P3 — Consumo de listado paginado

> **Gate de rechazo:** el `reviewer` rechaza cualquier tabla de negocio que **descargue la colección completa** y la filtre/busque/pagine en el navegador con `useMemo`. La paginación, el filtrado y la búsqueda se **delegan al servidor** (ver `patterns-backend.md` § P1). Page-size estándar: **7**.

**Mandato:**
- `queryKey` incluye `page`, `limit` y **todos** los filtros activos (`search` debounced, etc.), para cachear/invalidar por combinación.
- `placeholderData: keepPreviousData` para que la tabla no parpadee al cambiar de página.
- Cambiar cualquier filtro o término **resetea `page` a 1**. Debounce de búsqueda 300ms.
- El total se lee de `meta.total`, **nunca** de `data.length`.

```typescript
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getClients } from '../api/clientApi';
import type { Paginated, Client } from '../types';

const PAGE_SIZE = 7; // debe coincidir con el page-size del backend

export default function Clients() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    const { data, isLoading, isError } = useQuery<Paginated<Client>>({
        queryKey: ['clients', { page, limit: PAGE_SIZE, search: debouncedSearch }],
        queryFn: () => getClients({ page, limit: PAGE_SIZE, search: debouncedSearch }),
        placeholderData: keepPreviousData,
    });

    const items = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    // Reset de página al cambiar la búsqueda
    const onSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    // ... render con <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
}
```

**Excepción:** rankings/top-N que no son tablas navegables reciben un array plano ya capado por el backend (≤ 7) y se renderizan **sin** `<Pagination>`.

---

## P4 — Cuatro estados async + Trifecta WCAG

> **Regla canónica:** [`governance-rules.md#gov-access`](governance-rules.md#gov-access--trifecta-de-accesibilidad-visual). Todo estado crítico = **Color + Icono (`react-icons/fi`) + Texto**. Ver `docs/design.md` §6.

**Mandato:** toda vista que consume datos cubre los **4 estados** en este orden: loading → error → empty → data.

```typescript
import { FiAlertCircle, FiUsers } from 'react-icons/fi';

// 1. Loading — skeleton con animate-pulse
if (isLoading) {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-maison-card" />
            ))}
        </div>
    );
}

// 2. Error — Trifecta: color + icono + texto (+ toast vía onError de la mutation/query)
if (isError) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            <FiAlertCircle aria-hidden className="shrink-0" />
            <span>No se pudieron cargar los clientes. Reintentá en unos segundos.</span>
        </div>
    );
}

// 3. Empty — mensaje claro
if (!items.length) {
    return (
        <div className="flex flex-col items-center gap-2 py-12 text-maison-text/60">
            <FiUsers aria-hidden size={32} />
            <p>Aún no tenés clientes registrados.</p>
        </div>
    );
}

// 4. Data
return <ClientsTable items={items} />;
```

---

## P5 — Modal con react-hook-form

> **Regla canónica:** `docs/design.md` §4 (componente `<Modal>` compartido). `.claude/rules/frontend.md` §3 (modales).

**Mandato:** usar el `<Modal>` compartido de `src/components/ui/Modal.tsx`. `useForm<FormDataType>()` con `reset()` en `useEffect` cuando `isOpen` cambia. El `footer` se define como variable JSX inline (no componente separado). Los errores de validación se muestran inline por campo (no toast).

```typescript
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../components/ui/Modal';
import type { ClientFormData } from '../api/clientApi';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialData?: ClientFormData;
}

export default function ClienteModal({ isOpen, onClose, initialData }: Props) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientFormData>();

    useEffect(() => {
        if (isOpen) reset(initialData ?? { firstName: '', lastName: '' });
    }, [isOpen, initialData, reset]);

    const onSubmit = (data: ClientFormData) => { /* mutate */ };

    const footer = (
        <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="cursor-pointer ...">Cancelar</button>
            <button type="submit" form="cliente-form" className="cursor-pointer ...">Guardar</button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo cliente" footer={footer}>
            <form id="cliente-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="firstName">Nombre</label>
                    <input id="firstName" {...register('firstName', { required: 'El nombre es obligatorio' })} />
                    {errors.firstName && (
                        <span className="text-sm text-red-600">{errors.firstName.message}</span>
                    )}
                </div>
                {/* ... resto de campos */}
            </form>
        </Modal>
    );
}
```

---

## P6 — Tabla reutilizable + paginación

> **Regla canónica:** `.claude/rules/frontend.md` (HTML semántico, cursor-pointer, gates Refactoring-UI). Los controles de paginación se consumen desde un componente compartido — prohibido reimplementarlos por pantalla.

**Mandato:**
- Controles de paginación: botones nativos `<button>` con `cursor-pointer`, `aria-current="page"` en la página activa, y rango "Mostrando X–Y de N" con `aria-live`.
- HTML semántico: una acción es `<button type="button">`, una navegación es `<Link>`. Prohibido `<div onClick>`.
- Padding mínimo de cards/celdas de datos: `p-6` (rango `p-6`–`p-8` en alta densidad). Nunca por debajo de `p-4`.

```typescript
interface PaginationProps {
    page: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
}

export default function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
    const totalPages = Math.ceil(total / pageSize);
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <nav className="flex items-center justify-between p-6" aria-label="Paginación">
            <span aria-live="polite" className="text-sm text-maison-text/70">
                Mostrando {from}–{to} de {total}
            </span>
            <div className="flex gap-1">
                <button
                    type="button"
                    className="cursor-pointer disabled:cursor-not-allowed ..."
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                >
                    Anterior
                </button>
                <button
                    type="button"
                    className="cursor-pointer disabled:cursor-not-allowed ..."
                    disabled={page >= totalPages}
                    onClick={() => onChange(page + 1)}
                >
                    Siguiente
                </button>
            </div>
        </nav>
    );
}
```

---

## P7 — Control de acceso por rol (ProtectedRoute + sidebar dinámico)

> **Regla canónica:** SRS §6.2 (tabla de permisos). Implementado en EP-12.

**Mandato:** el rol del usuario autenticado se obtiene de `GET /api/admin` (cacheado con `queryKey: ['admin-me']`, `staleTime: 5min`). La misma query se usa en `AppLayout` (para el sidebar) y en `ProtectedRoute` (para los guards de ruta) — TanStack Query deduplica la request.

```typescript
// api/adminApi.ts
import api from '../libs/axios';
import type { AdminInfo } from '../types';

export const getMe = async (): Promise<AdminInfo> => {
    const { data } = await api.get('/admin');
    return data;
};

// types/index.ts
export type AdminRole = 'ADMIN' | 'PROFESSIONAL' | 'RECEPTIONIST';
export interface AdminInfo {
    _id: string;
    email: string;
    role: AdminRole;
    tenantId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// router.tsx — ProtectedRoute (toast en useEffect, no en render)
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { toast } from 'sonner';
import { getMe } from './api/adminApi';
import type { AdminInfo, AdminRole } from './types';

interface Props {
    roles: AdminRole[];
    children: ReactNode;
}

function ProtectedRoute({ roles, children }: Props) {
    const { data: adminInfo, isLoading } = useQuery<AdminInfo>({
        queryKey: ['admin-me'],
        queryFn: getMe,
    });

    const isDenied = !isLoading && (!adminInfo || !roles.includes(adminInfo.role));

    useEffect(() => {
        if (isDenied) {
            toast.error('No tienes permisos para acceder a esta sección.');
        }
    }, [isDenied]);

    if (isLoading) return null;
    if (isDenied) return <Navigate to="/dashboard" replace />;

    return <>{children}</>;
}

// layouts/AppLayout.tsx — sidebar condicional (fallback 'ADMIN' para evitar flash)
const { data: adminInfo } = useQuery<AdminInfo>({
    queryKey: ['admin-me'],
    queryFn: getMe,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
});
const role: AdminRole = adminInfo?.role ?? 'ADMIN';

// En JSX del sidebar:
{role !== 'RECEPTIONIST' && <NavLink to="/inventario">Inventario</NavLink>}
{role === 'ADMIN' && <NavLink to="/profesionales">Profesionales</NavLink>}
{role === 'ADMIN' && <NavLink to="/configuracion/negocio">Configuración</NavLink>}
```

**Gotcha — toast en render:** nunca llamar `toast.error()` directamente en el cuerpo del componente (side effect en render, doble disparo en StrictMode). Delegarlo a `useEffect([isDenied])` como en el patrón de arriba.

---

## P8 — Validar solo el campo que cambió al editar un registro con valor "vencido"

> **Origen:** UX-12 (2026-07-06) — bug real detectado en review. Aplica a cualquier formulario de edición donde un campo tiene una regla de validación que depende del momento actual (`Date.now()`, "no puede ser pasado", "no puede estar vencido") y el registro editado puede legítimamente tener ya ese valor vencido (ej. reprogramar no, pero sí editar notas/otros campos de un turno atrasado).

**Problema:** si la regla "no puede ser pasado" se aplica tanto en el `validate` de react-hook-form como al construir el payload del `PUT`, es fácil resolver la validación del formulario (permitir el submit cuando el valor no cambió) y olvidar que el payload igual reenvía el campo vencido — el backend, que sí valida siempre, lo rechaza con 400 y reintroduce el bloqueo que la validación de UI pretendía evitar.

**Mandato:** guardar el valor original en un `useRef` al abrir el modal de edición, comparar por igualdad exacta de string tanto en el `validate` de react-hook-form como al construir el payload — si no cambió, **omitir el campo del payload** en vez de solo permitir el submit.

```typescript
const originalStartTimeRef = useRef<string>('');

// Al abrir edición: originalStartTimeRef.current = valorActualDelCampo;
// Al abrir creación: originalStartTimeRef.current = '';

// register(...):
validate: (value) =>
    (originalStartTimeRef.current && value === originalStartTimeRef.current) ||
    new Date(value) >= new Date() ||
    'La fecha y hora no pueden ser anteriores al momento actual',

// onSubmit — la parte que se suele olvidar:
const unchanged = editing && originalStartTimeRef.current !== '' && data.field === originalStartTimeRef.current;
const payload = {
    ...otherFields,
    ...(unchanged ? {} : { field: data.field }),
};
```

**Gotcha:** la comparación es por igualdad de string exacta — el string capturado en el ref y el valor del input deben construirse con la misma función de formateo (mismo padding, mismo formato `YYYY-MM-DDTHH:mm`), si no la comparación nunca es `true` y el bug persiste.

---

## P9 — Eliminación rápida de fila con `ConfirmModal`

> **Origen:** `Servicios.tsx` (borrado de servicio) + UX-19 (2026-07-07, borrado de producto en Inventario). Aplica a cualquier acción destructiva de catálogo (fila de tabla o card) que deba pedir confirmación sin usar `window.confirm`.

Reutilizar `src/components/ui/ConfirmModal.tsx` (ya existente, no crear uno nuevo por feature) + `useMutation` + estado local con el registro a borrar:

```typescript
const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

const { mutate: deleteItem, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteItemApi(id),
    onSuccess: () => {
        toast.success('Elemento eliminado');
        queryClient.invalidateQueries({ queryKey: ['items'] });
        setConfirmDelete(null);
    },
    onError: (error) => handleApiError(error, 'No se puede eliminar el elemento'),
});

// Botón por fila:
<button type="button" onClick={() => setConfirmDelete({ id: item._id, name: item.name })}
    className="p-1.5 text-gray-400 hover:text-maison-red transition-colors cursor-pointer" title="Eliminar">
    <FiTrash2 size={16} />
</button>

// Al final del componente:
<ConfirmModal
    isOpen={confirmDelete !== null}
    onClose={() => setConfirmDelete(null)}
    onConfirm={() => { if (confirmDelete) deleteItem(confirmDelete.id); }}
    title="Eliminar elemento"
    message={`¿Seguro que querés eliminar "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
    confirmLabel="Eliminar"
    isPending={isDeleting}
/>
```

**Gotcha — cuándo cerrar el modal:** cerrar en `onSuccess` (no de forma optimista en `onConfirm`) y pasar `isPending={isDeleting}` al `ConfirmModal` — evita doble submit y mantiene el modal abierto si la request falla (ej. error de red o 400 por regla de negocio), en vez de cerrarlo antes de saber el resultado.

---

## P10 — Selector de horario con slots calculados en frontend

> **Origen:** UX-17 (2026-07-07) — reemplaza un `<input type="datetime-local">` libre por un `<Select>` de horarios válidos, replicando en frontend las mismas reglas de negocio que ya valida el backend (`checkBusinessHours` + overlap de turnos). Aplica a cualquier campo de formulario que agende un `Appointment` a futuro (turno, retoque).

Función pura en `src/utils/timeSlots.ts` (`getAvailableSlots`), sin dependencias de React/Express:

```typescript
getAvailableSlots({ dateStr, professionalId?, durationMin, businessHours?, dayAppointments?, intervalMin = 15, excludeAppointmentId? }): string[]
```

- Día bloqueado (`blockedDates`) o cerrado (`!daySchedule.isOpen`) → `[]`.
- Genera candidatos desde `openTime` en pasos de `intervalMin` mientras el turno completo (`start + durationMin`) entre antes de `closeTime`.
- Con `professionalId`, descarta candidatos que se superpongan (`start < b.end && end > b.start`) con turnos `pending`/`confirmed` de esa profesional ese día; sin `professionalId`, omite el filtro (igual que el backend).
- El componente arma la query de turnos del día (`useQuery(['appointments', 'day', watchedDate, watchedProfessional], ...)`, scopeada a la fecha/profesional elegidos DENTRO del form, no al rango visible de ningún calendario grande) y pasa el resultado + `businessHoursData` (ya cargado vía `getDisponibilidad`) a `getAvailableSlots` dentro de un `useMemo`.

**Gotcha — dos interpretaciones de fecha distintas, no mezclar:** el cálculo de día-de-semana usa `new Date(dateStr).getUTCDay()` (mismo método que el backend, sobre un string `YYYY-MM-DD` de un `<input type="date">`), mientras que el rango horario del día para la query de turnos existentes necesita interpretación *local* (`new Date(`${dateStr}T00:00:00`)`, sin `Z`). Son dos cálculos con propósitos distintos — usar el método equivocado en cada uno reintroduce el bug de off-by-one de timezone ya documentado en `.claude/rules/frontend.md`.

**Gotcha — no perder el valor ya guardado:** si el valor actualmente seleccionado (`watch('time')`) no aparece entre los slots recién calculados (turno editado que quedó "vencido" respecto a la disponibilidad configurada, o un horario prellenado que no cae en la grilla), agregarlo igual a las opciones del `<Select>` en vez de descartarlo — generaliza el patrón P8 a selects computados dinámicamente.

---

## P11 — Elementos flotantes (tooltip/menú) atrapados por el stacking context de un contenedor

> **Origen:** UX-18 (2026-07-07) — el `<Tooltip>` de `react-tooltip` sobre los eventos del calendario aparecía **detrás** de otros elementos en vez de flotar por encima. Aplica a cualquier librería que posicione un elemento "flotante" (tooltip, menú desplegable, popover) relativo a un anchor dentro de un layout complejo (calendario, tabla con scroll, modal).

**Síntoma:** el elemento flotante se renderiza pero queda tapado, cortado, o mal posicionado — no es un problema de que "no aparece", sino de que aparece en el lugar/capa equivocada.

**Causa típica:** la librería posiciona el flotante con `position: absolute` **inline en el árbol de React** (sin portal), por lo que su stacking queda sujeto al contexto de apilamiento del contenedor padre (ej. FullCalendar, un modal con `overflow: hidden`, una tabla con scroll). Sin escapar ese contexto, ningún `z-index` alcanza para "ganarle" al padre.

**Fix:** casi todas las librerías de overlays (`react-tooltip`, `react-select`, Radix, etc.) exponen una forma de renderizar el flotante en un portal a `document.body` con posicionamiento de viewport (`fixed`) en vez de posicionamiento local (`absolute`):

```tsx
// react-tooltip
<Tooltip id="my-tooltip" portalRoot={document.body} positionStrategy="fixed" />

// react-select (ya usado en el proyecto para selects dentro de modales)
<Select menuPortalTarget={document.body} styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }} />
```

**Gotcha:** no alcanza con subir el `z-index` del elemento si sigue renderizado dentro del contenedor con `overflow: hidden`/stacking context propio — el portal es la solución real, el `z-index` alto es un complemento necesario una vez que ya está fuera del contenedor (para no quedar detrás de otros elementos a nivel de `document.body`, ej. otro modal abierto).

---

## P12 — Edición inline de un campo dentro de un bloque de detalle (toggle lectura/edición en el mismo lugar)

> **Origen:** UX-28 (2026-07-10) — editar `nextTouchupDate` desde el modal "Detalle del Retoque" del Dashboard sin abrir un sub-modal ni navegar a otra pantalla. Aplica a cualquier campo puntual (fecha, texto corto) dentro de un modal/card de **solo lectura** que necesite volverse editable sin rediseñar todo el contenedor como un formulario.

**Problema:** para un solo campo, extraer un sub-modal completo (con su propio `<Modal>`, footer, `useForm`) es sobre-ingeniería; pero mutar el bloque de lectura in-place requiere manejar 3 estados (lectura / edición / guardando) sin que queden "pegados" entre sí al cerrar el modal padre o cambiar de entidad seleccionada.

**Mandato:**
1. Un solo booleano de modo (`isEditingX`) condiciona el JSX: texto de solo lectura + botón `FiEdit2` (`aria-label`/`title`, visible solo en modo lectura) **vs.** inputs nativos + botones Guardar/Cancelar (visibles solo en modo edición).
2. **Reset obligatorio del modo edición** al abrir/cerrar el modal padre o al cambiar de entidad seleccionada — envolver el setter de selección (`setSelected(x)`) en wrappers (`openDetail`/`closeDetail`) que también fuerzan `isEditingX(false)`, para que el modo edición nunca sobreviva a un cambio de entidad ni quede abierto al reabrir el modal.
3. Al entrar en modo edición, prellenar los inputs **y** guardar el valor original en un `useRef` (combina con P8: guard anti-reenvío si el usuario guarda sin cambios).
4. `onSuccess` de la mutation actualiza el estado local de la entidad seleccionada con **merge parcial** (no reemplazo total) si la respuesta del `PUT` no viene poblada con relaciones (`.populate()`) que sí tiene el estado ya cargado en memoria — reemplazar todo el objeto rompería esos campos poblados.

```tsx
const [isEditingX, setIsEditingX] = useState(false);
const originalRef = useRef('');

const openDetail = (entity) => { setSelected(entity); setIsEditingX(false); };
const closeDetail = () => { setSelected(null); setIsEditingX(false); };

{isEditingX ? (
    <>
        <input type="date" min={getTodayDateString()} value={dateInput} onChange={...} aria-label="..." />
        <button type="button" onClick={handleSave}>Guardar</button>
        <button type="button" onClick={() => setIsEditingX(false)}>Cancelar</button>
    </>
) : (
    <p>{formatDate(selected.field)}</p>
)}
{!isEditingX && (
    <button type="button" onClick={handleStartEdit} aria-label="Editar ..." title="Editar ...">
        <FiEdit2 />
    </button>
)}
```

**Gotcha:** no reemplazar el objeto completo de estado local (`setSelected(response)`) en el `onSuccess` si el endpoint no popula todas las relaciones — mergear solo el campo editado (`setSelected(prev => prev ? { ...prev, field: newValue } : prev)`).

---

## P13 — Gotcha: `bg-muted`+`text-muted-foreground` colisionan al mismo hex en el puente de tokens Shear

> **Origen:** UX-31 (fundación del rediseño Shear) dejó alias-puente temporales en `@theme` de `index.css` para que las vistas todavía no migradas no rompieran el build. Descubierto como bug real en UX-36 (2026-07-21): `Servicios.tsx` y `AppointmentDetail.tsx` mostraban texto **invisible** en dos badges/cajas.

**Causa:** `--color-muted: var(--muted)` y `--color-muted-foreground: var(--muted)` en `index.css` apuntan **al mismo** token literal de Shear (`--muted: #A08D95`, diseñado en `docs/design.md` como color de **texto**, no de fondo). Cualquier elemento no migrado que combine `bg-muted` (pensado en el sistema viejo como fondo gris claro) con `text-muted-foreground` (pensado como texto gris) en el mismo bloque termina con texto y fondo del mismo color exacto — invisible, sin error de build ni de lint.

**Mandato al migrar cualquier vista de UX-34 (o cualquier archivo todavía no migrado a Shear):** antes de dar por buena una vista, `grep` la combinación `bg-muted` + `text-muted-foreground` dentro del mismo elemento. Fix: reemplazar `bg-muted` por `bg-surface-2` (fondo claro real de Shear), dejando `text-muted`/`text-muted-foreground` como está (mismo valor, ambos nombres resuelven a `#A08D95`, legible sobre `--surface-2: #FDFAFB`).

```diff
- <div className="bg-muted border border-border ... text-muted-foreground">
+ <div className="bg-surface-2 border border-border ... text-muted">
```

**Gotcha:** el bug no aparece en `pnpm build`/`lint` — es puramente visual (contraste 1:1). Solo se detecta mirando la app renderizada o haciendo el grep dirigido de la combinación de clases.

---

## P14 — Gotcha: `useScroll({ target: ref })` de `motion` se congela si el `ref` está detrás de un `return` condicional

> **Origen:** UX-45 (rediseño de la Landing, ronda A, 2026-07-25). Misma familia de bug que ya había costado 2 rondas de fix a `useGSAP` en UX-44 (`docs/history.md` 2026-07-22): un efecto de animación atado a un `ref` que no está montado en el primer render real nunca se vuelve a disparar cuando el DOM sí existe.

**Causa:** `views/Landing.tsx` tiene dos `return` tempranos antes del JSX real (spinner `!isLoaded` de Clerk, `<Navigate>` si `userId`). Un `ref` pasado como `target` a `useScroll({ target: ref, offset: [...] })` (`motion`) memoiza su callback interno de arranque con dependencias `[container, target, offset]` — como el objeto `ref` conserva la MISMA identidad entre el render sin hero y el render con hero ya montado, React no vuelve a ejecutar el efecto de arranque y el progreso de scroll queda congelado en 0 para siempre, sin ningún error en consola.

**Mandato:** antes de usar `useScroll({ target })`/`useGSAP({ scope })` (o cualquier hook de animación con timeline atado a un `ref`) en un componente con `return` condicional antes del JSX que contiene ese `ref`, verificar si el ref puede estar `null` en algún render intermedio real (loading state, guard de auth, etc.):
- Si el componente **tiene** returns condicionales antes del ref → usar la variante SIN `target`/scope acotado (ej. `useScroll()` global trackeando `window`, mapeando con `useTransform` sobre coordenadas de página) o agregar las variables que gatillan esos returns (`isLoaded`, `userId`, etc.) a las dependencias del efecto.
- Si el componente **no** tiene ningún return condicional antes del ref (la sección siempre se monta) → `target` acotado es seguro, preferible por precisión (ej. "Cómo funciona" en `Landing.tsx`, UX-45 ronda C).

**Gotcha:** no produce error de build/lint ni warning en consola — la animación simplemente no ocurre nunca, indistinguible a simple vista de "no se implementó". Solo se detecta inspeccionando si el componente tiene early-returns antes del elemento con el ref, o viendo el `useScroll`/timeline nunca progresar en el navegador real.

---

## P15 — Puerto de un shader fullscreen de three.js/@react-three/fiber a `ogl` (fondo decorativo liviano)

> **Origen:** UX-46 (fondo `Silk` del hero de la Landing, 2026-07-27). Necesidad: reproducir un efecto visual de una librería de terceros (react-bits) cuya variante oficial requiere `three`+`@react-three/fiber` — dependencias purgadas explícitamente del proyecto en UX-45 (peso, 2 rondas de bugs de timing) — sin reabrir esa excepción.

**Cuándo aplica:** un shader GLSL fullscreen (vertex+fragment puro, sin geometría 3D real) que en su forma original usa la API declarativa de `@react-three/fiber` (`<Canvas>`, `<mesh>`, `<shaderMaterial>`, `useFrame`). El GLSL en sí (vertex/fragment) es 100% portable tal cual — lo único que cambia es el "harness" que crea el contexto WebGL y expone los uniforms.

**Receta con `ogl`** (biblioteca WebGL ~30-50 kB, sin relación con three.js):
1. `Renderer` (crea `gl`/canvas) + `Program` (compila vertex+fragment, uniforms como `{ value }`, misma forma que `ShaderMaterial` de three) + `Mesh` con geometría `Triangle` de `ogl` — el idiom estándar para shaders fullscreen (un solo triángulo sobredimensionado, sin seam central, sin necesidad de cámara/matrices de proyección).
2. Vertex shader simplificado: sin `projectionMatrix`/`modelViewMatrix` (innecesarios porque `Triangle.position` ya viene en espacio de clip) — `gl_Position = vec4(position, 0.0, 1.0);`.
3. `ResizeObserver` sobre el contenedor (no `window.resize`) si el canvas vive dentro de una sección específica, no del viewport completo.
4. Cleanup explícito en 4 pasos en el `return` del `useEffect` — `ogl` **no** expone un `dispose()` de alto nivel como three.js: `cancelAnimationFrame` → `resizeObserver.disconnect()` → `gl.getExtension('WEBGL_lose_context')?.loseContext()` → remover el `canvas` del DOM. Sin estos 4 pasos, montaje/desmontaje repetido (ej. navegación ida y vuelta a la Landing) puede acumular contextos WebGL huérfanos.
5. `prefers-reduced-motion`: recibir la prop desde el componente padre (no invocar el hook adentro) y, si está activo, renderizar un único frame estático (`renderer.render()` una vez) sin llamar nunca `requestAnimationFrame`.

**Ejemplo canónico:** `apps/client/src/components/landing/Silk.tsx` (ver `progress/reviews/review_UX-46.md` para el detalle de auditoría del cleanup).

**Gotcha de contraste:** un shader que sale con alfa completo (`col.a = 1.0`) sobre texto real necesita un wrapper con opacidad baja (calibrar visualmente, no asumir un valor) — nunca confiar en que el propio patrón del shader ya es "sutil" solo por su matemática interna.

---

## P16 — Gotcha: un `position: sticky` dentro de una columna de CSS Grid necesita altura explícita en TODOS los ancestros hasta el grid item, no solo en el grid item

> **Origen:** UX-54 (índice de módulos de `/guia` no quedaba sticky, 2026-07-28/29).

**Causa:** en un grid de 2 columnas (ej. `grid-cols-[240px_minmax(0,1fr)]`) con una sola fila, `align-items: stretch` (default de CSS Grid) SÍ estira el grid item corto (la columna del índice) para igualar la altura de la columna larga (el contenido) — pero esa altura estirada **no se propaga automáticamente** a los descendientes en bloque dentro de ese grid item. Un `<nav>`/`<div>` intermedio sin `h-full` sigue calculando su altura por contenido propio (`height: auto`), quedando mucho más corto que el grid item que lo contiene. Como el *containing block* de un elemento `position: sticky` es su ancestro en bloque más cercano (no necesariamente el grid item), si ese ancestro intermedio es corto, el elemento sticky no tiene ningún recorrido vertical dentro del cual "pegarse" — se desplaza junto con su contenedor corto y desaparece apenas ese bloque corto sale del viewport, en vez de quedar fijo mientras se scrollea el resto de la columna.

**Mandato:** cuando se ponga `sticky` a un elemento dentro de una celda de grid que se espera sea alta (ej. un índice/sidebar junto a una columna de contenido largo), agregar `h-full` (o el equivalente del breakpoint correspondiente, ej. `lg:h-full`) a **cada** contenedor de bloque intermedio entre el grid item y el elemento sticky — no alcanza con que el grid item se estire solo.

**Gotcha:** no produce ningún error de build/lint ni warning visual obvio en el código — el layout se ve "casi bien" en el primer viewport (el sticky arranca en su posición correcta) y el bug solo se nota scrolleando lo suficiente como para que el contenedor corto salga de pantalla. Fix de una sola clase (`GuideIndex.tsx`, agregar `lg:h-full` al `<nav>`), pero fácil de pasar por alto sin mirarlo en el navegador real.

---

> **Cómo extender este catálogo:** cuando una feature cerrada produzca un patrón o gotcha de UI genuinamente nuevo y reutilizable, el `leader` lo promueve a este archivo durante el cierre de sesión.
