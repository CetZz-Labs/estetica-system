# Implementación — UX-18 (Rediseño visual del calendario de turnos — vista por profesional)

**Sandbox:** `apps/client/` (frontend). Sin cambios en `apps/server/`.
**Alcance ejecutado:** el confirmado en `feature_list.json` (2026-07-07) — SIN reemplazo del FullCalendar existente, SIN plugin `@fullcalendar/resource*` (licencia Premium descartada por el usuario). Solución: franja/leyenda de profesionales + colores sólidos con contraste dinámico + tooltip al hover, sobre el FullCalendar ya existente (EP-13/EP-14).

## Archivos tocados

- **Nuevo** `apps/client/src/utils/contrastColor.ts` — utilidad pura (`getContrastTextColor(hexColor: string): string`), sin JSX ni dependencias de React.
- **Modificado** `apps/client/src/views/Turnos.tsx`:
  - Import de `Tooltip` y su CSS de `react-tooltip`, y de `getContrastTextColor`.
  - Eliminada la función local `hexToRgba` (quedó sin uso al pasar a color sólido).
  - Nueva función pura `getProfessionalInitials(name: string): string` (split por espacios; fallback a las 2 primeras letras si el nombre es una sola palabra).
  - `events` (`useMemo`): `backgroundColor`/`borderColor` ahora usan `professionalColor` sólido (antes `hexToRgba(professionalColor, 0.13)`); `textColor` se calcula con `getContrastTextColor(professionalColor)` cuando hay profesional, o la paleta de estado como antes si no la hay.
  - `eventContent`: se removió el "dot" de color de profesional (redundante ahora que el fondo entero es ese color — quedaba invisible sobre sí mismo) y se dejó el ícono de estado (`getStatusIcon`) **siempre visible** en las 3 vistas (antes solo aparecía cuando NO había profesional asignado), para sostener la trifecta (color sólido + ícono + texto) en todos los casos.
  - Nuevo handler `handleEventDidMount` (prop `eventDidMount` de FullCalendar) que setea `data-tooltip-id="appointment-tooltip"` y `data-tooltip-content="<cliente> · <servicio|'Sin servicio'> · <hora>"` sobre el elemento DOM de cada evento.
  - Nuevo bloque JSX (franja/leyenda de profesionales) insertado entre el filtro de profesional existente y el contenedor del calendario: `flex flex-wrap` con scroll horizontal en mobile (`overflow-x-auto`), un avatar circular de iniciales por profesional (`backgroundColor: p.color`, texto con `getContrastTextColor(p.color)`, `rounded-full`, `shadow-sm`, sin gradientes) + su nombre. Visible si hay al menos 1 profesional activo (no depende del filtro, que solo aparece con >1).
  - Un único `<Tooltip id="appointment-tooltip" />` de `react-tooltip`, renderizado una vez, con clases Tailwind (`!bg-maison-primary !text-white !text-xs !rounded-lg !py-1.5 !px-3`) para alinear su estilo al sistema de diseño.
  - CSS inline del calendario: se eliminó la regla ya sin uso `.appointment-event-content .event-prof-dot`.
- **Modificado** `apps/client/package.json` — nueva dependencia `"react-tooltip": "^6.0.8"` (MIT, aprobada explícitamente por el usuario para esta feature).
- **Modificado** `pnpm-lock.yaml` — regenerado por `pnpm install --no-frozen-lockfile` tras agregar `react-tooltip`.

No se tocó `dateClick`, `eventClick`, `eventDrop`, `businessHours`, `eventOverlap`, ni las 3 vistas (`dayGridMonth`/`timeGridWeek`/`timeGridDay`) — únicamente se agregó la prop `eventDidMount` (nueva, no pisa ninguna existente).

## Decisiones técnicas

- **Fórmula de contraste elegida (`contrastColor.ts`):** brillo percibido YIQ `(R*299 + G*587 + B*114) / 1000`, umbral `128` (guía histórica W3C AERT — https://www.w3.org/TR/AERT/#color-contrast). Se prefirió sobre la luminancia relativa WCAG 2.1 completa (que exige corrección gamma por canal antes de ponderar) porque acá solo hace falta decidir entre dos colores de texto fijos (`#FFFFFF` o `maison-text` `#2C2A29`), no calcular un ratio de contraste exacto — la fórmula simple es suficiente y más legible.
- **Trifecta de accesibilidad:** color sólido del profesional (semántico/identificador) + ícono de estado `getStatusIcon` (ahora siempre presente, antes condicional) + texto (hora/cliente/servicio) simultáneos en todas las vistas del calendario.
- **Tooltip vía `eventDidMount` + atributos `data-tooltip-*`:** se usó el patrón recomendado por `react-tooltip` v6 (un único `<Tooltip id="...">` global, cualquier elemento con `data-tooltip-id` + `data-tooltip-content` matcheado dispara el tooltip) en vez de `anchorSelect`/`render` — más simple y no requiere lógica adicional de lookup por clase CSS. El contenido se pasa como texto plano (no HTML), sin riesgo de inyección aunque el nombre del cliente/servicio sea input de usuario.
- **Legend de profesionales:** iniciales calculadas con una función nueva `getProfessionalInitials` porque `Professional.name` es un campo único (a diferencia de `Client.firstName`/`lastName`), replicando el patrón de avatar existente (`rounded-full`, `shadow-sm`, `font-serif`) pero con `backgroundColor: professional.color` en vez del fondo neutro `bg-maison-bg` usado en `Clients.tsx`/`Dashboard.tsx`/`ProfileClient.tsx`.
- **Responsive:** solo clases Tailwind (`flex-wrap`, `overflow-x-auto`, `gap-x-4 gap-y-2`), sin hooks de JS para media queries, siguiendo la convención del proyecto.
- **Eliminación del "dot" de profesional en `eventContent`:** quedó visualmente inútil (mismo color que el fondo del bloque, invisible) al pasar de fondo pastel a fondo sólido; se removió junto con la regla CSS `.event-prof-dot` asociada, sin afectar ninguna otra funcionalidad.

## Resultado de build/lint

```
pnpm --filter @estetica/client build
```
→ Exit code 0 (`tsc -b && vite build` completó sin errores; el único warning es el pre-existente de chunk size >500kB, no relacionado).

```
pnpm --filter @estetica/client lint
```
→ Exit code 1, pero **sin errores/warnings nuevos**:
- 1 error preexistente y ya documentado: `ProductoModal.tsx:37` (`'stock' is assigned a value but never used`), no tocado por esta feature.
- 4 warnings preexistentes del React Compiler ("incompatible library" por `watch()` de `react-hook-form`) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx` — este último ya existía antes de mis cambios (mismo `watch('date')` de siempre, solo desplazado de línea por el código agregado antes). No se introdujo ningún warning/error nuevo en `contrastColor.ts` ni en el resto de `Turnos.tsx`.

## Verificación de criterios de aceptación (`feature_list.json`, id `UX-18`)

1. **"Se muestra una franja/leyenda con la lista de profesionales activos, cada uno con su avatar/inicial y color identificador, visible junto al calendario"** → Cumplido. Nuevo bloque en `Turnos.tsx` entre el filtro y el calendario, iterando `professionalsData` (ya `isActive` por defecto vía `getProfessionals()`), avatar de iniciales con `backgroundColor: p.color` + nombre.
2. **"Los bloques de turno usan colores sólidos del profesional (no washed-out) como fondo, con color de texto calculado dinámicamente para mantener contraste WCAG, preservando la trifecta de accesibilidad (color + ícono + texto)"** → Cumplido. `backgroundColor: professionalColor || palette.bg` (sin `hexToRgba`), `textColor: getContrastTextColor(professionalColor)`, ícono de estado siempre visible junto al texto de hora/cliente/servicio.
3. **"Al hacer hover sobre un turno se muestra un tooltip con cliente, servicio y horario"** → Cumplido. `eventDidMount` + `react-tooltip` (`<cliente> · <servicio> · <hora>`).
4. **"El drag&drop y el resto de la funcionalidad de las vistas día/semana/mes existentes (EP-13) NO se modifican ni se rompen"** → Cumplido. `eventDrop`, `dateClick`, `eventClick`, `eventOverlap`, `businessHours` y las 3 vistas quedaron intactas; solo se agregó la prop nueva `eventDidMount`.
5. **"La vista se mantiene responsive"** → Cumplido. Leyenda con `flex-wrap` + `overflow-x-auto` (scroll horizontal en mobile si hay muchos profesionales), sin alterar el responsive ya existente del calendario/formularios.

## Estado

`feature_list.json` sigue en `"in_progress"` — no se modificó el estado, queda a cargo del `reviewer`.

## Fix post-implementación — Bug de stacking del tooltip (2026-07-07)

**Bug reportado por el usuario:** al probar la feature, el tooltip de hover sobre los turnos del calendario SÍ aparecía, pero quedaba **detrás de otro elemento** (problema de capas/z-index/stacking context), tapado visualmente.

**Causa raíz confirmada:** el `<Tooltip id="appointment-tooltip">` de `react-tooltip` se renderizaba inline en el árbol de React (sin portal), dentro del flujo normal del documento. Con `positionStrategy` por defecto (`'absolute'`) y sin portal a `document.body`, su posicionamiento quedaba sujeto al contexto de apilamiento local del layout del calendario (FullCalendar genera sus propios stacking contexts internos), pintándose detrás de otros elementos en vez de flotar por encima de todo.

**Fix aplicado:** se agregaron dos props al `<Tooltip>` existente en `Turnos.tsx` (línea ~576), sin tocar ningún otro archivo ni ninguna otra parte de la feature:

```tsx
<Tooltip
    id="appointment-tooltip"
    className="!bg-maison-primary !text-white !text-xs !rounded-lg !py-1.5 !px-3"
    portalRoot={document.body}
    positionStrategy="fixed"
/>
```

- `portalRoot={document.body}`: saca el tooltip del flujo local del componente y lo renderiza directo bajo `<body>`, fuera de cualquier stacking context del calendario.
- `positionStrategy="fixed"`: posiciona el tooltip con coordenadas de viewport (`position: fixed`) en vez de `absolute` relativo a un ancestro posicionado, consistente con el portal a `document.body`.

Ambas props ya estaban soportadas por la versión instalada (`react-tooltip@6.0.8`) — verificado en `apps/client/node_modules/react-tooltip/dist/react-tooltip.d.ts` (`ITooltipController.portalRoot?: Element | null`, `ITooltipController.positionStrategy?: 'absolute' | 'fixed'`). No fue necesario instalar ninguna dependencia nueva.

**Resultado de build:**
```
pnpm --filter @estetica/client build
```
→ Exit code 0 (`tsc -b && vite build` completó sin errores; único warning preexistente de chunk size >500kB, no relacionado).

`feature_list.json` sigue en `"in_progress"` — no se modificó el estado, queda a cargo del `reviewer`.

## Fix post-review — Formateo de hora duplicado en `handleEventDidMount` (2026-07-07)

**Observación del reviewer (`progress/reviews/review_UX-18.md`):** en `handleEventDidMount` (línea ~273 de `Turnos.tsx`), la línea `const timeStr = new Date(appointment.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });` reimplementaba el formateo de hora en vez de delegar en el helper compartido `formatTime()` ya existente (`apps/client/src/utils/dates.ts:115-117`, mismo cuerpo exacto) — violación del gate de `.claude/rules/frontend.md` §4.

**Fix aplicado (alcance acotado a esta línea + su import):**
- Agregado `import { formatTime } from '../utils/dates';` a `Turnos.tsx` (no existía ningún import previo de `../utils/dates` en el archivo, por lo que se sumó como línea nueva de import).
- Reemplazada la línea 273: `const timeStr = formatTime(appointment.startTime);`
- Verificada la firma de `formatTime(dateString: string): string` contra el tipo real de `Appointment.startTime` (`string`, confirmado en `apps/client/src/types/index.ts:96`) — coinciden, sin necesidad de conversión adicional (`new Date(...)`).
- No se tocó la ocurrencia similar en la línea ~542 (fuera del alcance indicado) ni ningún otro archivo.

**Resultado de build:**
```
pnpm --filter @estetica/client build
```
→ Exit code 0 (`tsc -b && vite build` completó sin errores; único warning preexistente de chunk size >500kB, no relacionado).

`feature_list.json` sigue en `"in_progress"` — no se modificó el estado, queda a cargo del `reviewer`.
