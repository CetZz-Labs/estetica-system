# Reporte de Exploración — EP-11 (Profesionales agendables)

**Pregunta:** Mapear el cambio para introducir `Professional` como entidad agendable desacoplada del login, y reconciliar con el `post_ep14_hook` y la `migration-guide`.
**Contexto:** EP-11 reinterpretado por el usuario. Decisiones tomadas: (1) alcance = solo Profesionales + vínculo opcional a usuario (NO flujo de invitación Clerk completo, eso es EP-12); (2) migración = auto-crear un Professional por cada Admin referenciado y remapear appointments; (3) `ServiceRecord.professional` = requerido en nuevos, opcional en schema para legacy.
**Timestamp:** 2026-06-24

---

## Estado actual relevante

- `Appointment.professional` → hoy `ref: 'Admin'`, asignado con `req.adminInfo._id` (placeholder de EP-14). Ver `appointmentController.ts:19` y `:109` (en serviceRecordController). Overlap y filtros ya usan el campo `professional`.
- `ServiceRecord` **no** tiene campo `professional`.
- Patrón CRUD de referencia para copiar: `serviceController.ts` + `serviceRoutes.ts` + `api/serviceApi.ts` + `views/Servicios.tsx` + `components/ServicioModal.tsx`.
- Middlewares: `checkAdminAccess` + `checkTenantAccess` (inyectan `req.adminInfo` y `req.tenantId`). Montaje de rutas en `server.ts:44-54`.
- Router SPA: `apps/client/src/router.tsx`. Sidebar/nav: `apps/client/src/layouts/AppLayout.tsx`.
- Tipos frontend: `apps/client/src/types/index.ts` (`Appointment.professional` hoy `{_id, email?}`).

---

## Diseño aprobado

### Nuevo modelo `Professional` (`models/Professional.ts`)
```
tenantId: ObjectId ref Tenant, required, index
name: String, required, trim
color: String, required (hex #RRGGBB, validar con match)
isActive: Boolean, default true
linkedAdmin: ObjectId ref Admin, default null  // vínculo opcional a usuario con login
timestamps: true
```
Índices: `{ tenantId: 1, isActive: 1 }`, `{ tenantId: 1, name: 1 }`.
> Los nombres NO son únicos (dos profesionales pueden llamarse igual). No hay índice único de negocio.

### Cambios de modelo
- `Appointment.professional`: `ref: 'Admin'` → `ref: 'Professional'` (sigue `required: true`). Sin otros cambios.
- `ServiceRecord`: agregar `professional: { type: ObjectId, ref: 'Professional', index: true }` (SIN `required` en schema → legacy). Agregar al `IServiceRecord`.

### Backend — endpoints nuevos (`/api/profesionales`)
Copiar estructura de `serviceController`/`serviceRoutes`. Mux en `server.ts` igual que `/api/servicios` (con `checkAdminAccess`+`checkTenantAccess` — el router ya los aplica con `router.use`).
- `POST /` — crea (name, color, linkedAdmin opcional). Si `linkedAdmin` viene, validar que es un Admin del mismo tenant.
- `GET /` — por defecto solo activos (`{ tenantId, isActive: true }`, sort `name`). Acepta `?includeInactive=true` → devuelve todos (para la vista de gestión).
- `GET /linkable-admins` — `Admin.find({ tenantId, isActive: true }).select('email role')` para poblar el select opcional de vínculo (ruta específica, ANTES de `/:id`).
- `GET /:id`
- `PUT /:id` — whitelist `name`, `color`, `linkedAdmin`, `isActive` (permite reactivar; filtro `{_id, tenantId}` sin exigir isActive).
- `DELETE /:id` — **soft delete con guard de turnos futuros**:
  - Contar `Appointment.find({ tenantId, professional: id, isActive: true, status: {$in:['pending','confirmed']}, startTime: {$gte: new Date()} })`.
  - Si hay y el body **no** trae `confirm: true` → **409** `{ error, futureAppointments: [{_id, client, service, startTime}] }` (poblar client/service para el aviso).
  - Si `confirm: true` (o no hay futuros) → `findOneAndUpdate({_id,tenantId}, {isActive:false})`.
  - La reasignación de cada turno la hace el frontend con el `PUT /api/turnos/:id` existente (cambiando `professional`). No hace falta endpoint nuevo de reasignación.

### Backend — modificaciones
- `appointmentController.createAppointment`: leer `professional` del body (no `req.adminInfo._id`). Validar `Professional.findOne({_id: professional, tenantId, isActive:true})` → 400 si no existe/activo. Usar ese id en overlap y en el `new Appointment`.
- `appointmentController.updateAppointment`: cuando `professional` viene en body, validar pertenencia al tenant + activo.
- `appointmentController` populates: cambiar `.populate('professional', 'email')` → `.populate('professional', 'name color')` en getAppointments, getAppointmentById, getClientAppointments.
- `appointmentRoutes.ts` POST: agregar `body('professional').isMongoId()` (PUT ya lo tiene).
- `serviceRecordController.createServiceRecord`: leer `professional` del body; **requerido** (400 si falta); validar tenant+activo; guardarlo en el record; usarlo (en vez de `req.adminInfo._id`, línea 109) como `professional` del appointment de retoque auto-creado. Agregar `.populate('professional','name color')` en `getClientRecords` (historial filtrable).
- `serviceRecordRoutes.ts` POST: agregar `body('professional').isMongoId()` (requerido).
- `completeAppointment`: el touchup auto-creado ya usa `appointment.professional` (ahora Professional) — OK, sin cambios.

### Backend — script de migración (idempotente)
`apps/server/src/scripts/migrate-ep11-professionals.ts` (standalone, corre con ts-node; documentar el comando en el impl). Lógica:
1. Conectar a Mongo.
2. Para cada `Admin`: si NO existe `Professional` con `linkedAdmin == admin._id`, crear uno `{ tenantId: admin.tenantId, name: admin.email (o prefijo antes de @), color: '#9CA3AF', isActive: true, linkedAdmin: admin._id }`.
3. Para cada `Appointment` cuyo `professional` sea un `_id` de Admin, remapear a `Professional._id` correspondiente (vía linkedAdmin). Idempotente: si ya apunta a un Professional, saltar.
4. Log de resumen (creados, remapeados). NO tocar ServiceRecords legacy (quedan sin professional, aceptado).

### Frontend
- `types/index.ts`: agregar `interface Professional {_id,name,color,isActive,linkedAdmin?,createdAt,updatedAt}`. Cambiar `Appointment.professional` → `{_id,name,color}`. Agregar `professional?: {_id,name,color}` a `ServiceRecord`.
- `api/professionalApi.ts` (nuevo): `ProfessionalFormData {name; color; linkedAdmin?}`, `getProfessionals(includeInactive?)`, `getLinkableAdmins()`, `createProfessional`, `updateProfessional`, `deleteProfessional(id, confirm?)` (manejar respuesta 409 con `futureAppointments`).
- `views/Profesionales.tsx` (nuevo, mirror de `Servicios.tsx`): lista activos+inactivos con badge de estado (trifecta), swatch de color, crear/editar (modal), desactivar con **flujo de aviso de turnos futuros** (al recibir 409, mostrar modal/aviso con los turnos a reasignar y opción "Reasignar" → editar turno, o "Desactivar igualmente" → reenvía con `confirm:true`), reactivar.
- `components/ProfesionalModal.tsx` (nuevo, mirror de `ServicioModal.tsx`): react-hook-form con `name`, `color` (`<input type="color">` + swatches preset), y select opcional "Vincular a usuario (opcional)" poblado con `getLinkableAdmins()`.
- `views/Turnos.tsx` (modificar): selector de profesional (activos) en form de crear/editar turno; el filtro por profesional del calendario debe listar nombres/colores reales (no emails de appointments).
- `api/appointmentApi.ts` (modificar): agregar `professional: string` a `AppointmentFormData`.
- `components/RegistroModal.tsx` (modificar): selector de profesional (activos), requerido, en el form de visita.
- `api/serviceRecordApi.ts` (modificar): agregar `professional: string` al payload de creación.
- `views/ProfileClient.tsx` (modificar): mostrar la profesional en cada visita del historial (nombre + dot de color).
- `router.tsx` + `layouts/AppLayout.tsx`: agregar ruta y entrada de sidebar "Profesionales" (separada de cualquier "Usuarios").

---

## Diagnóstico

Cambio transversal (modelos core + dos sandboxes) → estrategia **Media/Compleja** del Review Debt: backend primero (define contratos), luego frontend. Riesgo principal: la migración de `Appointment.professional` (Admin→Professional) sobre datos existentes — mitigado con el script idempotente. El campo `professional` en visitas nuevas pasa a requerido; legacy queda opcional.

## Recomendación para el Leader

Delegar en 2 implementers secuenciales (`impl_EP-11-backend.md` → build → `impl_EP-11-frontend.md` → build), luego 1 `reviewer` (`review_EP-11.md`). Mantener `professional` del body validado contra tenant+activo en los 3 puntos de creación (turno, visita, update de turno).
