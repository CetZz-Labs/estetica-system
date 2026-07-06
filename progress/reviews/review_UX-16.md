# Reporte de Revisión Técnica — Feature UX-16

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06

## Resumen

Refactor transversal auditado con rigor extra por tratarse de una extracción de componente compartido (`Turnos.tsx` → `AppointmentDetail.tsx`) reutilizada en `Dashboard.tsx`, más ampliación de `populate` en backend. Ambos builds (`server`, `client`) cierran en **Exit Code 0** y el lint solo reporta el error preexistente ya conocido (`ProductoModal.tsx:37`, no relacionado). La resolución del anti-patrón "`<button>` anidado dentro de `<button>`" está correctamente resuelta (botones de acción como hermanos, no hijos, del botón principal de la card — verificado en ambos paneles del Dashboard). Sin embargo, se encontraron **dos violaciones puntuales de gates documentados** que bloquean la aprobación.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — una sola feature `in_progress`/`blocked` a la vez, `progress/current.md` describe únicamente UX-16, archivos tocados pertenecen exclusivamente al alcance de la feature.
- [ ] C3 (Fidelidad Arquitectónica — Formateo de Fechas con Helper Compartido) — ver Cambio Requerido #1.
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/server build` → Exit 0. `pnpm --filter @estetica/client build` → Exit 0. `pnpm --filter @estetica/client lint` → 1 error preexistente no relacionado (`ProductoModal.tsx:37`), 0 errores nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — no aplica cierre todavía (feature bloqueada, no se cierra sesión).
- [x] C6 (Capa de Datos) — sin cambios de modelo; el `populate` agregado en `getUpcomingTouchups` usa el mismo patrón ya auditado en `getClientRecords` (mismo archivo, líneas 128-132) sobre el mismo schema (`ServiceRecord.ts:33-36`). `tenantId` intacto en el filtro.
- [x] C7 (Security Gate) — sin cambios de autenticación/autorización. Filtro `{ tenantId: req.tenantId, ... }` preservado en `getUpcomingTouchups` (`serviceRecordController.ts:145-155`). `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` en `apps/server/src/` sin matches de hardcodeo.
- [ ] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — ver Cambio Requerido #2.

## Cambios Requeridos

1. **`apps/client/src/components/AppointmentDetail.tsx:8-10` y `:82`**: reimplementación ad-hoc de formateo de fecha/hora en lugar de delegar al helper compartido.

   ```
   const formatFullDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', {
       day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
   });
   ...
   <p className="text-xs text-gray-500">Hasta {new Date(appointment.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
   ```

   `.claude/rules/frontend.md § "Formateo de Fechas: Helper Compartido Obligatorio"` es explícito: *"Gate de rechazo: cualquier `toLocaleDateString`/`toLocaleString` nuevo que no delegue en el helper compartido se rechaza, aunque compile."* `CHECKPOINTS.md` C3 repite la misma prohibición ("Prohibido reimplementar `toLocaleDateString`/`toLocaleString` ad-hoc"). El propio archivo importa `formatDateTime` (línea 5) y lo usa correctamente para `appointment.cancelledAt` (línea 100), pero para el bloque principal de horario (líneas 81-82) reimplementa el formateo a mano en dos llamadas Intl distintas (`toLocaleDateString` + `toLocaleTimeString`), produciendo una inconsistencia de formato dentro del mismo componente. Esto es código **movido, no nuevo en cuanto a lógica** (existía como `formatDate` local en `Turnos.tsx`, eliminado por el implementer — ver `git diff HEAD -- apps/client/src/views/Turnos.tsx`), pero `AppointmentDetail.tsx` **es un archivo nuevo** creado por esta misma feature, y la extracción era la oportunidad exacta para resolver el anti-patrón en vez de perpetuarlo en un componente ahora compartido por dos vistas. Corrección: delegar en `formatDateTime` (u otro helper compartido) para ambos campos, o extender el catálogo de helpers en `utils/dates.ts` si se necesita el formato largo con año — no reimplementar Intl inline.

2. **`apps/server/src/controllers/serviceRecordController.ts:150-155` (`getUpcomingTouchups`) sin entrada en `CHANGELOG.md`**: el populate ahora añadido (`.populate('professional', 'name color')`, `.populate('productsUsed.product', 'name')`) cambia la forma de la respuesta de `GET /api/registros/retoques` — los campos `professional` y `productsUsed[].product` pasan de `ObjectId` crudo a objeto poblado. `CHECKPOINTS.md` C8 exige: *"Si la feature modifica la estructura de respuesta (field renombrado, tipo cambiado, field removido), existe entrada en `CHANGELOG.md` bajo `## [Unreleased]` con descripción clara."* Existe precedente exacto en el propio `CHANGELOG.md:20` para el mismo tipo de cambio sobre el mismo modelo (`GET /api/registros/cliente/:clientId` ahora incluye `professional { _id, name, color }` poblado), documentado en su momento. El cambio equivalente sobre `GET /api/registros/retoques` en esta feature no tiene entrada correspondiente. Corrección: agregar línea en `CHANGELOG.md` bajo `## [Unreleased] → ### Changed` (o `### Added`, siguiendo el estilo de la línea 20 existente) describiendo el populate ampliado de `professional` y `productsUsed.product` en este endpoint.

## Verificación positiva (no bloqueante, para constancia)

- HTML semántico: verificado en `apps/client/src/views/Dashboard.tsx` (diff `git diff HEAD -- apps/client/src/views/Dashboard.tsx`) que ambas cards ("Próximos turnos" líneas 305-341, "Próximos retoques" líneas 233-268) mantienen el `<div>` raíz como contenedor de layout puro (sin `onClick`) y el `<button type="button" className="... cursor-pointer">` clickeable como **hermano**, no ancestro, de los botones de acción rápida (`FiX`/`FiCheck`) — no hay anidamiento inválido de `<button>`, ni `<div onClick>` como sustituto de control interactivo. Es una desviación razonable y documentada respecto al literal de los criterios de aceptación ("cards ... son `<button type=\"button\">`"), justificada por la restricción de HTML5.
- `Turnos.tsx`: comportamiento preservado — mismas mutaciones (`openCancelModal`, `openEditModal`, `handleCompleteAppointment`), mismo modal (`isDetailModalOpen`), footer delegado a `AppointmentDetailFooter` con las mismas props funcionales.
- Link "Ir a ficha del cliente" en ambos modales navega a `/clientes/:id`, ruta confirmada en `apps/client/src/router.tsx:63`.
- Backend: populate `productsUsed.product` sintácticamente correcto contra `ServiceRecord.ts:33-36` (mismo patrón ya usado en `getClientRecords`, líneas 128-132); filtro, `sort` y `limit(7)` de `getUpcomingTouchups` intactos.
- Multi-tenancy sin cambios: `{ tenantId: req.tenantId, ... }` preservado.
- Trifecta de accesibilidad: badge de estado del turno (color + icono + texto) preservado sin cambios en `AppointmentDetail.tsx:27-38`.
- Sin `console.log`/`debugger`/`TODO` en archivos nuevos o modificados.
- Sin variables sensibles hardcodeadas (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/` sin matches).

## Próximo paso
El `implementer` (frontend) debe corregir el punto 1; el `implementer` (backend, o quien corresponda) debe agregar la entrada en `CHANGELOG.md` del punto 2. `feature_list.json` se actualizó a `"status": "blocked"` para UX-16.

---

## Re-auditoría (segunda pasada) — 2026-07-06

**Veredicto Final:** APPROVED

### Verificación del Cambio Requerido #1 (helper compartido)

`apps/client/src/utils/dates.ts` incorpora dos helpers nuevos siguiendo el mismo patrón de estilo (JSDoc explicando cuándo usarlos, firma `(dateString: string): string`) que los ya existentes `formatDateTime`/`formatCalendarDate`:
- `formatFullDateTime` (líneas 100-109): fecha larga + hora, vía `Intl.DateTimeFormat` + `toLocaleTimeString` internos — correcto, es donde corresponde que viva el `Intl` ad-hoc.
- `formatTime` (líneas 115-117): solo hora.

`apps/client/src/components/AppointmentDetail.tsx` ya no reimplementa formateo: importa `formatDateTime, formatFullDateTime, formatTime` (línea 5) y los usa en los tres puntos donde antes había Intl inline — línea 77 (`formatFullDateTime(appointment.startTime)`), línea 78 (`formatTime(appointment.endTime)`), línea 96 (`formatDateTime(appointment.cancelledAt)`, sin cambios respecto a la pasada anterior). Grep de `toLocaleDateString|toLocaleTimeString|toLocaleString` sobre el archivo: 0 matches. La función local `formatFullDate` fue eliminada. Gate C3 cerrado.

### Verificación del Cambio Requerido #2 (CHANGELOG)

`CHANGELOG.md:23`, bajo `## [Unreleased] → ### Changed` (ubicación correcta, junto a las demás entradas de populate ampliado del mismo sprint): *"**UX-16**: `GET /api/registros/retoques` (`getUpcomingTouchups`) ahora popula `professional { _id, name, color }` y `productsUsed[].product { _id, name }` (antes `ObjectId` crudo), mismo patrón ya usado en `GET /api/registros/cliente/:clientId`."* Descripción precisa y consistente con el diff real del controller. Gate C8 cerrado.

### Verificación adyacente (no se tocó nada que ya estaba aprobado)

- `AppointmentDetail.tsx` sin otros cambios de estructura/JSX fuera de los imports y las 2 líneas de formateo — HTML semántico, trifecta de accesibilidad (badge líneas 24-33) y link a ficha (líneas 101-106) intactos.
- Sin cambios en `Dashboard.tsx` ni `Turnos.tsx` en este fix.

### Builds y lint (segunda pasada)

- `pnpm --filter @estetica/server build` → Exit Code 0.
- `pnpm --filter @estetica/client build` → Exit Code 0.
- `pnpm --filter @estetica/client lint` → 1 error preexistente no relacionado (`ProductoModal.tsx:37`, `'stock' is assigned a value but never used`), 4 warnings preexistentes de React Compiler (`watch()` de react-hook-form, en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — ninguno nuevo ni relacionado con archivos tocados por UX-16.

### Mapeo de Checkpoints (actualizado)
- [x] C2, [x] C3, [x] C4, [x] C5, [x] C6, [x] C7, [x] C8 — todos en verde.

`feature_list.json` actualizado: `"status"` de `UX-16` pasó de `"blocked"` a `"done"`.
