# Reporte de Exploración — UX-12 (Validación de fecha/hora al crear turnos)

**Pregunta:** Diagnosticar la causa raíz de (1) por qué no se bloquea la creación de turnos con fecha/hora pasada y (2) por qué no se detecta la superposición de turnos del mismo profesional, pese a que EP-14 lo exige.
**Contexto:** UX-12 (in_progress), relacionada con EP-14 (done) y el post_ep14_hook de EP-11.
**Timestamp:** 2026-07-06

## Hallazgos

### 1. Fecha/hora pasada -- validacion inexistente (root cause directa)
1. apps/server/src/controllers/appointmentController.ts:50-127 (createAppointment): no hay ninguna comparacion de startDate/startTime contra new Date() en el backend. Solo se valida isISO8601() en la ruta (formato, no temporalidad) -- apps/server/src/routes/appointmentRoutes.ts:28.
2. apps/server/src/controllers/appointmentController.ts:177-266 (updateAppointment): mismo faltante -- startTime se acepta sin chequeo de "no anterior a ahora".
3. apps/client/src/views/Turnos.tsx:626-629: el input type=datetime-local no tiene atributo min ni validacion de react-hook-form contra la hora actual -- client-side tampoco existe ninguna barrera.
4. Conclusion: la validacion nunca se implemento, ni en backend ni en frontend.

### 2. Superposicion de turnos -- el chequeo existe pero se salta cuando no hay profesional (root cause principal)
1. apps/server/src/controllers/appointmentController.ts:81-103 (createAppointment): el query de overlap (rango startTime/endTime cruzado, filtrado por professional, tenantId, status in pending/confirmed) es matematicamente correcto como test de intervalos solapados.
2. Pero esta envuelto en un if (professionalId) (linea 82, comentario explicito en linea 81: Verificar solapamiento solo si hay profesional asignada). Si professional no viene en el body, el bloque entero se omite -- no hay ningun chequeo de superposicion para turnos sin profesional asignada.
3. apps/client/src/views/Turnos.tsx:604-622: en el formulario de creacion/edicion, el campo Profesional esta explicitamente marcado como Opcional (linea 606) y no tiene ningun valor por defecto ni auto-seleccion aunque exista una sola profesional activa en el tenant.
4. Efecto practico: en un negocio unipersonal (1 sola profesional) o cualquier flujo donde el usuario no completa el selector opcional, todos los turnos se crean con professional undefined, y por lo tanto el chequeo de superposicion nunca corre -- reproduce exactamente el bug reportado por QA.
5. El mismo patron se repite en updateAppointment (appointmentController.ts:218): la condicion (professional || startTime) && checkProfessional -- si checkProfessional es undefined, tampoco se chequea.
6. Riesgo secundario: el chequeo es check-then-act sin transaccion ni indice unico parcial -- dos requests de creacion concurrentes con el mismo profesional/horario podrian ambas pasar el findOne antes de que la primera se guarde (race condition).

### 3. Relacion con post_ep14_hook de EP-11
1. docs/migration-guides/professional-from-admin-to-ep11.md pedia cambiar appointmentController.ts para leer professional del body en vez de req.adminInfo, y agregar validacion anti-IDOR.
2. Confirmado: la migracion ya se aplico correctamente -- appointmentController.ts:58-66 valida Professional.findOne con tenantId e isActive true antes de asignar professionalId, tanto en create como en update (appointmentController.ts:187-193).
3. No hay relacion causal entre el hook de EP-11 y el bug de UX-12. El overlap check filtra correctamente por el professional del body cuando este existe; el problema es que el campo professional es opcional a nivel de negocio/UI, y el diseno original de EP-14 nunca contemplo el caso turno sin profesional asignada.

### 4. Gobernanza -- no hay patron canonico previo que se este violando
1. docs/governance-rules.md y docs/patterns-backend.md no tienen ninguna seccion sobre validacion de fecha/hora ni de solapamiento de turnos. No es violacion de un checkpoint documentado; es funcionalidad no especificada que hay que agregar y luego, si aplica, promover a docs/patterns-backend.md.

## Diagnóstico
La ausencia de bloqueo de fecha pasada es un desarrollo faltante (nunca existió, ni backend ni frontend; no es un bug de timezone como UX-14). La ausencia de bloqueo de superposición NO es un bug del algoritmo de overlap (que es correcto) sino de su condición de entrada: solo corre si hay professionalId, y como el selector de Profesional es opcional en el formulario y no se auto-selecciona aunque exista una única profesional activa, en la práctica la mayoría de los turnos se crean sin professional, saltando el chequeo por completo. La migración post_ep14_hook de EP-11 ya está aplicada y funciona correctamente cuando professional sí viaja en el body; no es la causa del bug. No existe riesgo de romper EP-15 (conversión turno a visita) ni el reminder scheduler de EP-17 si el fix se acota a createAppointment/updateAppointment, ya que ninguno de esos flujos depende de la validación de fecha/overlap (el touchup auto-creado en completeAppointment línea 352 usa Appointment.create() directo, bypaseando ambos controllers).

## Recomendación
Implementar en apps/server/src/controllers/appointmentController.ts:
1. Fecha pasada: agregar un chequeo (startDate anterior a new Date() da 400 con mensaje descriptivo) en createAppointment tras computar startDate, antes del overlap check; y equivalente en updateAppointment solo cuando startTime forma parte del body (no re-validar turnos existentes sin cambio de horario, para no romper ediciones de turnos ya pasados como cancelación/notas).
2. Superposición: decidir la regla de negocio primero (el implementer no debe asumirla): opción A, hacer professional obligatorio en el modelo de negocio para turnos (rompe compatibilidad con salones unipersonales que no lo completan); opción B (recomendada, menor impacto), correr el chequeo de overlap también cuando professionalId es undefined, comparando contra turnos que también tengan professional sin definir (mismo tenant, mismo rango horario). Cualquiera sea la opción, mantener el patrón de respuesta 409 más mensaje ya existente (no tocar el contrato de la UI, que ya maneja el 409 correctamente en Turnos.tsx líneas 162-170 y 180-187).
3. No es necesario tocar el frontend para el fix de superposición (el manejo de 409 ya es correcto); sí conviene agregar min al input datetime-local en Turnos.tsx línea 626 como refuerzo UX (no sustituye la validación server-side).

## Riesgos / efectos secundarios a considerar
- El touchup auto-creado en completeAppointment (appointmentController.ts línea 352) usa Appointment.create() directo sin pasar por createAppointment -- si el fix se coloca solo dentro del controller createAppointment, ese flujo automático seguirá sin protección.
- El chequeo de fecha pasada en updateAppointment debe limitarse a cuando startTime cambia explícitamente, para no bloquear operaciones legítimas sobre turnos ya pasados (cancelar, agregar notas, completar).
- Si se opta por la opción B de overlap (turnos sin profesional también se chequean entre sí), verificar que no rompa el escenario legítimo de un negocio con múltiples profesionales que a veces no asignan profesional a propósito -- decisión de producto a confirmar con el leader antes de asignar el fix al implementer.
