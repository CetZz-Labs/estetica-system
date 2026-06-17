# Review EP-14 — Crear y gestionar turnos

## Veredicto: VERDE
*6 errores `no-explicit-any` corregidos (tipados con `AxiosError`, `DatesSetArg`, `DateSelectArg`, `EventClickArg`, `EventDropArg`). Único lint restante es preexistente en `ProductoModal.tsx:37` (no tocado por EP-14).*

## Checkpoints Auditados

### C2 — Coherencia de Estados
- [x] Solo EP-14 figura como `in_progress` en feature_list.json
- [x] Implementation evidence files existen: `impl_EP-14-backend.md` + `impl_EP-14-frontend.md`
- [x] progress/current.md describe única y exclusivamente EP-14
- [x] Modificaciones confinadas a `apps/server/` y `apps/client/`

### C3 — Backend (Express + Mongoose)
- [x] Appointment.ts en `models/` (PascalCase, interfaz `IAppointment extends Document`)
- [x] Controller usa try/catch con códigos HTTP adecuados (400, 404, 409, 500)
- [x] Routes usan `checkAdminAccess` + `checkTenantAccess` (vía `router.use`)
- [x] Routes usan `express-validator` con `validateRequest` en POST, PUT, PATCH, GET params
- [x] Anti mass-assignment: `updateAppointment` usa `$set` whitelist (no pasa req.body directo)
- [x] Soft delete: appointments tienen `isActive: Boolean` con filtro en todas las queries
- [ ] `console.error()` presente en todos los catch blocks — aceptable por patrón establecido en `docs/conventions.md` pero idealmente usar logger

### C3 — Frontend (React + Vite)
- [x] API functions en `src/api/appointmentApi.ts` usando instancia axios centralizada (`src/libs/axios.ts`)
- [x] View usa TanStack Query: `useQuery` para datos, `useMutation` para crear/actualizar/cancelar
- [x] Cubre 4 estados: Loading (skeleton animate-pulse), Error (FiAlertCircle + text + descripción), Empty (FiCalendar + texto), Data (FullCalendar)
- [x] Usa componente `Modal` compartido (`src/components/ui/Modal.tsx`)
- [x] Usa tokens de diseño Maison (`bg-maison-card`, `text-maison-text`, `maison-primary`, etc.)
- [x] `export default function Turnos()`
- [x] `handleApiError` para mostrar errores via Sonner `toast.error()`
- [x] Tipado TypeScript: `useQuery<Appointment[]>`, interfaces para form data
- [x] Sin `console.log()`, `debugger` o `// TODO` sin ticket en frontend
- [x] Sin `any` — corregido: tipado con `AxiosError`, `DatesSetArg`, `DateSelectArg`, `EventClickArg`, `EventDropArg`

### C4 — Compilación
- [x] Server build → Exit Code 0
- [x] Client build → Exit Code 0
- [x] Client lint → **Exit Code 1** (solo error preexistente en `ProductoModal.tsx:37` — no introducido por EP-14)

### C6 — Modelos Mongoose
- [x] Modelo en `apps/server/src/models/Appointment.ts` (PascalCase)
- [x] Interfaz `IAppointment extends Document`
- [x] `timestamps: true`
- [x] `tenantId` con `index: true` y ref a Tenant
- [x] Refs a Client, Service, Admin (professional, createdBy, cancelledBy) con ObjectId + ref
- [x] 3 índices compuestos: (tenantId, startTime, status), (tenantId, client, startTime), (tenantId, professional, startTime, status)
- [x] Actualización de `docs/db-schema.md` con colección appointments, índices y diagrama de relaciones

### C7 — Security Gate
- [x] Todas las rutas protegidas con `checkAdminAccess` + `checkTenantAccess`
- [x] express-validator en POST (`body('client').isMongoId()`, etc.) y PUT (validaciones opcionales)
- [x] GET queries sanitizadas con express-validator
- [x] No hay `dangerouslySetInnerHTML` en frontend

## Observaciones

1. **Corregido post-review:** Los 6 `no-explicit-any` fueron tipados con `AxiosError` (axios), `DatesSetArg`, `DateSelectArg`, `EventClickArg` y `EventDropArg` (`@fullcalendar/core`). El único error de lint restante es preexistente en `ProductoModal.tsx:37` (no tocado por EP-14).

2. **No bloqueante (C3 Backend):** Los `console.error()` en catch blocks del controller son el patrón definido en `docs/conventions.md` para backend, pero en producción deberían reemplazarse por un logger estructurado.

3. **Diseño:** El formulario de Turnos usa un campo hidden `professional` con el `user.id` actual como valor. Esto es una solución temporal correcta dado que EP-11/12 (gestión de usuarios) está pendiente.

4. **Positivo:** Solida implementación de overlap checking con respuesta 409 incluyendo datos del turno conflictivo. Uso correcto de `$set` whitelist anti mass-assignment. La documentación en `docs/db-schema.md` está completa y consistente.

## Archivos revisados

- `apps/server/src/models/Appointment.ts`
- `apps/server/src/controllers/appointmentController.ts`
- `apps/server/src/routes/appointmentRoutes.ts`
- `apps/server/src/models/Service.ts`
- `apps/server/src/server.ts`
- `apps/client/src/types/index.ts`
- `apps/client/src/api/appointmentApi.ts`
- `apps/client/src/views/Turnos.tsx`
- `apps/client/src/router.tsx`
- `apps/client/src/layouts/AppLayout.tsx`
- `docs/db-schema.md`
- `progress/implements/impl_EP-14-backend.md`
- `progress/implements/impl_EP-14-frontend.md`
- `progress/current.md`
- `feature_list.json`
- `CHECKPOINTS.md`
- `docs/conventions.md`
- `apps/client/src/components/ui/Modal.tsx`
- `apps/client/src/libs/axios.ts`
- `apps/client/src/api/errorHandler.ts`
- `apps/server/src/middlewares/validateRequest.ts`
- `apps/server/src/middlewares/authMiddleware.ts`
