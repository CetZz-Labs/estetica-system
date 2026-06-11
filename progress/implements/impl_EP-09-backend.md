# Bitácora Implementer — EP-09 (Backend): Registro autónomo de nuevos tenants

**Fecha:** 2026-06-11
**Feature:** EP-09 — Registro autónomo de nuevos tenants (parte backend, Fase 2)
**Agente:** implementer-backend
**Diseño seguido:** `progress/explores/explore_ep09-registro.md` §3 y §4

---

## Objetivo

Exponer `POST /api/onboarding` para que un usuario recién registrado en Clerk (con email verificado) cree su propio `Tenant` y su `Admin` vinculado, sin intervención manual, con idempotencia y compensación manual ante fallos parciales.

## Archivos creados

| Archivo | Contenido |
|---|---|
| `apps/server/src/controllers/onboardingController.ts` | `createTenantWithAdmin`: gate 401 (`getAuth`), gate defensivo 403 de email verificado (`clerkClient.users.getUser` → email primario con `verification.status === 'verified'`), idempotencia 200 por `externalId`, 409 por email único global usado por otro `externalId`, creación `Tenant` → `Admin { externalId, email, tenantId, role: 'ADMIN' }` con compensación manual (rollback del Tenant si falla el Admin → 500), respuesta 201 `{ tenant, admin }`. |
| `apps/server/src/routes/onboardingRoutes.ts` | Router `POST /` con `body('businessName').notEmpty().withMessage(...).trim()` + `responsibleName` opcional + `validateRequest`. **Sin** `checkAdminAccess`/`checkTenantAccess` (excepción documentada en comentario: el admin aún no existe). |
| `apps/server/src/__tests__/onboarding.test.ts` | 6 tests nuevos (vitest + mongodb-memory-server + supertest), con mock de `getAuth` y de `clerkClient.users.getUser`. |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `apps/server/src/server.ts` | Import y montaje `app.use('/api/onboarding', onboardingRoutes)` después de `clerkMiddleware()` global, junto a los demás routers, con comentario de la excepción de middlewares. |
| `apps/server/src/__tests__/tenantIsolation.test.ts` | Ajuste defensivo del mock de `@clerk/express`: se agregó `clerkClient: { users: { getUser: vi.fn() } }` porque el server ahora importa `clerkClient` vía `onboardingController` (sin esto, el mock factory no expone el export). Ningún test existente fue alterado. |

## Decisiones técnicas

1. **Email autoritativo desde Clerk:** el body nunca aporta el email; se lee del usuario Clerk (`primaryEmailAddressId` → `emailAddresses`) y se normaliza con `toLowerCase().trim()` (consistente con el schema `lowercase` de `Admin.email`).
2. **Orden de gates:** 401 (sesión) → 403 (email no verificado) → 200 (idempotencia por `externalId`) → 409 (email de otro `externalId`) → creación. La idempotencia se evalúa antes que el conflicto de email para que reintentos del mismo usuario siempre devuelvan 200.
3. **Compensación manual en vez de transacciones:** el harness de tests usa `MongoMemoryServer` standalone (sin replica set), por lo que un `try/catch` alrededor de `Admin.create` elimina el `Tenant` huérfano (`Tenant.findByIdAndDelete`) y relanza al catch externo → 500. Conforme a explore §3.5.
4. **`Tenant.findById` permitido aquí:** GOV-TENANT exige `tenantId` en queries de colecciones de negocio; la colección `tenants` ES el tenant y el lookup se hace por `admin.tenantId` resuelto del propio usuario autenticado (sin vector cross-tenant).
5. **Sin `checkAdminAccess`/`checkTenantAccess`:** excepción documentada (explore §3 y comentarios en código) — el admin no existe todavía; el gate real es la sesión Clerk + email verificado.

## Tests nuevos (6)

1. 401 sin sesión de Clerk.
2. 403 si el email primario no está verificado (y verifica que no se creó nada).
3. 400 si falta `businessName` (express-validator).
4. 201 crea tenant + admin: `admin.tenantId === tenant._id`, `role: 'ADMIN'`, `externalId` y `email` correctos, verificación en DB.
5. Idempotencia: segundo POST mismo userId → 200 con documentos originales, counts de `tenants`/`admins` sin cambio.
6. 409 si el mismo email verificado pertenece a otro `externalId`, sin crear documentos.

## Verificación

### `pnpm --filter @estetica/server build` → **Exit 0**

```
> @estetica/server@1.0.0 build
> tsc
```

### `pnpm --filter @estetica/server test` → **Exit 0**

```
 RUN  v4.1.8 .../apps/server

 Test Files  2 passed (2)
      Tests  29 passed (29)
   Duration  5.08s
```

(23 tests preexistentes de `tenantIsolation.test.ts` + 6 nuevos de `onboarding.test.ts` = 29 en verde. Las warnings de Mongoose sobre `new: true` son preexistentes, no introducidas por esta feature.)

## Notas para el reviewer

- El endpoint queda montado tras `clerkMiddleware()` global, por lo que `getAuth(req)` funciona en producción; en tests el middleware está mockeado.
- `responsibleName` se valida/trimea pero no se persiste (no existe campo en el schema; el explore lo define como dato de UI/metadata — EP-10 podrá incorporarlo a configuración del tenant si se parametriza).
- No se tocó `apps/client/`, `feature_list.json` ni configuración de la raíz.
