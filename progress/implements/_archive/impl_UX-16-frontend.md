# impl_UX-16-frontend — Modal de detalle clickeable en cards del Dashboard

## Alcance
Frontend-only. Extracción del modal de detalle de turno de `Turnos.tsx` a un componente
compartido de solo lectura + acciones inyectadas por props, reutilizado por un nuevo modal
en el Dashboard para la card de "Próximos turnos", y un modal nuevo de detalle de retoque
para la card de "Próximos retoques". Ambas cards raíz dejaron de ser `<div>` inertes.

## Archivos nuevos

### `apps/client/src/components/AppointmentDetail.tsx`
- `export default function AppointmentDetail({ appointment })`: contenido de solo lectura
  (badge de estado, cliente+teléfono, servicio, profesional con color, horario completo,
  notas, motivo/fecha de cancelación) + link `Link to="/clientes/:id"` ("Ir a ficha del
  cliente"). Es el JSX que antes vivía inline en `Turnos.tsx:677-757` (sin las mutaciones/
  estado de edición, tal como pidió el leader).
- `export function AppointmentDetailFooter({ appointment, onCancel, onEdit, onComplete })`:
  footer de acciones inyectado por props — cada botón (`FiTrash2` cancelar, `FiEdit2`
  editar, `FiCheck` completar) solo se renderiza si su callback correspondiente fue provisto.
  No renderiza nada si `appointment.status` es `cancelled`/`completed`. Reemplaza al
  `detailFooter` que antes era una variable JSX inline en `Turnos.tsx:327-350`.
- Ambos consumen los helpers de estado (`getStatusIcon`, `getRenderStatus`, `getStatusLabel`)
  desde el nuevo `apps/client/src/utils/appointmentStatus.tsx` (ver más abajo — necesario
  para evitar un error de lint `react-refresh/only-export-components`).

### `apps/client/src/utils/appointmentStatus.tsx`
- Funciones puras extraídas de `Turnos.tsx` (antes módulo-scope allí): `getStatusPalette`,
  `getStatusLabel`, `getStatusIcon` (retorna `ReactElement`, de ahí `.tsx`), `isOverduePending`,
  `getRenderStatus`. Se movieron a un archivo de utils (no a `AppointmentDetail.tsx`) porque
  el ESLint plugin `react-refresh` rechaza exportar funciones no-componente junto a un
  componente por defecto en el mismo archivo (`react-refresh/only-export-components`) — ver
  nota de decisión técnica abajo.
- Reexportadas/usadas tanto por `AppointmentDetail.tsx` como por `Turnos.tsx` (el calendario
  las sigue usando para pintar los eventos de FullCalendar, `events` useMemo y `eventContent`).

## Archivos modificados

### `apps/client/src/views/Turnos.tsx`
- Import de iconos reducido a `FiPlus, FiAlertCircle` (todos los demás — `FiUser`, `FiPhone`,
  `FiCalendar`, `FiClock`, `FiCheck`, `FiX`, `FiCheckCircle`, `FiAlertTriangle`, `FiEdit2`,
  `FiTrash2` — ya no se usan directamente en esta vista, solo dentro de `AppointmentDetail.tsx`
  / `appointmentStatus.tsx`).
- Eliminadas las funciones module-scope `STATUS_PALETTE`, `getStatusPalette`, `getStatusLabel`,
  `getStatusIcon`, `isOverduePending`, `getRenderStatus` (movidas a `utils/appointmentStatus.tsx`,
  reimportadas).
- Eliminada la función local `formatDate` (solo se usaba en el modal de detalle, ahora vive
  como `formatFullDate` dentro de `AppointmentDetail.tsx`).
- `detailFooter` ahora delega en `<AppointmentDetailFooter appointment={selectedAppointment} onCancel={...} onEdit={...} onComplete={...} />`.
- El body del modal `isDetailModalOpen` (antes ~140 líneas de JSX inline) se reemplazó por
  `{selectedAppointment && <AppointmentDetail appointment={selectedAppointment} />}`.
- Verificado manualmente: mismas mutaciones, mismos modales (`isFormModalOpen`,
  `isCancelModalOpen`, `isRegistroModalOpen`), mismo comportamiento — solo cambió de dónde
  viene el JSX de solo-lectura y del footer.

### `apps/client/src/views/Dashboard.tsx`
- Nuevos imports: `Modal` (`components/ui/Modal`), `AppointmentDetail` + `AppointmentDetailFooter`
  (`components/AppointmentDetail`), iconos `FiTrash2, FiUser, FiClock, FiExternalLink`.
- Nuevo estado: `selectedAppointmentDetail: Appointment | null`, `selectedRetoqueDetail: ServiceRecord | null`.
- **Card "Próximos turnos"** (antes `<div>` raíz sin interactividad): el contenido
  clickeable (punto de color + cliente + servicio + horario) ahora es un
  `<button type="button" onClick={() => setSelectedAppointmentDetail(appt)}>` **hermano**
  (no ancestro) del `<div className="flex gap-1.5 shrink-0">` que contiene los botones
  rápidos `FiX`/`FiCheck` — ver nota de decisión técnica sobre anidamiento de `<button>`
  más abajo. El `<div>` exterior de la card se mantiene como contenedor de layout puro
  (sin `onClick`).
- **Card "Próximos retoques"**: mismo patrón. El `<div className="relative ml-6 group">`
  exterior (necesario para posicionar el punto del timeline `-left-11.5` y los botones
  flotantes `-right-3 -top-3`, ambos `absolute`) contiene un `<button type="button" onClick={() => setSelectedRetoqueDetail(registro)}>`
  con el contenido de la card (antes el propio `<div>` raíz), más el `<div>` de acciones
  rápidas como hermano.
- Refactor `handleCancelAppointment` → se extrajo `confirmCancelAppointment(id)` (sin evento,
  reutilizable desde el footer del modal) del que `handleCancelAppointment(e, id)` (usado por
  el botón suelto de la card) hace `e.stopPropagation()` + delega.
- `handleCompleteFromDashboard` y `handleTouchupCheck` ahora cierran explícitamente
  `setSelectedAppointmentDetail(null)` / `setSelectedRetoqueDetail(null)` al inicio (no-op si
  no había modal abierto — cubre tanto el flujo desde el botón suelto de la card como desde
  el footer del modal nuevo).
- **Modal nuevo "Detalle del Turno"**: usa `<AppointmentDetail>` + `<AppointmentDetailFooter onCancel={...} onComplete={...}>`
  (sin `onEdit` — el Dashboard no tiene edición inline de turnos, por eso ese botón no se
  renderiza, comportamiento previsto por el diseño de `AppointmentDetailFooter`). `onCancel`
  cierra el modal y dispara el mismo toast de confirmación (`sonner` con acción "Confirmar")
  que ya usaba el botón suelto.
- **Modal nuevo "Detalle del Retoque"**: JSX propio (no extraído a componente compartido —
  no hay otra vista que lo consuma hoy) mostrando cliente+teléfono, servicio, profesional
  (nombre + punto de color), fecha de retoque (`nextTouchupDate`) + fecha de visita original
  (`serviceDate`, ambas vía el helper `formatDate` ya usado en la card), productos usados
  (`productsUsed.map`, resolviendo `pu.product` como objeto poblado — ver nota del backend
  abajo — con fallback `'Producto'` si llegara como string sin poblar), notas, y el link
  "Ir a ficha del cliente". El footer (cancelar retoque / registrar visita) solo se muestra
  si `touchupStatus === 'pending'` (siempre es el caso en esta lista, pero se dejó como
  guarda defensiva). "Cancelar retoque" reutiliza el `ConfirmModal` ya existente
  (`setConfirmCancelId` + cierre del modal de detalle, mismo patrón que `openCancelModal` en
  `Turnos.tsx`); "Registrar visita" reutiliza `handleTouchupCheck` (abre `RegistroModal`
  prefilleado).

## Backend en paralelo (ya integrado al momento de este build)
El otro implementer ya había ampliado `getUpcomingTouchups` en
`apps/server/src/controllers/serviceRecordController.ts` con
`.populate('professional', 'name color')` y `.populate('productsUsed.product', 'name')`
(confirmado vía `git diff` antes de cerrar). El frontend consume esos campos ya poblados
sin necesidad de cambios adicionales — el tipo `ServiceRecord` en `types/index.ts` ya los
declaraba.

## Decisiones técnicas / notas para el reviewer

1. **Anidamiento inválido de `<button>` (importante):** la instrucción original pedía
   "convertir la card raíz de `<div>` a `<button type="button">`", pero ambas cards
   contienen botones de acción (`FiX`/`FiCheck`) que **no pueden ser descendientes** de otro
   `<button>` — es HTML inválido y los navegadores lo "arreglan" reordenando el DOM,
   rompiendo el layout/clicks. La solución aplicada: el `<div>` raíz se mantiene como
   contenedor de layout puro (sin `onClick`, sin rol interactivo), y dentro de él el
   contenido clickeable es un `<button>` real, con los botones de acción como **hermanos**
   (no hijos) del button principal. Esto cumple el espíritu de la regla (HTML semántico,
   controles nativos, sin `div onClick`) evitando el anti-patrón de anidar controles
   interactivos. Los `stopPropagation()` en los botones de acción quedaron como estaban
   (ya no son estrictamente necesarios al no ser descendientes del `<button>` principal,
   pero se conservaron por seguridad/mínimo diff).
2. **Extracción de helpers de estado a `utils/appointmentStatus.tsx` (no a `AppointmentDetail.tsx`):**
   ESLint (`react-refresh/only-export-components`) rechaza que un archivo con un componente
   `export default` también exporte funciones sueltas no-componente. Como `getStatusPalette`/
   `getStatusIcon`/etc. son usadas también por `Turnos.tsx` fuera del modal (renderizado del
   calendario `events`/`eventContent`), se centralizaron en un archivo de utils nuevo en vez
   de duplicarlas.
3. **`AppointmentDetailFooter` como componente separado, no builder function:** se optó por
   un componente (no una función que retorna JSX) para que `onEdit` sea verdaderamente
   opcional vía prop, sin que cada consumidor tenga que replicar la lógica condicional de
   "no mostrar acciones si cancelado/completado".
4. **Modal de retoque no extraído a componente compartido:** a diferencia del de turno, hoy
   solo lo consume `Dashboard.tsx`; no se creó un archivo compartido para evitar
   sobre-ingeniería sin un segundo consumidor real.

## Verificación
```
pnpm --filter @estetica/client build   → Exit 0
pnpm --filter @estetica/client lint    → 1 error preexistente (ProductoModal.tsx:37, no relacionado), 0 errores nuevos
```

## Archivos tocados (resumen)
- Nuevo: `apps/client/src/components/AppointmentDetail.tsx`
- Nuevo: `apps/client/src/utils/appointmentStatus.tsx`
- Modificado: `apps/client/src/views/Turnos.tsx`
- Modificado: `apps/client/src/views/Dashboard.tsx`

## Fix post-review (CHANGES_REQUESTED)

El reviewer marcó `AppointmentDetail.tsx` por reimplementar formateo de fecha/hora ad-hoc
en vez de usar el helper compartido (`docs/frontend.md` §4), en dos puntos del bloque de
horario del turno:

1. La función local `formatFullDate` (`new Date(iso).toLocaleDateString(...)` con
   `day/month/year + hour/minute`) se eliminó. En su lugar se agregó un helper nuevo en
   `apps/client/src/utils/dates.ts`: `formatFullDateTime(dateString)`, que formatea un
   timestamp real (ISO con hora) como fecha larga + hora (`"5 de julio de 2026, 14:30"`).
   Se creó como helper nuevo (no se reutilizó `formatDateTime` existente) porque ese helper
   da fecha **corta** (`día mes-abreviado`), y acá se necesita fecha **larga con año**
   (equivalente visual a lo que había antes) — mismo criterio que ya usa `formatCalendarDate`
   para fecha larga, pero sin forzar `timeZone: 'UTC'` porque `startTime` es un timestamp
   real (con hora), no un date-only `YYYY-MM-DD`.
2. El `toLocaleTimeString` ad-hoc de "Hasta [hora]" (`appointment.endTime`) se reemplazó por
   un segundo helper nuevo, `formatTime(dateString)`, que solo formatea la hora (`"15:15"`)
   de un timestamp real. Se separó de `formatFullDateTime` porque este segundo uso solo
   necesita la hora (la fecha ya se muestra en la línea de arriba).

Ambos helpers se agregaron a `apps/client/src/utils/dates.ts` siguiendo el mismo patrón
(`Intl.DateTimeFormat`/`toLocaleTimeString` con locale `es-AR`, `hour12: false`) que los
helpers preexistentes (`formatDateTime`, `formatCalendarDate`), con el mismo estilo de
comentario JSDoc explicando cuándo usar cada uno.

`AppointmentDetail.tsx` ahora importa `formatDateTime, formatFullDateTime, formatTime` de
`../utils/dates` (sin funciones locales de formateo). No se tocó `Turnos.tsx` ni
`Dashboard.tsx` — el cambio quedó contenido en `AppointmentDetail.tsx` + `utils/dates.ts`.

### Verificación
```
pnpm --filter @estetica/client build   → Exit 0
pnpm --filter @estetica/client lint    → 1 error preexistente (ProductoModal.tsx:37, no relacionado, ya documentado antes de este fix), 0 errores nuevos
```

### Archivos tocados en este fix
- Modificado: `apps/client/src/components/AppointmentDetail.tsx`
- Modificado: `apps/client/src/utils/dates.ts` (helpers nuevos `formatFullDateTime`, `formatTime`)
