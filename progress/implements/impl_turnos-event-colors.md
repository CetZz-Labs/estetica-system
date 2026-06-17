# Ajuste visual: colores de eventos del calendario de Turnos

> Nota: este NO es un cierre de feature de `feature_list.json`. Es un ajuste de pulido visual puntual sobre `Turnos.tsx`, solicitado directamente por el usuario.

## Problema

En la vista semana (timeGrid) del calendario de Turnos, los eventos se renderizaban con un relleno sólido y saturado (`#6B7280` gris oscuro para completados/pendientes, `#54A885`/`#E06B5E` saturados para confirmado/cancelado), rompiendo con la estética minimalista de fondos claros/pasteles de Maison CRM. El patrón correcto ya existía en el badge de estado del modal de detalle de turno (fondo pastel + borde + texto de color), pero no se replicaba en los eventos de FullCalendar.

## Cambio realizado

Archivo modificado: `apps/client/src/views/Turnos.tsx` (único archivo tocado).

1. Se reemplazó la función `getStatusColor(status): string` (que devolvía un solo color sólido) por un mapa `STATUS_PALETTE` y una función `getStatusPalette(status)` que devuelve `{ bg, border, text }` con la paleta pastel canónica (equivalente a las clases Tailwind del badge `bg-*-50 text-maison-* border-*-200` ya usado en el modal de detalle):

   | Estado | bg | border | text |
   |---|---|---|---|
   | confirmed | `#ECFDF5` | `#BBF7D0` | `#54A885` |
   | cancelled | `#FEF2F2` | `#FECACA` | `#E06B5E` |
   | completed | `#F9FAFB` | `#E5E7EB` | `#6B7280` |
   | pending (default) | `#F9FAFB` | `#E5E7EB` | `#6B7280` |

2. En el `useMemo` de `events` (mapeo de `appointments` a eventos de FullCalendar), cada evento ahora usa:
   - `backgroundColor: palette.bg`
   - `borderColor: palette.border`
   - `textColor: palette.text` (antes era un valor fijo `#2C2A29`)

3. No se modificó `getStatusIcon`, `eventContent`, ni la clase CSS `.appointment-event-content` — se verificó que esta última no define ningún `color` fijo, por lo que el ícono de estado hereda correctamente el nuevo `textColor` del contenedor del evento sin cambios adicionales.

4. No se tocó `.appointment-event.cancelled { text-decoration: line-through; opacity: 0.7; }` — sigue funcionando bien sobre el nuevo fondo pastel rojo claro.

5. El mecanismo es el mismo para vista mes (`dayGridMonth`) y semana (`timeGridWeek`), ya que ambas consumen el mismo array `events` con `backgroundColor`/`borderColor`/`textColor`.

## Archivos modificados

- `apps/client/src/views/Turnos.tsx` (único archivo tocado, según alcance asignado)

## Resultado de verificación

### Build

```
pnpm --filter @estetica/client build
```
Resultado: **Exit 0**. `tsc -b && vite build` completó sin errores. Salida:
```
✓ 281 modules transformed.
dist/index.html                     0.48 kB
dist/assets/index-Dp-AE-ZQ.css     36.85 kB
dist/assets/index-ILt-OYhz.js   1,261.55 kB
✓ built in 813ms
```
(Warning de chunk size > 500kB es preexistente y no relacionado con este cambio.)

### Lint

```
pnpm --filter @estetica/client lint
```
Resultado: **Exit 1**, pero el único error (`'stock' is assigned a value but never used` en `ProductoModal.tsx:37`) y las advertencias de React Compiler (`Negocio.tsx:73` y `Turnos.tsx:345`, ambas sobre `watch()` de react-hook-form) son **preexistentes y no relacionados con este cambio**. La advertencia en `Turnos.tsx:345` corresponde a la sección del formulario de turno (`watch('service')`), no al bloque de colores de eventos modificado (líneas 43-51 y 165-180). No se introdujeron nuevos errores ni warnings de lint con este ajuste.

## Estado

No se modificó `feature_list.json` ni `progress/current.md`, conforme a las instrucciones (ajuste de pulido, no feature nueva).
