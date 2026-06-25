# Bitácora de Implementación — EP-11 Backend (Profesionales agendables)

**Feature:** EP-11 — Gestión de Profesionales agendables
**Sandbox:** `apps/server/` (NO se tocó `apps/client/` ni config del monorepo)
**Fecha:** 2026-06-24
**Build:** `pnpm --filter @estetica/server build` → **Exit Code 0** (ver §Build)

---

## Plan de acción ejecutado
- Nuevo modelo `Professional` (tenant-scoped, color hex validado, vínculo opcional a Admin).
- Repunte de refs: `Appointment.professional` y nuevo `ServiceRecord.professional` → `ref: 'Professional'`.
- CRUD `/api/profesionales` (copia 1:1 de `serviceController`/`serviceRoutes`) + guard de turnos futuros en delete.
- Repunte de los 3 puntos de creación que asignaban profesional: createAppointment, updateAppointment, createServiceRecord (leen del body y validan tenant+activo).
- Script de migración idempotente (Admin→Professional + remapeo de turnos).

---

## Archivos creados
| Archivo | Rol |
| --- | --- |
| `apps/server/src/models/Professional.ts` | Modelo Mongoose. Campos: `tenantId`(ref Tenant, req, index), `name`(req trim), `color`(req, `match /^#[0-9A-Fa-f]{6}$/`), `isActive`(def true), `linkedAdmin`(ref Admin, def null). `timestamps`. Índices `{tenantId,isActive}` y `{tenantId,name}`. Nombres NO únicos. |
| `apps/server/src/controllers/professionalController.ts` | CRUD + `getLinkableAdmins` + delete con guard de turnos futuros. |
| `apps/server/src/routes/professionalRoutes.ts` | Router con `checkAdminAccess`+`checkTenantAccess` vía `router.use`. `/linkable-admins` declarada ANTES de `/:id`. |
| `apps/server/src/scripts/migrate-ep11-professionals.ts` | Script standalone idempotente (ver §Migración). |

## Archivos modificados
| Archivo | Cambio |
| --- | --- |
| `apps/server/src/models/Appointment.ts` | `professional` `ref:'Admin'` → `ref:'Professional'` (sigue `required`). |
| `apps/server/src/models/ServiceRecord.ts` | + `professional: { ref:'Professional', index:true }` (SIN required, legacy) en schema e `IServiceRecord`. |
| `apps/server/src/controllers/appointmentController.ts` | import `Professional`; `createAppointment` lee `professional` del body (eliminado placeholder `req.adminInfo._id`) y valida `findOne({_id,tenantId,isActive:true})`→400; `updateAppointment` valida professional del body cuando viene→400; populates `'professional','email'`→`'professional','name color'` (×3: get/getById/getClient). |
| `apps/server/src/routes/appointmentRoutes.ts` | POST: + `body('professional').isMongoId()` (PUT ya lo tenía). |
| `apps/server/src/controllers/serviceRecordController.ts` | import `Professional`; `createServiceRecord` lee `professional` del body, REQUERIDO (400 si falta), valida tenant+activo (400), lo guarda en el record y lo usa en el appointment de retoque auto-creado (eliminado `req.adminInfo._id`); + `.populate('professional','name color')` en `getClientRecords`. |
| `apps/server/src/routes/serviceRecordRoutes.ts` | POST: + `body('professional').isMongoId()` requerido. |
| `apps/server/src/server.ts` | import + `app.use('/api/profesionales', professionalRoutes)` (debajo de `/api/servicios`). |

---

## Contratos de endpoints nuevos (`/api/profesionales`)
Todos protegidos por `checkAdminAccess` + `checkTenantAccess`. Multi-tenant: todo query filtra por `req.tenantId`; cross-tenant → 404.

| Método | Ruta | Body / Query | Respuesta |
| --- | --- | --- | --- |
| POST | `/` | `{ name (req), color (req, #RRGGBB), linkedAdmin? }` — si `linkedAdmin` viene, debe ser Admin del tenant (400 si no). | 201 Professional |
| GET | `/` | `?includeInactive=true` → todos; por defecto solo activos. sort `name`. | 200 `Professional[]` |
| GET | `/linkable-admins` | — | 200 `[{_id, email, role}]` (`Admin.find({tenantId,isActive:true}).select('email role')`) |
| GET | `/:id` | — | 200 Professional / 404 |
| PUT | `/:id` | whitelist `{ name?, color?, linkedAdmin?, isActive? }`. Filtro `{_id,tenantId}` (sin exigir isActive → permite reactivar). | 200 Professional / 404 |
| DELETE | `/:id` | `{ confirm?: true }` | Ver guard ↓ |

### Guard de turnos futuros en DELETE
- Cuenta `Appointment.find({ tenantId, professional:id, isActive:true, status:{$in:['pending','confirmed']}, startTime:{$gte:now} })`.
- Si hay turnos futuros y `confirm !== true` → **409** `{ error, futureAppointments: [{_id, client, service, startTime}] }` (client/service poblados con nombre).
- Si `confirm === true` o no hay futuros → soft delete `isActive=false` → 200.
- La reasignación de cada turno la hace el frontend vía `PUT /api/turnos/:id` (cambiando `professional`). No hay endpoint nuevo de reasignación.

### Cambios de contrato en endpoints existentes
- `POST /api/turnos`: ahora **requiere** `professional` (MongoId, validado contra tenant+activo).
- `PUT /api/turnos/:id`: si `professional` viene, se valida (400 si inválido/inactivo).
- Populates de turnos devuelven `professional` como `{_id, name, color}` (antes `{_id, email}`).
- `POST /api/registros`: ahora **requiere** `professional` (MongoId). Se persiste en el record y se propaga al turno de retoque auto-creado.
- `GET /api/registros/cliente/:clientId`: cada record incluye `professional` poblado `{_id, name, color}`.

---

## Migración (NO ejecutada — sin garantía de DB conectada)
**Archivo:** `apps/server/src/scripts/migrate-ep11-professionals.ts`

**Comando exacto (desde la raíz del monorepo):**
```
pnpm --filter @estetica/server exec ts-node src/scripts/migrate-ep11-professionals.ts
```
o desde `apps/server/`:
```
pnpm exec ts-node src/scripts/migrate-ep11-professionals.ts
```
Requiere `DATABASE_URL` en `apps/server/.env` (el script llama a `process.loadEnvFile()`).

**Lógica idempotente:**
1. Por cada `Admin` sin `Professional` vinculado → crea uno `{ tenantId: admin.tenantId, name: admin.email.split('@')[0], color:'#9CA3AF', isActive:true, linkedAdmin: admin._id }`.
2. Por cada `Appointment` cuyo `professional` aún NO sea un `Professional._id` válido pero SÍ un `Admin._id` mapeable (vía `linkedAdmin`) → remapea. Si ya apunta a un Professional, salta (idempotente). Si no es mapeable, log de warning sin tocar.
3. Log de resumen (creados / remapeados). NO toca ServiceRecords legacy.

---

## Build
```
> @estetica/server@1.0.0 build
> tsc
EXIT_CODE=0
```

---

## Notas / decisiones aplicadas
- `ServiceRecord.professional` opcional en schema (legacy) pero requerido en `createServiceRecord` (400 si falta) — según decisión 3.
- Verificado: no quedan referencias `professional: req.adminInfo` en `src/`.
- NO se instalaron dependencias. NO se modificó `apps/client/`.
- `feature_list.json` NO fue modificado (cierre lo hace el reviewer).
