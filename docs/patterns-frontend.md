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

> **Cómo extender este catálogo:** cuando una feature cerrada produzca un patrón o gotcha de UI genuinamente nuevo y reutilizable, el `leader` lo promueve a este archivo durante el cierre de sesión.
