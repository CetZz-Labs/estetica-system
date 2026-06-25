# impl_EP-12-frontend — Acceso diferenciado por rol (RBAC) — Frontend

**Feature:** EP-12  
**Fecha:** 2026-06-25  
**Sandbox:** apps/client/

---

## Archivos modificados / creados

| Archivo | Operación |
|---|---|
| `apps/client/src/types/index.ts` | Modificado — agregados `AdminRole` y `AdminInfo` al inicio |
| `apps/client/src/api/adminApi.ts` | Creado — función `getMe()` que llama a `GET /api/admin` |
| `apps/client/src/layouts/AppLayout.tsx` | Modificado — query `admin-me`, helper `navLinkClass`, nav condicional por rol |
| `apps/client/src/router.tsx` | Modificado — componente `ProtectedRoute`, rutas `/profesionales`, `/inventario` y `/configuracion/negocio` wrapeadas |

---

## Resultado del build

```
pnpm --filter @estetica/client build
```

Exit Code: **0**

```
✓ built in 4.37s
dist/index.html                     0.48 kB │ gzip:   0.33 kB
dist/assets/index-DYyf_R0k.css     44.96 kB │ gzip:   8.30 kB
dist/assets/index-CDya3539.js   1,427.60 kB │ gzip: 435.77 kB
```

Warning de chunk size: preexistente, no relacionado con esta feature.

---

## Resultado del lint

```
pnpm --filter @estetica/client lint
```

Exit Code: **1** — por error **preexistente** en `ProductoModal.tsx:37` (`stock` assigned but never used). Confirmado en las instrucciones de la tarea como error anterior a esta feature.

Advertencias preexistentes (no nuevas):
- `ProfesionalModal.tsx:72` — react-hooks/incompatible-library (watch)
- `Negocio.tsx:73` — react-hooks/incompatible-library (watch)
- `Turnos.tsx:357` — react-hooks/incompatible-library (watch)

**Cero errores ni advertencias nuevas** introducidos por EP-12.

---

## Decisiones técnicas

### 1. `ReactNode` en vez de `React.ReactNode`
El JSX transform moderno (React 17+) no inyecta `React` en scope. Para que `ProtectedRoute` acepte `children: ReactNode` sin error TS, se importa `import type { ReactNode } from 'react'` en lugar de usar `React.ReactNode`.

### 2. Fallback de rol a `'ADMIN'`
Mientras `adminInfo` carga (o si el query aún no tiene datos), `role` cae en `'ADMIN'`. Esto garantiza que el sidebar no oculte ítems durante el estado de carga inicial, evitando un flash de contenido restringido. En cuanto el query resuelve, el rol real reemplaza el fallback.

### 3. Cache compartida `['admin-me']`
Tanto `AppLayout` como `ProtectedRoute` usan la misma `queryKey: ['admin-me']`. TanStack Query deduplicará la request: solo se hace **una** llamada HTTP al backend por sesión (staleTime: 5 min en AppLayout).

### 4. `enabled: !!userId` en AppLayout
El query `getMe` solo se activa cuando Clerk ya resolvió un `userId`. Evita llamadas a `/api/admin` sin JWT en rutas públicas o durante el estado de carga de Clerk.

### 5. Tabla de permisos implementada
| Ruta | Roles permitidos | Implementación |
|---|---|---|
| `/inventario` | ADMIN, PROFESSIONAL | `ProtectedRoute roles={['ADMIN', 'PROFESSIONAL']}` |
| `/profesionales` | ADMIN | `ProtectedRoute roles={['ADMIN']}` + nav solo ADMIN |
| `/configuracion/negocio` | ADMIN | `ProtectedRoute roles={['ADMIN']}` + nav solo ADMIN |
| Dashboard, Clientes, Servicios, Turnos | todos | sin restricción |

---

---

## Corrección post-implementación: side effect en render (ProtectedRoute)

**Problema detectado:** `toast.error()` se llamaba directamente en el cuerpo del render de `ProtectedRoute`, violando las reglas de React (side effects en render) y disparándose dos veces en StrictMode.

**Corrección aplicada en `router.tsx`:**

- Import actualizado: `import type { ReactNode } from 'react'` a `import { useEffect, type ReactNode } from 'react'`.
- `toast.error()` movido a un `useEffect` que depende de `isDenied` (variable derivada del estado de carga y permisos).
- La redirección `<Navigate>` permanece en el render condicional (es declarativa, no un side effect).

**Build post-corrección:** Exit Code 0 — `built in 823ms`.

---

## Correcciones TypeScript del reviewer (3 defectos mecánicos)

**Defecto 1 — `AppLayout.tsx`:** `useQuery` sin generic explícito. Corregido a `useQuery<AdminInfo>`. Se agregó `AdminInfo` al import de `'../types'`.

**Defecto 2 — `router.tsx`:** `useQuery` sin generic en `ProtectedRoute`. Corregido a `useQuery<AdminInfo>`. Se agregó `AdminInfo` al import de `'./types'`.

**Defecto 3 — `router.tsx`:** firma inline en `ProtectedRoute` reemplazada por `interface Props { roles: AdminRole[]; children: ReactNode; }` declarada justo antes de la función.

**Build post-correcciones:** Exit Code 0 — `built in 960ms`.

---

## Estado

Implementacion completa. Todas las correcciones de review aplicadas. Build OK. Sin errores nuevos en lint. Listo para review final.
