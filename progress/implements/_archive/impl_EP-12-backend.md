# Bitácora de Implementación — EP-12 Backend (RBAC)

**Fecha:** 2026-06-25
**Implementer:** Backend agent
**Feature:** EP-12 — Acceso diferenciado por rol

---

## Archivos Modificados

### 1. `apps/server/src/models/Admin.ts`
- **Línea 7 (interfaz):** `role: 'ADMIN' | 'MANAGER' | 'SUPERADMIN'` → `role: 'ADMIN' | 'PROFESSIONAL' | 'RECEPTIONIST'`
- **Líneas 36-38 (schema enum):** `['ADMIN', 'MANAGER', 'SUPERADMIN']` → `['ADMIN', 'PROFESSIONAL', 'RECEPTIONIST']`
- Agrego comentario EP-12 en el campo role del schema documentando la corrección del enum (los valores MANAGER/SUPERADMIN nunca se usaron en producción).

### 2. `apps/server/src/middlewares/authMiddleware.ts`
- **`checkAdminAccess` (línea 26):** `Admin.findOne({ externalId: userId })` → `Admin.findOne({ externalId: userId, isActive: true })`. Un admin desactivado ahora recibe 403 en vez de pasar.
- **Nuevo export `AdminRole`:** tipo `'ADMIN' | 'PROFESSIONAL' | 'RECEPTIONIST'` coubicado con el middleware.
- **Nuevo export `requireRole(...roles)`:** middleware factory que lee `req.adminInfo.role` (inyectado por `checkAdminAccess`) y retorna 403 si el rol no está en la lista permitida. Siempre corre DESPUES de `checkAdminAccess`.

### 3. `apps/server/src/routes/clientRoutes.ts`
- Import de `requireRole` agregado al import existente.
- `DELETE /:id`: `requireRole('ADMIN')` agregado como primer elemento del array de validators (antes de los validators de express-validator).

### 4. `apps/server/src/routes/serviceRoutes.ts`
- Import de `requireRole` agregado.
- `POST /`: `requireRole('ADMIN')` como primer elemento del array.
- `PUT /:id`: `requireRole('ADMIN')` como primer elemento del array.
- `DELETE /:id`: `requireRole('ADMIN')` como primer elemento del array.

### 5. `apps/server/src/routes/productRoutes.ts`
- Import de `requireRole` agregado.
- `GET /`: cambiado de `getProducts` directo a `requireRole('ADMIN', 'PROFESSIONAL'), getProducts` — RECEPTIONIST no puede ver productos.
- `POST /`: `requireRole('ADMIN')` como primer elemento del array.
- `PUT /:id`: `requireRole('ADMIN')` como primer elemento del array.
- `POST /:id/stock`: `requireRole('ADMIN')` como primer elemento del array.
- `DELETE /:id`: `requireRole('ADMIN')` como primer elemento del array.
- `POST /bulk`: `requireRole('ADMIN')` agregado despues del `checkAdminAccess` redundante existente (que se preservo segun instruccion).

### 6. `apps/server/src/routes/serviceRecordRoutes.ts`
- Import de `requireRole` agregado.
- `POST /`: `requireRole('ADMIN', 'PROFESSIONAL')` como primer elemento del array — RECEPTIONIST no puede registrar visitas.

### 7. `apps/server/src/routes/professionalRoutes.ts`
- Import de `requireRole` agregado.
- `POST /`: `requireRole('ADMIN')` como primer elemento del array.
- `PUT /:id`: `requireRole('ADMIN')` como primer elemento del array.
- `DELETE /:id`: `requireRole('ADMIN')` como primer elemento del array.

### 8. `apps/server/src/server.ts`
- Import de `requireRole` agregado al import de `authMiddleware`.
- `/api/negocio`: `requireRole('ADMIN')` agregado como tercer middleware (despues de `checkAdminAccess` y `checkTenantAccess`).
- `/api/turnos`: **Fix double middleware** — eliminados `checkAdminAccess, checkTenantAccess` del mount en `server.ts` ya que `appointmentRoutes.ts` los aplica internamente via `router.use()`. Se ahorra 2 queries Mongo por request a este endpoint.

---

## Resultado del Build

```
pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build
> tsc

EXIT_CODE: 0
```

---

## Decisiones Tecnicas

1. **Orden de middlewares en arrays:** `requireRole` se coloca SIEMPRE como primer elemento del array inline de validators, ANTES de los validadores de `express-validator`. Esto garantiza que el rechazo por rol ocurra antes de ejecutar validaciones de cuerpo, reduciendo trabajo innecesario.

2. **`requireRole` como factory:** se usa el patrón `(...roles: AdminRole[]) => middleware` para permitir N roles de forma variadic (`requireRole('ADMIN', 'PROFESSIONAL')`), evitando sobrecarga de firmas.

3. **`isActive: true` en `checkAdminAccess`:** la correccion previene que admins desactivados (soft-deleted) pasen la capa de autenticacion. El 403 existente ahora cubre ambos casos: no existe + desactivado.

4. **Preservacion del `checkAdminAccess` redundante en `/bulk`:** conforme a la instruccion del explorer, no se elimino el `checkAdminAccess` inline de la ruta `/bulk` para evitar tocar comportamiento preexistente fuera del scope de EP-12.

5. **GET /api/productos con RECEPTIONIST bloqueado:** segun SRS §6.2, GET /api/productos es solo para ADMIN y PROFESSIONAL. Se implemento con `requireRole('ADMIN', 'PROFESSIONAL')` directamente en el handler (no como `router.use`), para no afectar las rutas de escritura que ya lo tienen individualmente.

---

## Cobertura de la tabla SRS §6.2

| Endpoint | Roles permitidos | Implementado |
|---|---|---|
| DELETE /api/clientes/:id | ADMIN | clientRoutes.ts |
| POST/PUT/DELETE /api/servicios | ADMIN | serviceRoutes.ts |
| GET /api/productos | ADMIN, PROFESSIONAL | productRoutes.ts |
| POST/PUT/DELETE /api/productos + stock/bulk | ADMIN | productRoutes.ts |
| POST /api/registros | ADMIN, PROFESSIONAL | serviceRecordRoutes.ts |
| POST/PUT/DELETE /api/profesionales | ADMIN | professionalRoutes.ts |
| TODO /api/negocio | ADMIN | server.ts |
