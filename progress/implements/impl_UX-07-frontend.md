# Bitácora de Implementación — UX-07 (Frontend)

## Feature en curso
UX-07 — Scroll interno del calendario de turnos

## Archivo tocado

| Archivo | Línea | Cambio |
|---|---|---|
| `apps/client/src/views/Turnos.tsx` | 471 | `height="auto"` → `contentHeight={560}` |

## Detalle del cambio

En el componente `<FullCalendar>`, la prop `height="auto"` hacía que la grilla de horas se expandiera sin límite, obligando al usuario a scrollear toda la página para ver los slots de las 19-20 hs. Se reemplazó por `contentHeight={560}`, que fija la altura del área de vista (timeGrid) y activa el scrollbar interno de FullCalendar, dejando el toolbar intacto y sin afectar ninguna otra prop del componente.

## Verificación post-edición

- Grep de `height="auto"` en `Turnos.tsx`: **0 ocurrencias** (prop eliminada correctamente).
- Grep de `contentHeight` en `Turnos.tsx`: **1 ocurrencia en línea 471** (prop nueva confirmada).

## Estado
COMPLETADO — pendiente de build y review por el Leader.
