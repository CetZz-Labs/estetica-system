# Arnés de Reglas y Habilidades de Frontend (Maison CRM Web)

> **Documento de Gobernanza:** Define las políticas operativas, convenciones de arquitectura y restricciones de UX para cualquier interacción automatizada dentro de la capa frontend (React SPA) de Maison CRM.

## 1. ROL Y LÍMITES DEL AGENTE EN EL FRONTEND

* **Sandbox de Ejecución:** Tu contexto está restringido al directorio `apps/client`.
* **Prohibición de Alcance Global:** Prohibido alterar configuraciones del monorepo o tocar archivos del backend (`apps/server`).
* **Stack Tecnológico:** React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + TanStack Query 5 + react-router 7 + Clerk React 6 + react-hook-form 7 + sonner 2 + react-icons (Feather) + xlsx.

## 2. ARQUITECTURA DE CAPAS Y FLUJO DE DATOS

* **Capa de API (`src/api/`)**: Funciones async que llaman a la instancia centralizada de Axios. Cada recurso tiene su propio archivo (`clientApi.ts`, `serviceApi.ts`, etc.). Las interfaces de formulario se co-ubican aquí.
* **Capa de Estado Asíncrono**: TanStack Query para fetching. Los hooks `useQuery`/`useMutation` se usan directamente en las vistas (no hay carpeta `hooks/` separada con wrappers).
* **Capa de Presentación**: Componentes en `src/views/` y `src/components/`. Consumen hooks de TanStack Query directamente.

### Patrón de Consumo de API

```typescript
// api/clientApi.ts
import api from '../libs/axios';
import type { Client } from '../types';

export const getClients = async (): Promise<Client[]> => {
    const { data } = await api.get('/clientes');
    return data;
};

// En la vista:
const { data: clientes, isLoading, isError } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: getClients,
});
```

### Patrón de Mutaciones

```typescript
const queryClient = useQueryClient();
const { mutate, isPending } = useMutation({
    mutationFn: (data: ClientFormData) => createClient(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success('Cliente creado correctamente');
        onClose();
    },
    onError: (error) => handleApiError(error, 'Error al crear cliente'),
});
```

## 3. CONVENCIONES DE COMPONENTES

* **`export default function ComponentName()`** para todos los componentes y vistas.
* **Props interface** local llamada `Props`.
* **4 estados obligatorios:** loading (skeleton `animate-pulse`), error (toast + trifecta), empty (mensaje), data.
* **Orden en componentes:**
  1. `useState` hooks
  2. TanStack Query hooks (`useQuery`, `useMutation`)
  3. Estado derivado (useMemo/useEffect si necesario)
  4. Handlers
  5. Return JSX

### Modales (react-hook-form)
* Usar `useForm<FormDataType>()` con `reset()` en `useEffect` cuando `isOpen` cambia.
* Definir `footer` como variable JSX inline (no componente separado).
* Usar el componente `<Modal>` compartido de `src/components/ui/Modal.tsx`.

## 3.5. REGLAS DE GOBERNANZA TRANSVERSALES

* **Fuente Canónica:** Todo subagente DEBE consultar `docs/governance-rules.md` como fuente única de verdad para reglas de accesibilidad (Trifecta GOV-ACCESS) y seguridad frontend (GOV-CLIENT). Este archivo solo referencia — nunca redefine — esas reglas.

## 4. SISTEMA DE DISEÑO (DOCUMENTACIÓN CANÓNICA)

* **Referencia Inmutable:** Todo subagente DEBE leer `docs/design.md` antes de implementar o modificar cualquier componente React en `apps/client/src/`. El `reviewer` evaluará los componentes contra esta especificación.
* **Colores:** Usar clases Tailwind personalizadas del sistema de diseño (`bg-maison-primary`, `text-maison-text`, `bg-maison-card`, etc.) definidas en `apps/client/src/index.css`.
* **Iconos:** `react-icons/fi` (Feather Icons). Importar específicamente: `import { FiPlus, FiTrash2 } from 'react-icons/fi'`.
* **Notificaciones:** `sonner` para toasts. Posición `top-right`. Usar `toast.success()`, `toast.error()`.
* **Tipografía:** Dos familias: `Playfair Display` (serif, títulos) e `Inter` (sans, cuerpo). Clases Tailwind estándar.
* **Responsive:** Diseño mobile-first. Usar `sm:`, `md:`, `lg:` para adaptación.
* **Componentes:** Usar el componente compartido `<Modal>` de `src/components/ui/Modal.tsx`. Seguir patrones de botones, cards, inputs y tablas documentados en `docs/design.md` §4.
* **Trifecta de Accesibilidad (C6):** Todo estado crítico DEBE incluir Color + Icono + Texto. Ver `docs/design.md` §6.

## 5. ERROR HANDLING

* Siempre usar `handleApiError(error, fallbackMessage)` de `src/api/errorHandler.ts`.
* No mostrar `alert()` ni `console.error()` al usuario.
* Los errores de formulario se manejan con `react-hook-form` + `errors` del formulario.

## 6. ARNÉS DE VERIFICACIÓN

Antes de reportar cierre, ejecuta:
```
pnpm --filter @estetica/client build
pnpm --filter @estetica/client lint
```

## 7. IMPORTACIONES

Orden estricto:
1. Librerías externas (react, react-router, @tanstack/react-query, etc.)
2. Módulos internos (api, types, utils, components)

Comillas simples en TypeScript, dobles en JSX. Punto y coma siempre.
