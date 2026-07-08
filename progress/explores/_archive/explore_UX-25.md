# Reporte de Exploración — UX-25 (Agrandar dimensiones del calendario de turnos)

**Pregunta:** Diagnóstico técnico de layout/dimensiones del calendario de turnos (`Turnos.tsx`) y su contenedor, para ampliar alto y ancho de forma responsive sin romper drag&drop/tooltip/modal/estado de UX-20.
**Contexto:** UX-25 — feature nueva de backlog.
**Timestamp:** 2026-07-08

## Hallazgos

1. **`apps/client/src/views/Turnos.tsx:412`**: el contenedor raíz de la vista es `<div className="max-w-6xl mx-auto">`. Este es el mismo patrón usado en **todas** las demás vistas de negocio (`Profesionales.tsx:97`, `Servicios.tsx:42`, `Clients.tsx:30`, `Inventario.tsx:57`, `Dashboard.tsx:146` — todas con `max-w-6xl mx-auto`). No existe hoy en la app ningún patrón alternativo "full width" para vistas de contenido — sería el primer caso.

2. **`apps/client/src/views/Turnos.tsx:488`**: el card que envuelve el calendario es `<div className="relative bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden p-4">` — sin altura ni ancho explícitos propios (hereda el ancho del `max-w-6xl` padre).

3. **`apps/client/src/views/Turnos.tsx:529`**: `<FullCalendar ... contentHeight={560} ...>` — altura **fija en píxeles** (560px) para el área de contenido de la grilla (por debajo del `headerToolbar`). No se setea `height`, `aspectRatio` ni `expandRows`. Con `slotMinTime="06:00"`, `slotMaxTime="22:00"` y `slotDuration="00:30"` (32 slots), FullCalendar comprime esos 32 slots dentro de 560px fijos, lo que fuerza el scroller interno de FullCalendar en vistas semana/día — esto es la causa raíz del "scroll interno molesto" reportado.

4. **`apps/client/src/layouts/AppLayout.tsx:44`**: layout raíz `<div className="flex flex-col md:flex-row h-screen overflow-hidden ...">`. El `<main>` (línea 135) es `<main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto">` — ocupa el alto completo de viewport vía `h-screen` + `flex-1`, con padding `p-4 md:p-8`, y **scroll propio** (`overflow-y-auto`) independiente del interno de FullCalendar. Es decir: hay dos scrolls potenciales anidados (el de `<main>` y el de la grilla de FullCalendar) — algo a tener en cuenta al calcular la altura objetivo del calendario para no duplicar scrollbars.

5. **Franja de profesionales (UX-18)**: `Turnos.tsx:453-468` — el bloque de referencia de profesionales (`aria-label="Referencia de profesionales"`) está **arriba** del calendario, en flujo normal de documento (`mb-4`), antes del card del calendario (línea 488). No está fijo/sticky ni al costado. Si se agranda la altura del calendario en base a `100vh` o similar, hay que restar explícitamente la altura de: header de la página (línea 413-438), filtro de profesional (línea 440-451, condicional a `professionals.length > 1`), y esta franja (línea 453-468, condicional a `professionals.length > 0`) — ambas son de altura variable/condicional, complicando un cálculo con `calc()` fijo.

6. **UX-20 (confirmado sin residuos)**: grep de `event-quick-cancel|FiTrash2|canQuickCancel|quick-cancel|QuickCancel` sobre `Turnos.tsx` → **0 resultados**. No hay ícono de cancelación rápida sobre el bloque de turno. Correcto, sin residuos de la reversión.

7. **FullCalendar instalado**: `@fullcalendar/core`, `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`, `@fullcalendar/timegrid` — todos en `^6.1.20` (`apps/client/package.json:14-18`). Esta versión soporta `height` como número, `'auto'`, `'100%'`, o un string CSS, además de `contentHeight` (altura solo del área de grilla, sin el toolbar) y `expandRows` (boolean, fuerza que las filas se estiren para llenar la altura disponible sin scroll cuando hay pocos eventos). No soporta `aspectRatio` combinado con `height`/`contentHeight` (el último seteado gana).

8. **Sin lógica responsive dedicada en `Turnos.tsx`**: no hay hooks de `window.innerWidth`, media queries JS, ni cambio condicional de `initialView` para mobile. El único responsive existente es CSS/Tailwind (`sm:flex-row`, grids `sm:grid-cols-2`) en el header y modales. El `headerToolbar` de FullCalendar (línea 523) ya incluye los tres botones de vista (mes/semana/día) — en mobile estos botones se apilan/wrappean por el propio CSS de FullCalendar, sin JS custom.

## Diagnóstico

La causa raíz del "scroll interno molesto" es el `contentHeight={560}` fijo en `Turnos.tsx:529`, que comprime 32 slots de 30 min en un espacio insuficiente y activa el scroller nativo de FullCalendar. El ancho angosto viene del `max-w-6xl mx-auto` en `Turnos.tsx:412`, que es el mismo patrón contenedor usado uniformemente en toda la app (Profesionales, Servicios, Clients, Inventario, Dashboard) — no hay hoy un patrón "full width" precedente, por lo que romper ese contenedor solo para Turnos es una decisión de diseño nueva, no un ajuste de bug. El layout padre (`AppLayout.tsx`) ya provee `h-screen` con `overflow-y-auto` en `<main>`, lo cual compite con el scroll interno de FullCalendar si se usa `height="100%"` sin cuidado, y la franja de profesionales (UX-18) más el filtro condicional agregan altura variable que complica fijar un `calc()` simple para la altura del calendario.

## Recomendación

En `apps/client/src/views/Turnos.tsx`: reemplazar `contentHeight={560}` (línea 529) por `height="100%"` en `<FullCalendar>`, y envolver el card del calendario (línea 488) en un contenedor con altura calculada vía flexbox (ej. hacer que el `<div className="max-w-6xl mx-auto">` raíz pase a `flex flex-col` con el card del calendario en `flex-1 min-h-0` y `overflow-hidden`), de modo que el calendario consuma el espacio vertical remanente de `<main>` sin generar un segundo scroll — esto requiere decidir primero si `max-w-6xl` se mantiene (ancho contenido, consistente con el resto de la app) o se remueve solo para esta vista (full width, precedente nuevo); no cambiar `AppLayout.tsx` salvo que se decida ese segundo camino.

## Confirmación UX-20

Sin residuos — grep de los cuatro identificadores (`event-quick-cancel`, `FiTrash2`, `canQuickCancel`, `QuickCancel`) sobre `Turnos.tsx` no arrojó coincidencias.

## Preguntas abiertas / decisiones de producto pendientes

1. **Ancho:** ¿se mantiene `max-w-6xl` (consistente con Clientes/Servicios/Inventario/Profesionales/Dashboard) o se hace Turnos "full width" como excepción? Si es excepción, es la primera vista con ese tratamiento — vale confirmarlo explícitamente con el usuario antes de implementar, porque sienta un precedente de diseño.
2. **Altura en mobile:** con `height="100%"` dependiendo de un contenedor flex con altura de viewport, hay que decidir una altura mínima para mobile (donde el header móvil de `AppLayout.tsx:47` + header de página + franja de profesionales dejan menos espacio vertical disponible) — ¿altura mínima fija en px como piso (ej. `min-h-[500px]`) o se acepta compresión total?
3. **Doble scroll:** decidir si el scroll vive en `<main>` de `AppLayout.tsx` (actual, `overflow-y-auto`) o se delega enteramente al FullCalendar interno con el resto de la página fija — afecta cómo se calcula el `calc()` de altura.

## Alcance sugerido

1 archivo (`apps/client/src/views/Turnos.tsx`), posiblemente 0 cambios en `AppLayout.tsx` si se resuelve todo con flex interno de la vista. Complejidad: **baja-media** (cambio de props CSS/Tailwind + reestructuración de contenedores flex, sin tocar lógica de negocio ni handlers de FullCalendar) — candidato a 1 solo `implementer` frontend, sin necesidad de fragmentar en PRs encadenadas.

**Archivos relevantes:**
- `C:\_dev\Cetzz\shear-system\apps\client\src\views\Turnos.tsx` (líneas 412, 440-468, 488, 520-573)
- `C:\_dev\Cetzz\shear-system\apps\client\src\layouts\AppLayout.tsx` (líneas 44, 135)
- `C:\_dev\Cetzz\shear-system\apps\client\package.json` (líneas 14-18)
