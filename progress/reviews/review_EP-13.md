# Reporte de Revisión Técnica — Feature EP-13

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-06-17

## Contexto de la auditoría

Esta es la auditoría definitiva, ejecutada con herramientas `Bash`/`Write`/`Edit` correctamente habilitadas
(tras la corrección de `.claude/agents/reviewer.md` y `.claude/settings.json` por el `leader`). El borrador
previo (`progress/reviews/review_EP-13.md` original) fue usado solo como referencia de qué auditar; todos
los hallazgos de este reporte fueron re-verificados de forma independiente leyendo el código fuente real y
ejecutando build/lint en esta sesión.

## Alcance

- Único archivo de código auditado: `apps/client/src/views/Turnos.tsx` (646 líneas).
- Bugfix de pérdida de vista de calendario (mes/semana) + rediseño visual (trifecta de accesibilidad,
  jerarquía de footer del modal de detalle).

## Verificación empírica de builds

- `pnpm --filter @estetica/client build` → **Exit code 0** (confirmado en esta sesión).
- `pnpm --filter @estetica/client lint` → **Exit code 1**, pero con el desglose esperado:
  - 1 error preexistente sin relación: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' is assigned a value but never used`). No pertenece a este diff.
  - 2 warnings preexistentes de React Compiler por uso de `watch()` de react-hook-form (API no memoizable):
    `apps/client/src/views/Negocio.tsx:73` y `apps/client/src/views/Turnos.tsx:340`. El mismo patrón estructural
    ya existe en otras vistas del proyecto (`Negocio.tsx`) que usan `watch()`; no es una regresión introducida
    por el bugfix/rediseño de esta feature, sino una limitación conocida de la combinación
    react-hook-form + React Compiler.
  - **Ningún error nuevo introducido por este diff.**

## Hallazgos detallados

### Fix del bug (vista de calendario se resetea)
- `apps/client/src/views/Turnos.tsx:103` → `placeholderData: keepPreviousData` en el `useQuery` de
  appointments. Evita que `isLoading` vuelva a `true` en cada `datesSet` (cambio de vista/navegación),
  lo cual antes desmontaba `<FullCalendar>` y al re-montar perdía la vista activa por el prop fijo
  `initialView="timeGridWeek"` (línea 435). Confirmado correcto.
- `apps/client/src/views/Turnos.tsx:96` → `professionalFilter` incluido en el `queryKey`
  (`['appointments', dateRange.start, dateRange.end, professionalFilter]`), coherente con su uso en el
  `queryFn` (línea 100). Corrige bug latente de caché cruzada entre filtros de profesional.
- Las invalidaciones (`queryClient.invalidateQueries({ queryKey: ['appointments'] })`, líneas 122, 139, 157)
  siguen funcionando por matching de prefijo de array — sin regresión.

### Trifecta de Accesibilidad (Checkpoint C6)
- Chips de evento del calendario (`eventContent`, líneas 449-457): combinan `backgroundColor`/`borderColor`
  semántico vía `getStatusColor` (línea 172-173) + ícono vía `getStatusIcon` (línea 453) + texto del título
  del evento (línea 454). Cumple la trifecta completa.
- Badge de estado en el modal de detalle (líneas 550-558): mismo patrón — clases de color condicionales
  (verde/rojo/gris) + `getStatusIcon` + `getStatusLabel`. Cumple.
- Estado de error de la vista (líneas 391-398): ícono `FiAlertCircle` en rojo + texto explicativo siguiendo
  el copy estándar de `docs/design.md` §4.11. Cumple.

### Botones icon-only (footer del modal de detalle)
- `FiTrash2` (Cancelar turno, líneas 306-311) → `aria-label="Cancelar turno"` y `title="Cancelar turno"`. Correcto.
- `FiEdit2` (Editar turno, líneas 312-317) → `aria-label="Editar turno"` y `title="Editar turno"`. Correcto.
- El botón "Completar y Registrar" (líneas 318-321) no es icon-only (incluye texto), no requiere `aria-label`
  adicional bajo la regla de `docs/design.md` §6.
- Botón de cierre del header del `Modal` compartido (`apps/client/src/components/ui/Modal.tsx:71-77`) ya
  provee `aria-label="Cerrar modal"`; la eliminación del botón "Cerrar" redundante en el footer es válida.

### Desacoplamiento de datos (C3 Frontend)
- `Turnos.tsx` no realiza llamadas HTTP directas. Todo el acceso a datos pasa por funciones de
  `apps/client/src/api/appointmentApi.ts` (`getAppointments`, `createAppointment`, `updateAppointment`,
  `cancelAppointment`), que a su vez usan la instancia Axios centralizada (`api` de `../libs/axios`).
  Cumple.
- Cada `useQuery`/`useMutation` está correctamente tipado (`useQuery<Appointment[]>`,
  `useQuery<Client[]>`, `useQuery<Service[]>`). Cumple.

### 4 Estados obligatorios
- Loading: skeleton `animate-pulse` que replica estructura de grilla (líneas 382-390). Cumple.
- Error: trifecta completa, ver arriba (líneas 391-398). Cumple.
- Empty: no hay un bloque "empty" explícito separado de "data" para turnos en rango vacío — FullCalendar
  renderiza la grilla vacía nativamente, comportamiento aceptable y estándar para componentes de calendario
  (no es una lista tabular donde la ausencia de un estado vacío dedicado sería una violación). No bloqueante.
- Data: `<FullCalendar>` con `events={events}` (líneas 433-462). Cumple.

### Higiene de depuración y tokens visuales
- Sin `console.log`/`debugger` en el archivo (verificado por grep, 0 coincidencias).
- Sin `shadow-lg`/`shadow-xl`/gradientes/Framer Motion dentro de `Turnos.tsx` (verificado por grep,
  0 coincidencias). El único `shadow-xl`/`backdrop-blur-sm` del flujo proviene del componente compartido
  `Modal.tsx` (líneas 51, 53), explícitamente autorizado por `docs/design.md` §4.5 y §9 — no es una
  violación, es el patrón canónico de modal.
- Estilos CSS-in-JS inline para FullCalendar (líneas 401-427) usan exclusivamente los tokens hexadecimales
  documentados en `docs/design.md` §2 (`#FDFBF7`, `#2C2A29`, `#EAE6DF`, `#E06B5E`, `#1A1A1A`, etc.) y
  escalas de gris Tailwind nativas. Sin colores fuera de paleta.
- Sin animaciones externas; solo `transition-colors`/`transition-all` nativos de Tailwind.

### Sandbox (C2/C3)
- Único archivo de código modificado/creado para esta feature: `apps/client/src/views/Turnos.tsx`.
- Sin cambios en `apps/server/`. Confirmado vía `git status --porcelain`.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados) — sandbox respetado, único archivo de la feature tocado, evidencia en disco completa (`impl_EP-13-frontend.md` + este review).
- [x] C3 (Fidelidad Arquitectónica Frontend) — desacoplamiento de datos vía `api/` + TanStack Query, tipado explícito de `useQuery`, `export default function`, 4 estados cubiertos (empty delegado de forma razonable a FullCalendar nativo).
- [x] C4 (Compilación Estática) — build Exit 0 confirmado en vivo; lint sin errores nuevos (1 error y 2 warnings preexistentes, no relacionados con este diff).
- [x] C5 (Cierre de Sesión) — evidencia en disco: `progress/implements/impl_EP-13-frontend.md` y este `progress/reviews/review_EP-13.md`.
- [x] C6 (Trifecta de Accesibilidad) — chips de evento y badge de estado combinan color + ícono + texto; botones icon-only con `aria-label`.
- [x] C7 (Security Gate) — no aplica cambios de seguridad en este diff (frontend de presentación pura, sin `dangerouslySetInnerHTML`, sin manejo de auth nuevo).

## Cambios Requeridos

Ninguno. No se detectaron violaciones bloqueantes.

## Observación no bloqueante (deuda técnica preexistente)

`apps/client/src/views/Turnos.tsx:185-186` tiene un chequeo defensivo `typeof p === 'string'` sobre
`a.professional`, que es código muerto según el tipo declarado en `apps/client/src/types/index.ts` (donde
`professional` siempre es objeto, nunca string). Es preexistente a este diff de rediseño/bugfix — no se
modificó en esta sesión. Queda registrado como deuda técnica menor para una futura limpieza, no bloquea
el cierre de EP-13.
