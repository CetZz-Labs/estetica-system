# Review EP-10 — Configuración básica del negocio

**Revisor:** reviewer (subagente autónomo)
**Fecha:** 2026-06-11
**Feature:** EP-10 — Configuración básica del negocio

---

## C2 — Coherencia de Estados y Enfoque Atómico

- [x] **Límite de Paralelismo:** Solo EP-10 figura como `"in_progress"` en feature_list.json.
- [x] **Gobernanza de Backlog:** Ninguna feature `"done"` sin auditoría.
- [x] **Limpieza de Contexto:** `progress/current.md` describe exclusivamente EP-10.
- [x] **Sandbox Hermético:** Archivos tocados pertenecen exclusivamente al módulo Settings: Tenant.ts, tenantController.ts, tenantRoutes.ts, tenantSettings.test.ts, tenantApi.ts, Negocio.tsx, router.tsx (ruta agregada), AppLayout.tsx (link sidebar), server.ts (mount), db-schema.md (docs).

## C3 — Fidelidad Arquitectónica y Políticas del Sistema

### Backend
- [x] **Estructura Limpia:** controller en controllers/, model en models/, route en routes/.
- [x] **Autenticación Obligatoria:** GET/PUT `/api/negocio` protegidos con `checkAdminAccess` + `checkTenantAccess`.
- [x] **Validación de Entrada:** PUT valida con express-validator: `name.notEmpty()`, `currency.isLength({min:3,max:3})`.
- [x] **Manejo de Errores:** Ambos controllers usan try/catch con códigos HTTP adecuados (200, 400, 404, 500).

### Frontend
- [x] **Desacoplamiento de Datos:** Llamadas en `tenantApi.ts`, consumidas via `useQuery`/`useMutation` de TanStack Query.
- [x] **Manejo de Estados:** Los 4 estados cubiertos: loading (skeleton), error (icono + texto), empty (formulario con defaults), data (formulario poblado).
- [x] **Instancia Axios Centralizada:** Usa `api` desde `src/libs/axios`.
- [x] **Notificaciones via Sonner:** `toast.success()` en éxito, `handleApiError()` en error.
- [x] **Componentes con `export default`:** Negocio usa `export default function`.
- [x] **Tipado Explícito:** `useQuery<{ tenant: TenantSettings }>`, interfaz `NegocioFormData` e `TenantSettings`.

### Transversal
- [x] **Higiene de Depuración:** Sin `console.log`, `debugger`, ni `TODO` sin ticket. `console.error` usado legítimamente en catch blocks.
- [x] **Sin Contaminación de Dependencias:** Sin cambios a package.json raíz.

## C4 — Compilación Estática

- [x] **Compilación Backend:** Exit Code 0.
- [x] **Compilación Frontend:** Exit Code 0.
- [x] **Lint Frontend:** Sin errores nuevos. Pre-existing error en `ProductoModal.tsx:37` (stock no usado) no es atribuible a EP-10.

## C6 — Capa de Datos (Modelos Mongoose)

- [x] **Ubicación Canónica:** `apps/server/src/models/Tenant.ts`.
- [x] **Naming:** PascalCase `Tenant.ts`, interfaz `ITenant`.
- [x] **Timestamps:** `{ timestamps: true }`.
- [x] **Soft Delete:** `isActive: Boolean` con `default: true`.
- [x] **Índices:** Fields nuevos (logo, timezone, currency) sin índice — correcto para su perfil de consulta.

## C7 — Security Gate

- [x] **SEC-A (Auth):** `/api/negocio` protegido con `checkAdminAccess`.
- [x] **SEC-B (Clerk JWT):** Middleware `clerkMiddleware()` presente en server.ts.
- [x] **SEC-D (Validación):** PUT usa express-validator.
- [x] **SEC-E (Sin dangerouslySetInnerHTML):** No se usa en EP-10.

## Observaciones (no bloqueantes)

1. **Mongoose deprecation:** `tenantController.ts:37` usa `{ new: true }` en `findByIdAndUpdate`. Migrar a `{ returnDocument: 'after' }` para eliminar warning.
2. **Lint warning:** `Negocio.tsx:73` — `watch('logo')` dispara `react-hooks/incompatible-library` warning (no error). No bloquea.

---

## Veredicto

**VERDE** — La feature cumple con todos los checkpoints aplicables. Se procede a marcar EP-10 como `"done"` en feature_list.json.
