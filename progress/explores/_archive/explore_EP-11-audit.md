# Reporte de Exploración — Auditoría EP-11 (Profesionales agendables)

**Pregunta:** ¿Se cumplen hoy en el código los 3 criterios de aceptación: (1) selector de profesional filtra solo activas, (2) desactivación es soft delete que preserva historial, (3) alerta de reasignación de turnos futuros antes de desactivar?
**Contexto:** EP-11 "Gestión de Profesionales agendables" (módulo Professionals), marcada `"status": "done"` en `feature_list.json:171`.
**Timestamp:** 2026-07-01

## Hallazgos

### Criterio 1 — Selector filtra solo activas

1. [apps/server/src/models/Professional.ts:7]: campo `isActive: { type: Boolean, default: true }` — no depende de `linkedAdmin`.
2. [apps/server/src/controllers/professionalController.ts:95-110]: `getProfessionals` — filtra `isActive: true` por defecto; solo incluye inactivas si `req.query.includeInactive === 'true'`.
3. [apps/client/src/api/professionalApi.ts:46-51]: `getProfessionals(includeInactive = false)` — el default es `false`.
4. [apps/client/src/views/Turnos.tsx:143-145]: el modal de creación/edición de turno llama `getProfessionals()` (sin argumento) → trae solo activas.
5. [apps/client/src/components/RegistroModal.tsx:76-78]: el modal de registro de visita llama `getProfessionals()` (sin argumento) → trae solo activas.
6. Refuerzo server-side (defensa en profundidad, no solo UI): [apps/server/src/controllers/appointmentController.ts:61] y [serviceRecordController.ts:32] — ambos controllers validan `Professional.findOne({ _id: professional, tenantId, isActive: true })` al crear el turno/visita; si la profesional no está activa, el `professionalDoc`/`foundProfessional` es `null` y la request se rechaza (400/404 según el flujo), no depende únicamente de que el frontend filtre bien.

### Criterio 2 — Soft delete y preservación de historial

1. [apps/server/src/controllers/professionalController.ts:229-230]: `deleteProfessional` NO borra el documento — hace `professional.isActive = false; await professional.save();` (soft delete real).
2. [apps/server/src/models/Appointment.ts] y [apps/server/src/models/ServiceRecord.ts:12,29]: `professional` es `Types.ObjectId` con `ref: 'Professional'` — la referencia no se toca al desactivar; los documentos históricos conservan el `professionalId` intacto.
3. [apps/server/src/controllers/appointmentController.ts:147,164,435,458] y [serviceRecordController.ts:126]: los listados históricos usan `.populate('professional', 'name color')`, que resuelve el documento referenciado sin filtrar por `isActive` — es decir, el historial sigue mostrando nombre/color de una profesional ya inactiva.
4. Cierre del loop "deja de aparecer como opción para nuevos turnos": cubierto por el mismo mecanismo del Criterio 1 (`getProfessionals()` default activa-only en frontend + guard `isActive: true` server-side al crear).

### Criterio 3 — Alerta de reasignación de turnos futuros

1. [apps/server/src/controllers/professionalController.ts:203-227]: `deleteProfessional` — si `req.body.confirm !== true`, busca `Appointment.find({ tenantId, professional: id, isActive: true, status: { $in: ['pending','confirmed'] }, startTime: { $gte: new Date() } })`; si hay resultados, responde **409** con `futureAppointments` (populate de cliente/servicio) en vez de desactivar. Solo si `confirm === true` (o no hay turnos futuros) procede a `isActive = false`.
2. [apps/client/src/api/professionalApi.ts:79-93]: `deleteProfessional(id, confirm)` — captura el 409 y relanza `ProfessionalDeleteConflict` con la lista de turnos futuros.
3. [apps/client/src/views/Profesionales.tsx:32-50]: `onError` de la mutación `deactivate` detecta `ProfessionalDeleteConflict` y setea `conflictTarget`/`conflictAppointments` para abrir el modal de aviso — **no** desactiva silenciosamente.
4. [apps/client/src/views/Profesionales.tsx:167-198]: modal "Turnos futuros asignados" — lista cada turno afectado (cliente, servicio, fecha) y ofrece dos acciones explícitas: "Volver" (cierra sin desactivar) o "Desactivar de todas formas" (`handleForceDeactivate` → `deactivate({ id, confirm: true })`). El botón "Desactivar" original (icono `FiSlash`, línea 142) llama `handleDeactivate` sin `confirm`, por lo que siempre pasa primero por el guard del backend.

Nota menor (no rompe el criterio, pero es relevante para el reviewer): [apps/server/src/controllers/professionalController.ts:141-189] `updateProfessional` (PUT) también permite `isActive: false` vía `$set.isActive` **sin** el guard de turnos futuros — solo el endpoint DELETE (`deleteProfessional`) tiene el chequeo. Hoy el frontend usa exclusivamente el flujo DELETE con `confirm` para desactivar (`Profesionales.tsx:63`) y reserva PUT solo para reactivar (`isActive: true`, línea 53) o editar nombre/color, así que el guard no se puede bypasear desde la UI actual. Pero el endpoint PUT queda abierto como vector si en el futuro algún cliente de la API (o un script) manda `PUT { isActive: false }` directamente — no hay protección server-side ahí.

## Diagnóstico

Los 3 criterios están implementados end-to-end y de forma redundante (frontend + backend), no solo maquillados en la UI: el filtrado de activas se aplica tanto en el query param por defecto del listado como en la validación de escritura de `appointmentController`/`serviceRecordController`; la baja es un soft delete genuino que no toca los `ObjectId` referenciados en historial; y el guard de turnos futuros vive en el controller (fuente de verdad) con un modal de confirmación explícito en el frontend que replica exactamente el contrato 409 del backend. El único hallazgo a señalar es que el guard de turnos futuros solo está en el endpoint `DELETE`, no en `PUT` — hoy no es explotable porque el frontend no lo usa así, pero es una asimetría de API que vale documentar.

## Recomendación

Los 3 criterios: **CUMPLEN**. No se requiere acción correctiva urgente; si se quiere cerrar el vector residual, un futuro `implementer` debería mover el guard de turnos futuros a un helper compartido invocado también desde `updateProfessional` cuando el payload incluye `isActive: false`, para que `PUT` y `DELETE` sean consistentes.

## Veredictos por criterio

1. **Selector de profesional filtra solo activas** → **CUMPLE**. Evidencia: `professionalController.ts:95-110`, `professionalApi.ts:46-51`, `Turnos.tsx:143-145`, `RegistroModal.tsx:76-78`, más doble validación server-side en `appointmentController.ts:61` y `serviceRecordController.ts:32`.
2. **Desactivación sin eliminación (soft delete) y preservación de historial** → **CUMPLE**. Evidencia: `professionalController.ts:229-230` (soft delete real), refs `ObjectId` intactas en `Appointment.ts`/`ServiceRecord.ts`, populates sin filtro `isActive` en listados históricos.
3. **Alerta de reasignación de turnos futuros** → **CUMPLE**. Evidencia: guard 409 en `professionalController.ts:203-227`, propagación tipada en `professionalApi.ts:30-43,79-93`, modal de confirmación en `Profesionales.tsx:167-198` con lista de turnos y dos acciones explícitas.
