# Bitácora de Implementación — UX-26 (Frontend)

**Feature:** UX-26 — Bug: tooltip de hover del calendario aparece detrás de otros elementos
**Timestamp:** 2026-07-08

## Archivo modificado

- `apps/client/src/views/Turnos.tsx` (línea 581, dentro del bloque 577-583)

## Cambio exacto

Se agregó la prop `style={{ zIndex: 9999 }}` al componente `<Tooltip>` de `react-tooltip`, siguiendo el diagnóstico de `progress/explores/explore_UX-26.md` y el precedente de `zIndex: 9999` usado en el `menuPortal` de react-select (UX-24, `Turnos.tsx:686`).

```tsx
<Tooltip
    id="appointment-tooltip"
    className="!bg-maison-primary !text-white !text-xs !rounded-lg !py-1.5 !px-3"
    portalRoot={document.body}
    positionStrategy="fixed"
    style={{ zIndex: 9999 }}
/>
```

No se tocó `portalRoot`, `positionStrategy`, `className`, ni ninguna otra parte del archivo. Cambio de una sola línea/prop en un único archivo, según alcance acordado.

## Verificación

### Build
```
pnpm --filter @estetica/client build
```
Resultado: **Exit Code 0**. `tsc -b && vite build` completó sin errores. Bundle generado en `dist/` (warning preexistente de chunk >500kB, no relacionado con este cambio).

### Lint
```
pnpm --filter @estetica/client lint
```
Resultado: **Exit Code 1**, pero con la deuda preexistente ya conocida y documentada en la tarea:
- `ProductoModal.tsx:37` — error `'stock' is assigned a value but never used` (preexistente, no tocado).
- Warnings `react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:125`, `Negocio.tsx:73`, `Turnos.tsx:214` (uso de `watch()` de react-hook-form, preexistente, no relacionado con el `<Tooltip>` ni con esta feature).

No se introdujo ningún error o warning **nuevo**. El único archivo modificado (`Turnos.tsx`) no generó ningún lint issue nuevo en la zona tocada (línea 577-583); el warning existente de `Turnos.tsx:214` es sobre `watch('date')` en el formulario, no relacionado con el `<Tooltip>`.

## Resumen

Fix trivial de una prop (`style={{ zIndex: 9999 }}`) sobre el `<Tooltip>` ya portalado a `document.body` con `positionStrategy="fixed"` (UX-18). Resuelve la pérdida de la batalla de stacking contra elementos de FullCalendar con z-index explícito (`.fc-scrollgrid-section-sticky` z-index:3, `.fc-event-resizer` z-index:4). No afecta drag&drop, colores sólidos/contraste de UX-18, ni ninguna otra funcionalidad.

Listo para revisión del `reviewer`. No se modificó `feature_list.json`.
