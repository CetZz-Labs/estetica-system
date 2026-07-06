# Reporte de Exploración — UX-13

**Pregunta:** ¿Por qué el timeline de "Próximos Retoques" del dashboard oculta retoques futuros de un cliente cuando ese cliente ya tiene un retoque pendiente? ¿Es un bug de la query del dashboard o un efecto del auto-completado de EP-05?
**Contexto:** UX-13 (Fase 1, módulo Dashboard), relacionado con EP-05 (Registro de Visitas) y EP-06 (Dashboard y Próximos Retoques)
**Timestamp:** 2026-07-06

## Hallazgos

1. **`apps/server/src/controllers/serviceRecordController.ts:138-156` (`getUpcomingTouchups`)** — la query del timeline NO tiene ningún dedup por cliente: es un `find({ tenantId, touchupStatus: 'pending', nextTouchupDate: { $ne: null } }).sort({ nextTouchupDate: 1 }).limit(7)` plano. No hay `distinct`, `$group`, `$first` ni `Map` que colapse por `clientId`. Este endpoint, leído de forma aislada, sí puede devolver múltiples retoques pendientes del mismo cliente (para servicios distintos) dentro del top 7.

2. **`apps/client/src/views/Dashboard.tsx:218-254`** — el render itera `retoques?.map(...)` directamente con `key={registro._id}`, sin ningún filtrado/dedup adicional en el cliente. Confirma que el frontend tampoco es la causa.

3. **Causa raíz real — `apps/server/src/controllers/serviceRecordController.ts:62-73` (`createServiceRecord`)**:
   ```
   await ServiceRecord.updateMany(
       { tenantId, client, service, touchupStatus: 'pending' },
       { $set: { touchupStatus: 'completed' } }
   );
   ```
   Este `updateMany` se ejecuta en **cada** creación de un nuevo registro de visita y marca como `completed` **todos** los `ServiceRecord` pendientes del mismo `client`+`service`, sin ninguna restricción temporal (no compara `nextTouchupDate` contra la `serviceDate` de la nueva visita) y sin acotarse al registro más reciente/relevante. Esto significa que un retoque pendiente **futuro** (cuya fecha todavía no llegó) se auto-completa igual que uno vencido, en el momento en que se registra cualquier otra visita del mismo cliente para el mismo servicio.

4. **Lógica duplicada e idéntica en `apps/server/src/controllers/appointmentController.ts:324-333` (`completeAppointment`, flujo EP-15 turno→visita)**: mismo filtro `{ tenantId, client: appointment.client, service: effectiveService, touchupStatus: 'pending' }` sin acotar por fecha. Confirmado en `progress/history.md:252` que esta reutilización fue deliberada ("`createServiceRecord` ya tenía el `updateMany`... el cambio en el botón FiCheck aprovecha esa lógica existente"), o sea: el mismo comportamiento (y el mismo bug) está presente en ambos puntos de entrada de "registrar visita".

5. **Consecuencia sobre el escenario de QA:**
   - Escenario "mismo servicio con más de un registro con retoque pendiente" (item b del enunciado): **estructuralmente imposible de sostener hoy** — apenas se crea una nueva visita para cliente+servicio, el `updateMany` cierra TODOS los pendientes anteriores de esa combinación, sin importar si su `nextTouchupDate` ya pasó o si es futuro. No es que el timeline los "oculte": el registro pasó a `completed` antes de llegar a la query de lectura, que sí filtra correctamente por `pending`.
   - Escenario "dos servicios distintos con retoque pendiente cada uno" (item a): el filtro incluye `service` como campo de match, por lo que dos servicios distintos del mismo cliente **no se interfieren** entre sí vía este `updateMany`; y ni la query de lectura ni el render tienen dedup por cliente. Con el código actual, este sub-caso debería listarse correctamente. Es razonable que el reporte de QA haya generalizado ambos casos a partir de reproducir el (b), o que el repro real involucrara sin querer el mismo `service` en ambos registros.

## Diagnóstico

El bug no está en la query de lectura del dashboard (`getUpcomingTouchups`) ni en el render del frontend (`Dashboard.tsx`) — ambos son correctos y no deduplican por cliente. La causa raíz es el efecto colateral del auto-completado de EP-05: el `updateMany` de `createServiceRecord` (y su réplica en `completeAppointment`) cierra de forma indiscriminada **todos** los retoques `pending` de un cliente+servicio al registrar cualquier visita nueva de esa combinación, sin verificar si el retoque cerrado corresponde realmente a esta visita (por fecha) o si ya había otro retoque futuro legítimo que debía seguir pendiente. El resultado observable es "retoques futuros que desaparecen", pero el mecanismo real es "retoques futuros marcados `completed` prematuramente", no un problema de visualización.

## Recomendación

Acotar el filtro del `updateMany` en ambos puntos (`serviceRecordController.ts:62-73` y `appointmentController.ts:324-333`, idealmente extrayendo la lógica a un único helper en `src/services/` para eliminar la duplicación — ver convención de `src/services/` en `.claude/rules/backend.md §2`) para que solo cierre el retoque efectivamente superado por la nueva visita: restringir por `nextTouchupDate: { $lte: serviceDate }` (o, más preciso aún, resolver el `_id` del retoque pendiente inmediatamente anterior a la nueva `serviceDate` para ese cliente+servicio y actualizar solo ese documento) en lugar de cerrar en bloque todo lo que esté en estado `pending` para esa combinación. Esto permite que coexistan múltiples retoques pendientes del mismo cliente+servicio cuando corresponde (uno vencido/actual y otro genuinamente futuro).

## Riesgos / efectos secundarios

- **EP-05 (acceptance criteria "auto-completar retoques pendientes anteriores del mismo cliente+servicio")**: el fix debe seguir cumpliendo este criterio para el caso vencido/actual; solo se acota para NO completar los que están fechados a futuro respecto de la nueva `serviceDate`. Redactar el criterio de aceptación de forma explícita si se decide este comportamiento, para que el `reviewer` no lo marque como regresión.
- **Duplicación de lógica (`serviceRecordController.ts` y `appointmentController.ts`)**: cualquier fix debe aplicarse en ambos lugares o, mejor, extraerse a un service compartido (ver `src/services/` en `docs/architecture.md`/`backend.md §2`) para evitar que un futuro cambio corrija uno y deje el otro con el bug.
- **EP-17 (reminder scheduler)**: no depende de `touchupStatus`/`ServiceRecord` directamente (confirmado — sin matches en `apps/server/src/services/`), solo de `Appointment`. El `Appointment` de "retoque programado automáticamente" se crea en `createServiceRecord:90-109` de forma independiente al `updateMany`; el fix propuesto no debería afectar ese flujo, pero conviene que el `reviewer` verifique que el scheduler no reciba turnos duplicados si en el futuro se decide no cerrar automáticamente el retoque anterior.
- **Tests existentes**: `apps/server/src/__tests__/tenantIsolation.test.ts:173-175` cubre `/api/registros/retoques` solo para aislamiento multi-tenant, no para el escenario de múltiples retoques pendientes por cliente — el `implementer` debería agregar un test específico que reproduzca el escenario (b) del bug (dos registros del mismo cliente+servicio, uno con retoque vencido y otro con retoque futuro) para blindar contra regresiones futuras.
