# Reporte de Exploración — UX-26 (Bug: tooltip del calendario detrás de otros elementos)

**Pregunta:** Diagnosticar por qué el tooltip de hover de `react-tooltip` sobre los turnos del calendario (UX-18) sigue apareciendo detrás de otros elementos, pese al fix de portal aplicado en esa misma feature.
**Contexto:** UX-26, regresión reportada sobre UX-18 (`abeb585`)
**Timestamp:** 2026-07-08

## Hallazgos

1. **`apps/client/src/views/Turnos.tsx:577-582`** — El `<Tooltip>` ya está declarado como hermano del contenedor del calendario (fuera del `div.relative...overflow-hidden` de la línea 488) y ya usa `portalRoot={document.body}` + `positionStrategy="fixed"`. Es decir, el fix de "clipping por `overflow:hidden`" (el mismo problema que UX-24 resolvió para react-select) **ya está aplicado y funciona**. No hay ningún `z-index` en `className` ni en un `style` prop del componente — solo clases de color/tipografía/padding (`!bg-maison-primary !text-white !text-xs !rounded-lg !py-1.5 !px-3`).

2. **`apps/client/node_modules/react-tooltip/dist/react-tooltip.css:14-24`** — El wrapper posicionado del tooltip (`.core-styles-module_tooltip__3vRRp` combinado con `.core-styles-module_fixed__pcSol` cuando `positionStrategy="fixed"`) **no trae ningún `z-index` propio** (queda en `auto`). Solo el `div` de contenido interno (`.core-styles-module_content__BRKdB`, línea 34-37) tiene `z-index: 1`, pero eso solo resuelve el apilamiento *interno* del tooltip contra su propia flechita (`z-index: -1` en la línea 29), no el apilamiento global contra el resto de la página.

3. **CSS embebido de FullCalendar (bundle `@fullcalendar/core`)** — Varios elementos internos del calendario sí declaran `z-index` explícito mayor a 0/auto:
   - `.fc-scrollgrid-section-sticky>*{position:sticky;z-index:3}` → esta es la regla que aplica al **header sticky de columnas/día** en vistas semana y día (el `.fc-col-header-cell` hereda el `position:sticky;z-index:3` de su `<th>`/`<td>` contenedor de scrollgrid).
   - `.fc-event .fc-event-resizer{position:absolute;z-index:4}` → manijas de resize de eventos.
   - `.fc-event-selected:before,.fc-event:focus:before{position:absolute;z-index:3}` y `.fc-event .fc-event-main{position:relative;z-index:2}`.
   - `.fc-popover{position:absolute;z-index:9999}` (popover "+more" de vista mes, fuera del scope de esta feature pero ilustra que la propia librería usa 9999 como techo para overlays).

4. **`apps/client/src/views/Turnos.tsx:488`** — El contenedor del calendario es `<div className="relative ...">` sin `z-index` propio. Por spec CSS, `position: relative` sin `z-index` explícito **no crea un nuevo stacking context**; por lo tanto el header sticky (`z-index:3`) participa directamente en el stacking context raíz (a nivel de `document.body`), igual que el tooltip portalado con `position: fixed` y `z-index: auto`.

5. **`docs/patterns-frontend.md:463-482` (P11)** — El patrón, escrito a partir de este mismo bug en UX-18, ya documenta el gotcha exacto que se pisó: *"no alcanza con subir el `z-index`... el portal es la solución real, el `z-index` alto es un complemento necesario una vez que ya está fuera del contenedor"*. El ejemplo de react-select en el mismo `Turnos.tsx:686` sí aplica `zIndex: 9999` (`styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}`), pero el `<Tooltip>` de la línea 577 **nunca recibió ese complemento de z-index** — solo el portal.

6. **`apps/client/package.json:29`** — `react-tooltip: "^6.0.8"`. Tipos en `node_modules/react-tooltip/dist/react-tooltip.d.ts:138` confirman que el componente acepta `style?: CSSProperties`, aplicado al wrapper posicionado — es el mecanismo correcto para inyectar un `zIndex` inline.

## Diagnóstico

Por reglas de stacking de CSS, dentro del mismo contexto de apilamiento (el de `document.body`, ya que ni el `div.relative` del calendario en `Turnos.tsx:488` ni `.fc-view-harness` crean uno propio), los elementos con `z-index` positivo explícito (el header sticky con `z-index:3`, las manijas de resize con `z-index:4`) se pintan **por encima** de cualquier elemento con `z-index: auto` (capa 6 del orden de pintado), aunque este último tenga `position: fixed` y esté DOM-portado a `document.body` como último hijo. El tooltip de react-tooltip nunca fija ese `z-index`, por lo que pierde la batalla de apilamiento contra el header sticky y las manijas de evento — exactamente el comportamiento reportado ("aparece detrás en vez de flotar por encima"), sobre todo cerca de la fila de headers en vistas semana/día. El portal de UX-18 resolvió el recorte por `overflow:hidden` (causa de un síntoma distinto), pero dejó pendiente el complemento de `z-index` que el propio patrón P11 ya advertía como necesario y que sí se aplicó para el `react-select` en la misma vista.

## Recomendación

Agregar un `z-index` explícito (consistente con el precedente `zIndex: 9999` usado para `react-select` en `Turnos.tsx:686`) al `<Tooltip>` de `Turnos.tsx:577-582`, vía la prop `style` (ej. `style={{ zIndex: 9999 }}`), sin tocar `portalRoot`/`positionStrategy` que ya funcionan correctamente. No se requiere ningún ajuste en la franja de profesionales (UX-18) ni en el CSS embebido del calendario — el `div` de la franja (`Turnos.tsx:454`) no está posicionado, así que nunca compite por z-index con el tooltip; el problema es puntual y exclusivo del `<Tooltip>`.

## Preguntas abiertas

Ninguna crítica para la implementación — el fix es de una sola línea/prop. Punto menor no bloqueante: verificar visualmente que `9999` no quede por debajo del `z-index` de `Modal` (`src/components/ui/Modal.tsx`) en el caso borde de que un tooltip quedara "colgado" mientras se abre un modal (poco probable dado que el hover se cancela al abrir el modal, pero conviene que el `reviewer`/QA lo verifique en manual testing).

## Alcance sugerido

Trivial: 1 archivo (`apps/client/src/views/Turnos.tsx`), 1 línea modificada (agregar prop `style` al `<Tooltip>`). No amerita `explorer` adicional ni split de PR — 1 `implementer` frontend directo con este diagnóstico ya alcanza.
