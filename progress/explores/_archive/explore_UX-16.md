# Reporte de Exploración — UX-16 (Modal de detalle en cards de turno/retoque)

**Pregunta:** Alcance actual del Dashboard para "Modal de detalle al click en card de turno/retoque" (paneles "Próximos retoques" y "Próximos turnos").
**Contexto:** UX-16 (in_progress, `feature_list.json:318-329`). UX-15 ya resolvió el detalle clickeable en el calendario (`Turnos.tsx`); este alcance es exclusivo del Dashboard.
**Timestamp:** 2026-07-06

## Hallazgos

### Panel "Próximos retoques" (`apps/client/src/views/Dashboard.tsx:217-256`)
1. [`Dashboard.tsx:223`]: la card raíz es un `<div>` sin `onClick` ni `role`; no es clickeable. Solo los dos botones flotantes (`FiX` cancelar, `FiCheck` registrar visita, líneas 236-251) son interactivos, ambos con `e.stopPropagation()`.
2. Información visible hoy: iniciales+nombre del cliente, `service.name`, pill de urgencia (`getTimelineStatus`) y `nextTouchupDate`. No se muestra: profesional, notas de la visita original, ni productos usados.
3. [`serviceRecordController.ts:141-160`] (`getUpcomingTouchups`, `GET /registros/retoques`): solo popula `client` (`firstName lastName phone`) y `service` (`name`). **No popula `professional` ni `productsUsed.product`** — llegan como ObjectId crudo. `notes`, `nextTouchupDate`, `touchupStatus` y `productsUsed` (con IDs sin resolver) sí viajan en el payload porque `.find()` no proyecta campos.
4. [`apps/client/src/types/index.ts:44-58`]: el tipo `ServiceRecord` en frontend **ya declara** `productsUsed?: UsedProduct[]` y `professional?: { _id; name; color }` — es decir, el frontend ya está preparado para recibir estos datos poblados; solo falta que el controller los popule.
5. Conceptualmente, el "retoque" NO es una entidad separada: es el mismo `ServiceRecord` de la visita original que fijó `nextTouchupDate`/`touchupStatus: 'pending'` (confirmado en `apps/server/src/models/ServiceRecord.ts:8-46`). Por lo tanto "ver qué se hizo y qué usó" en el retoque = mostrar el detalle completo de ese mismo registro (servicio, profesional, notas, productos), no requiere una query adicional al backend, solo poblar más campos en el mismo endpoint.
6. La acción "cancelar retoque" **ya existe** y funciona: `updateServiceRecord(id, { touchupStatus: 'cancelled' })` vía `PUT /registros/:id` (`Dashboard.tsx:82-90`, controller en `serviceRecordController.ts:163-178` whitelist incluye `touchupStatus`). No hace falta backend nuevo para esa acción.
7. La acción "registrar visita de retoque" también existe: `handleTouchupCheck` abre `RegistroModal` prefilleado con cliente/servicio (`Dashboard.tsx:71-78`).

### Panel "Próximos turnos" (`Dashboard.tsx:259-324`)
1. [`Dashboard.tsx:289`]: la card raíz también es un `<div>` sin interactividad propia; solo los botones `FiX` (cancelar) y `FiCheck` (completar+registrar) son clickeables (líneas 304-317), ambos con handlers que no propagan a un click de card porque la card no tiene `onClick`.
2. Información visible: color del profesional (punto), nombre del cliente, `service.name`, fecha/hora (`formatDateTime`). No se muestra teléfono del cliente ni duración del servicio ni notas, aunque la API ya los trae (ver punto siguiente).
3. [`appointmentController.ts:459-479`] (`getUpcomingAppointments`, `GET /turnos/proximos`): popula `client` (`firstName lastName phone`), `service` (`name duration`) y `professional` (`name color`) — **ya trae todo lo necesario** para el mismo detalle que usa `Turnos.tsx` (incluye `notes`, `cancelReason`, `cancelledAt` sin proyección, igual que arriba). No requiere cambios de backend.
4. El modal de detalle ya existente en `Turnos.tsx:670-758` (con footer de acciones en `detailFooter`, `Turnos.tsx:368-391`) está **acoplado a estado local de esa vista**: usa `openCancelModal`, `openEditModal`, `handleCompleteAppointment` que a su vez abren otros modales locales de `Turnos.tsx` (`isCancelModalOpen`, `isFormModalOpen`) — no es un componente exportable reusable tal cual, está todo inline en el JSX de la vista.
5. El tipo `Appointment` en frontend (`types/index.ts:91-107`) ya incluye todos los campos que el modal de `Turnos.tsx` consume (`notes`, `cancelReason`, `cancelledAt`, `professional`, `service.duration`), así que el mismo dataset del Dashboard alcanza sin cambios de tipo.

### Sistema de diseño / convenciones
6. [`.claude/rules/frontend.md` §3]: cards clickeables deben ser `<button type="button">`, nunca `<div onClick>` — aplica directo a ambas cards del Dashboard, que hoy violan esta regla al ser completamente no interactivas (ni siquiera con antipatrón `div onClick`, están planas).
7. `docs/design.md §4.5` remite al componente compartido `Modal.tsx` — ya usado por `Turnos.tsx`, `RegistroModal` y `ConfirmModal` en el propio Dashboard; el patrón a seguir es el mismo.

## Diagnóstico
Ninguna de las dos cards del Dashboard es clickeable hoy; solo tienen botones de acción puntuales con `stopPropagation`. El panel de turnos ya tiene toda la data necesaria en la API (`getUpcomingAppointments`) para replicar el mismo modal de detalle de `Turnos.tsx`, pero ese modal está implementado inline y acoplado a estado/otros modales de esa vista — no es reusable sin refactor de extracción. El panel de retoques necesita un cambio pequeño de backend (poblar `professional` y `productsUsed.product` en `getUpcomingTouchups`) porque el registro de retoque **es** la visita original con todo el detalle (servicio, notas, productos), dato que el tipo frontend ya anticipa pero el controller no completa.

## Recomendación
Alcance para UX-16 (Dashboard): (1) extraer el contenido visual del modal de detalle de turno de `Turnos.tsx` (líneas ~670-758, sin las mutaciones/estado de edición) a un componente compartido de solo-lectura + acciones inyectadas por props (cancelar/completar/ir a ficha), y reutilizarlo tanto en `Turnos.tsx` como en un nuevo modal disparado desde la card de "Próximos turnos" del Dashboard; (2) crear un modal de detalle nuevo para "Próximos retoques" que muestre servicio, profesional, notas y productos usados de la visita original (reutilizando `updateServiceRecord` para cancelar y `RegistroModal` prefilleado para registrar), tras ampliar el `populate` en `serviceRecordController.ts:150-151` (agregar `professional` y `productsUsed.product`); (3) convertir ambas cards raíz de `<div>` a `<button type="button">` con `cursor-pointer`, moviendo los botones de acción existentes dentro del modal o manteniéndolos con `stopPropagation` si se preservan como atajos rápidos.

## Riesgos / ambigüedades para el leader
- Decidir si los botones rápidos de acción sobre la card (`FiX`/`FiCheck`) se mantienen como atajo visual además del modal, o se retiran y toda acción pasa a vivir dentro del modal (impacto en UX y en diff size).
- La extracción del modal de `Turnos.tsx` a componente compartido es un cambio transversal a esa vista (no solo Dashboard) — evaluar si conviene como PR separado/previo dado el gate de "Compleja (transversal)" de la matriz de escalado.
- Confirmar con el usuario si "ir a ficha del cliente" (mencionado en criterios de aceptación) debe agregarse como acción nueva en ambos modales (hoy ningún modal existente tiene ese link, ni el de `Turnos.tsx` ni nada en Dashboard).
