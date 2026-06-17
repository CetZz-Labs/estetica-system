# EP-15: Conversión de turno a visita registrada

## Criterios de Aceptación

### RF-048: Al marcar turno como completado, abrir flujo de registro con datos pre-completados
- ✅ Botón "Completar y Registrar" en el modal de detalle del turno (Turnos.tsx)
- ✅ Al clickear, se cierra el modal detalle y abre RegistroModal con cliente, servicio y fecha pre-completados
- ✅ Fecha del servicio = startTime del turno (no la fecha actual)

### RF-049: Profesional puede agregar insumos, notas y ajustar fecha de retoque
- ✅ RegistroModal completo con selector de productos (con stock validation), notas, y fecha de retoque
- ✅ Misma funcionalidad que RegistroModal existente reutilizada

### RF-050: Turno vinculado a la visita
- ✅ `ServiceRecord.appointment` (ObjectId ref Appointment) almacena la referencia
- ✅ Al guardar, `completeAppointment` controller crea el ServiceRecord + marca Appointment como `completed`
- ✅ Stock deduction, auto-completado de retoques pendientes, cálculo de nextTouchupDate

### RF-051: Turnos completados sin visita aparecen como pendientes en dashboard
- ✅ Endpoint `GET /api/turnos/pending-registration` devuelve appointments completados sin ServiceRecord vinculado
- ✅ Dashboard muestra alerta amber con count y link a /turnos cuando hay pendientes

## Archivos Modificados

### Backend
- `apps/server/src/models/ServiceRecord.ts` — Campo `appointment` (ObjectId ref Appointment)
- `apps/server/src/controllers/appointmentController.ts` — `completeAppointment`, `getPendingRegistration`
- `apps/server/src/routes/appointmentRoutes.ts` — `POST /:id/complete`, `GET /pending-registration`

### Frontend
- `apps/client/src/api/appointmentApi.ts` — `completeAppointment()`, `getPendingRegistration()`
- `apps/client/src/types/index.ts` — `ServiceRecord.appointment` field
- `apps/client/src/components/RegistroModal.tsx` — Props `appointmentId`, `preselectedServiceDate`; mutation usa `completeAppointment` cuando hay `appointmentId`
- `apps/client/src/views/Turnos.tsx` — State/completar flow, botón en detail footer, RegistroModal render
- `apps/client/src/views/Dashboard.tsx` — Pending registration alert banner

## Build Verification
- Server: tsc → Exit 0
- Client: tsc -b && vite build → Exit 0
