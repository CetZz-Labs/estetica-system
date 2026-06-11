# impl_EP-10 — Configuración básica del negocio

## Objetivo
Sección "Mi Negocio" en configuración para personalizar nombre, logo, zona horaria y moneda.

## Archivos creados

### Backend
- `apps/server/src/models/Tenant.ts` — Modelo Tenant con campos name, logo (String opcional), timezone (default America/Argentina/Buenos_Aires), currency (default ARS), isActive, timestamps
- `apps/server/src/controllers/tenantController.ts` — getTenant (GET, busca por req.tenantId), updateTenant (PUT, whitelist $set mass-assignment prevention)
- `apps/server/src/routes/tenantRoutes.ts` — GET / y PUT / con express-validator: name.notEmpty, currency.isLength({min:3,max:3}), validateRequest
- `apps/server/src/__tests__/tenantSettings.test.ts` — 6 tests: GET 200, PUT name, PUT timezone+currency, PUT name vacío 400, GET 401 no auth, PUT currency corta 400

### Frontend
- `apps/client/src/api/tenantApi.ts` — getTenant() y updateTenant() con axios, tipos TenantSettings
- `apps/client/src/views/Negocio.tsx` — Formulario react-hook-form (nombre, logo URL con preview, timezone select, currency select), useQuery + useMutation, skeleton loading, error state, sonner toasts, default export

### Archivos modificados
- `apps/server/src/server.ts` — Montó /api/negocio con checkAdminAccess + checkTenantAccess
- `apps/client/src/router.tsx` — Ruta /configuracion/negocio dentro de AppLayout
- `apps/client/src/layouts/AppLayout.tsx` — NavLink "Configuración" en sidebar
- `docs/db-schema.md` — Agregó logo, timezone, currency a tabla tenants + reglas de EP-10

## Verificación
- Server build: Exit Code 0
- Server tests: 35/35 passed
- Client build: Exit Code 0
