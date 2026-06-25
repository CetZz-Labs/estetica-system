# Exploración EP-12 — Acceso diferenciado por rol (RBAC)
**Fecha:** 2026-06-25
**Autor:** leader (el explorer no pudo persistir por permisos de escritura; el leader auditó los mismos archivos directamente)

---

## 1. Estado actual del modelo Admin (`apps/server/src/models/Admin.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| externalId | String | required, unique, index — ID de Clerk |
| tenantId | ObjectId | required, ref Tenant, index |
| email | String | required, unique, lowercase |
| role | String enum | **CRÍTICO: enum actual = `['ADMIN','MANAGER','SUPERADMIN']` — NO coincide con SRS §6.2 que exige `['ADMIN','PROFESSIONAL','RECEPTIONIST']`** |
| isActive | Boolean | default true |
| createdAt / updatedAt | timestamps | |

**Interfaz `IAdmin`**: `role: 'ADMIN' | 'MANAGER' | 'SUPERADMIN'` — misma divergencia.

Default del campo: `'ADMIN'` → se conserva.

---

## 2. Estado actual del middleware (`apps/server/src/middlewares/authMiddleware.ts`)

### `checkAdminAccess` (líneas 16-42)
- `getAuth(req)` → obtiene `userId` de Clerk
- `Admin.findOne({ externalId: userId })` → **NO filtra `isActive: true`** — admins desactivados pasan
- Inyecta `req.adminInfo = admin`
- Inyecta nada de rol: el rol ya está en `req.adminInfo.role`

### `checkTenantAccess` (líneas 47-64)
- Lee `req.adminInfo.tenantId`, inyecta `req.tenantId`

### `requireRole` → **NO EXISTE** en el codebase.

---

## 3. Inventario de routes backend

| Archivo | Ruta montada en server.ts | Middleware en server.ts | Middleware propio en route file |
|---|---|---|---|
| `adminRouter.ts` | `/api/admin` | `checkAdminAccess, checkTenantAccess` | ❌ ninguno |
| `clientRoutes.ts` | `/api/clientes` | ❌ ninguno | `checkAdminAccess, checkTenantAccess` |
| `serviceRoutes.ts` | `/api/servicios` | ❌ ninguno | `checkAdminAccess, checkTenantAccess` |
| `productRoutes.ts` | `/api/productos` | ❌ ninguno | `checkAdminAccess, checkTenantAccess` |
| `serviceRecordRoutes.ts` | `/api/registros` | ❌ ninguno | `checkAdminAccess, checkTenantAccess` |
| `dashboardRoutes.ts` | `/api/dashboard` | ❌ ninguno | (por verificar) |
| `tenantRoutes.ts` | `/api/negocio` | `checkAdminAccess, checkTenantAccess` | ❌ ninguno |
| `appointmentRoutes.ts` | `/api/turnos` | `checkAdminAccess, checkTenantAccess` **← DOBLE** | `checkAdminAccess, checkTenantAccess` |
| `professionalRoutes.ts` | `/api/profesionales` | ❌ ninguno | `checkAdminAccess, checkTenantAccess` |
| `onboardingRoutes.ts` | `/api/onboarding` | ❌ (excepción documentada) | (Clerk only) |

**Bug detectado:** `/api/turnos` corre `checkAdminAccess + checkTenantAccess` dos veces (server.ts Y appointmentRoutes.ts). Cada request de turnos hace 2 queries Mongo innecesarias.

---

## 4. Tabla de permisos por rol (SRS §6.2, líneas 776-791)

| Módulo | ADMIN | PROFESSIONAL | RECEPTIONIST |
|--------|:-----:|:-----------:|:------------:|
| Clientes (ver) | ✅ | ✅ | ✅ |
| Clientes (crear/editar) | ✅ | ✅ | ✅ |
| Clientes (eliminar) | ✅ | ❌ | ❌ |
| Servicios (ver) | ✅ | ✅ | ✅ |
| Servicios (gestionar) | ✅ | ❌ | ❌ |
| Inventario (ver) | ✅ | ✅ | ❌ |
| Inventario (gestionar) | ✅ | ❌ | ❌ |
| Visitas (registrar) | ✅ | ✅ | ❌ |
| Visitas (ver historial) | ✅ | ✅ | ✅ |
| Turnos (gestionar) | ✅ | ✅ | ✅ |
| Usuarios (gestionar) | ✅ | ❌ | ❌ |
| Configuración negocio | ✅ | ❌ | ❌ |
| Reportes y métricas | ✅ | ❌ | ❌ |
| Facturación / Plan | ✅ | ❌ | ❌ |

---

## 5. Estado del sidebar / frontend

**`AppLayout.tsx`**: sidebar estático con todos los NavLinks visibles para todos los usuarios. Sin lógica de rol ni permisos.

NavLinks actuales: Dashboard, Clientes, Servicios, Inventario, Turnos, Equipo/Profesionales, Configuración.

**`router.tsx`**: sin `ProtectedRoute`. Todas las rutas bajo `<AppLayout>` son accesibles si hay userId de Clerk.

**`adminApi.ts`**: no existe. El endpoint `GET /api/admin` sí existe (retorna `req.adminInfo`) pero ningún componente lo consume.

**`types/index.ts`**: no tiene tipo `AdminInfo` con campo `role`.

---

## 6. Plan de cambios — Backend

| Archivo | Cambio |
|---|---|
| `models/Admin.ts` | Cambiar enum y tipo a `['ADMIN','PROFESSIONAL','RECEPTIONIST']` |
| `middlewares/authMiddleware.ts` | Agregar `isActive: true` al findOne; exportar `requireRole` factory |
| `routes/clientRoutes.ts` | `requireRole('ADMIN')` en DELETE /:id |
| `routes/serviceRoutes.ts` | `requireRole('ADMIN')` en POST, PUT, DELETE |
| `routes/productRoutes.ts` | `requireRole('ADMIN','PROFESSIONAL')` en GET /; `requireRole('ADMIN')` en POST, PUT, DELETE, POST /:id/stock, POST /bulk |
| `routes/serviceRecordRoutes.ts` | `requireRole('ADMIN','PROFESSIONAL')` en POST / |
| `routes/professionalRoutes.ts` | `requireRole('ADMIN')` en POST, PUT, DELETE |
| `server.ts` | Quitar `checkAdminAccess, checkTenantAccess` del mount de `/api/turnos` (ya están en la route file); agregar `requireRole('ADMIN')` al mount de `/api/negocio` |

---

## 7. Plan de cambios — Frontend

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Agregar `AdminInfo` type con `role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTIONIST'` |
| `api/adminApi.ts` (nuevo) | `getMe(): Promise<AdminInfo>` → `GET /api/admin` |
| `layouts/AppLayout.tsx` | `useQuery(['admin-me'], getMe)` + sidebar condicional por rol |
| `router.tsx` | Componente `ProtectedRoute` + wrappear `/profesionales`, `/configuracion/negocio`, `/inventario` |

---

## 8. Riesgos y ADRs propuestos

**ADR-1 — Enum migration:** Los documentos `Admin` existentes con `role: 'MANAGER'` o `role: 'SUPERADMIN'` nunca se crearon (el onboarding EP-09 siempre asignó el default `'ADMIN'`). Riesgo: bajo. No se requiere script de migración de datos — solo comentario en el modelo.

**ADR-2 — requireRole en server.ts vs route files:** Para `/api/negocio` (entero ADMIN-only) se agrega `requireRole('ADMIN')` en server.ts inline junto con `checkAdminAccess + checkTenantAccess`. Para rutas mixtas (donde algunos verbos son ADMIN y otros son ALL), se agrega en el handler específico dentro del route file.

**ADR-3 — Frontend role source:** El rol se obtiene de `GET /api/admin` (cached en TanStack Query con key `['admin-me']`). No se usa Clerk metadata para el rol (Clerk no tiene noción del rol del negocio — esa es información de MongoDB).

**ADR-4 — ProtectedRoute:** Usa el mismo `useQuery(['admin-me'])` del cache (sin segunda llamada a red). Si el usuario no tiene rol suficiente, redirige a `/dashboard` con `toast.error`.
