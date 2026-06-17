# Implementación: Pulido visual de Turnos.tsx (feedback de usuario)

> No es una épica nueva. No se modificó `feature_list.json` ni `progress/current.md`.

## Archivo modificado

- `apps/client/src/views/Turnos.tsx`

## Resumen de cambios

### Pedido 1 — Unificar estilo de eventos: semana igual que mes

Se eliminaron las reglas específicas de `.fc-timegrid-event` que forzaban wrap de texto y alineación `flex-start` en la vista semana (`timeGrid`):

```css
/* ELIMINADO */
.fc-timegrid-event .appointment-event-content { white-space: normal; align-items: flex-start; }
.fc-timegrid-event .appointment-event-content .event-title { white-space: normal; }
```

Ahora `.appointment-event-content` (flex, `align-items: center`, `gap: 4px`, `overflow: hidden`) y `.event-title` (`overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`) aplican sin overrides en ambas vistas (`dayGrid` y `timeGrid`), logrando el mismo chip compacto de una sola línea en mes y semana.

Se agregó una regla de refuerzo para evitar desbordes en bloques de tiempo angostos (eventos cortos en la grilla horaria), donde el contenedor nativo de FullCalendar (`.fc-event-main`) podría no recortar el contenido:

```css
.fc-timegrid-event .fc-event-main { overflow: hidden; }
```

Esto preserva el comportamiento de ellipsis en eventos cortos sin romper el layout, igual que en la vista mes.

### Pedido 2 — Hover ilegible en botones del toolbar

Se agregó `color: #2C2A29;` (token `--color-maison-text`) a la regla `.fc .fc-button-primary:hover`, que antes no fijaba color explícito y heredaba el blanco por defecto de FullCalendar sobre el fondo claro `#F9FAF8`, dejando el texto ilegible.

```css
/* ANTES */
.fc .fc-button-primary:hover { background-color: #F9FAF8; border-color: #D1D5DB; }

/* DESPUÉS */
.fc .fc-button-primary:hover { background-color: #F9FAF8; border-color: #D1D5DB; color: #2C2A29; }
```

No se tocó `.fc-button-active` (botón de vista seleccionada), que sigue con fondo negro y texto blanco sin cambios.

### Pedido 3 — Color del botón "Completar y Registrar"

Se cambió la clase del botón en `detailFooter` de verde semántico a negro Primario, consistente con `docs/design.md` §4.2 (patrón "Primario": `bg-maison-primary hover:bg-black text-white`), igual que "Nuevo Turno" y "Crear/Actualizar Turno" en la misma vista.

```tsx
/* ANTES */
className="bg-maison-green hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"

/* DESPUÉS */
className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
```

Padding, radius, ícono (`FiCheck`), flex y transition se mantuvieron sin cambios.

## Resultado de Build / Lint

### Build — `pnpm --filter @estetica/client build`

```
> tsc -b && vite build
✓ 281 modules transformed.
dist/index.html                     0.48 kB
dist/assets/index-Dp-AE-ZQ.css     36.85 kB
dist/assets/index-Wnl48Pp3.js   1,261.42 kB
✓ built in 858ms
```

**Exit Code 0.** Build exitoso. (Warning preexistente sobre chunk size > 500kB, no relacionado con estos cambios.)

### Lint — `pnpm --filter @estetica/client lint`

**Exit Code 1.** El comando falla, pero por causas ajenas a `Turnos.tsx`:

- **Error real:** `ProductoModal.tsx:37` — `'stock' is assigned a value but never used` (`@typescript-eslint/no-unused-vars`). Archivo no tocado en esta sesión; preexistente en el árbol de trabajo (confirmado con `git diff --stat`, sin diffs en `ProductoModal.tsx`).
- **Warning (no error):** `Negocio.tsx:73` — React Compiler skip por uso de `watch()` de react-hook-form. Archivo no tocado, preexistente.
- **Warning (no error):** `Turnos.tsx:340` — misma naturaleza (`watch()` de react-hook-form, API ya utilizada antes de esta sesión, no introducida por estos 3 cambios). No es un error de lint, solo warning informativa del React Compiler.

`git diff --stat` confirma que el único archivo modificado en esta sesión es `apps/client/src/views/Turnos.tsx` (3 inserciones, 4 deleciones — corresponde exactamente a los 3 cambios solicitados). El error de lint bloqueante (`ProductoModal.tsx`) es preexistente y queda fuera del alcance de esta tarea (sandbox: solo `Turnos.tsx`).
