# impl_UX-33-A — Rediseño Shear Etapa 3, sub-lote A: primitivos compartidos

**Feature:** UX-33 (in_progress) — sub-lote A de D (Dashboard/tablas/listados vendrán en B/C/D)
**Sandbox:** `apps/client/src/components/ui/` — únicamente los 3 archivos listados abajo.

## Resumen de cambios por archivo

### `apps/client/src/components/ui/Modal.tsx`
- Contenedor del modal: `bg-card` → `bg-surface`, `rounded-lg` → `rounded-card` (14px, `--radius-card`), se **eliminó `shadow-xl`** (docs/design.md §5: prohibido `box-shadow` decorativo en tarjetas).
- Header: se quitó `bg-background` (heredaba un fondo distinto al `surface` del resto del modal; ahora hereda `bg-surface` del contenedor padre). Se mantiene `border-b border-border`.
- Wrapper del ícono opcional: `bg-white ... shadow-sm text-gray-600` → `bg-surface border border-border rounded-ctrl text-text-2` (10px, `--radius-ctrl`, sin sombra).
- Título: `text-foreground` → `text-text` (token nativo Shear), se conserva `font-serif` y tamaño `text-2xl` (ya era serif desde antes; no se tocó tamaño porque la tarea no lo pedía y el modal puede llevar un título ligeramente mayor al de una card genérica de §7.3).
- Subtítulo: `text-gray-500` → `text-muted` (metadato, §3 tabla tipográfica).
- Botón cerrar (X): `text-gray-400 hover:text-gray-700` → `text-muted hover:text-text-2`; se agregó `focus-visible:outline-2 focus-visible:outline-accent-rose focus-visible:outline-offset-2` (§11, reemplazo del `outline:none` implícito).
- Footer: `bg-gray-50/50` → `bg-surface-2` (tinte de superficie ya definido en el sistema, en vez de un gris ad-hoc de Tailwind).
- Sin cambios de lógica: `isOpen`, backdrop click-to-close (`onClick={onClose}` + `stopPropagation` en el contenedor), props (`maxWidth`, `containerClassName`, etc.) intactas.

**Decisión — backdrop-blur:** se dejó `backdrop-blur-sm` tal cual estaba (no es sombra ni gradiente, `docs/design.md` no lo prohíbe ni lo menciona como parte del sistema). El overlay conserva `bg-black/40`.

### `apps/client/src/components/ui/ConfirmModal.tsx`
- Ícono de warning: `text-destructive` → `text-alert-text` (`#B0553F`, §2.4/§8). No se envolvió en un círculo `bg-alert-bg` adicional porque el wrapper genérico del ícono ya lo provee `Modal.tsx` (`bg-surface border border-border rounded-ctrl`) y es compartido por todos los consumidores de `icon` (no solo warnings) — anidar un segundo fondo de color ahí habría requerido tocar la lógica de `Modal.tsx` fuera del alcance visual pedido. Se documenta como decisión: solo se migró el color del ícono, no el fondo del wrapper.
- Botón "Cancelar": migrado al patrón de botón secundario de §7.2 — `bg-surface border border-[var(--dotted)] text-wine hover:bg-hover-soft`, radio `rounded-ctrl`. (Antes tenía un hover extraño con `bg-accent`/`text-accent-foreground` que no correspondía a ningún patrón documentado).
- Botón "Confirmar" (acción destructiva): `bg-destructive hover:bg-red-700 disabled:bg-gray-300` → `bg-alert-text hover:opacity-90 disabled:opacity-50`, `rounded-ctrl`.
  **Decisión de color:** `docs/design.md` no define un botón "danger" separado del primario (§7.2 solo define Primario/Secundario/Link). Para no perder la distinción semántica entre una acción "segura" (`bg-accent`) y una destructiva (borrar, ej. `ConfirmModal` se usa mayormente para eliminaciones — ver patrón P9), se optó por `bg-alert-text` (`#B0553F`), que **ya está dentro de la paleta** (§2.4, color de texto/alerta de stock crítico) y no introduce ningún tono nuevo fuera de §2. El hover pasa a `opacity-90` (sin cambio de tono) y el disabled a `opacity-50`, siguiendo la regla de animación de §7.2/§13 (nada de `translateY`/`shadow` en hover).
- Texto del mensaje: `text-gray-600` → `text-text-2` (cuerpo general, §2.2).

### `apps/client/src/components/ui/Pagination.tsx`
- Botones "Anterior"/"Siguiente": `bg-white border-gray-200 text-gray-600 rounded-lg hover:border-gray-300 hover:bg-gray-50` → patrón de botón secundario `bg-surface border border-[var(--dotted)] text-wine rounded-ctrl hover:bg-hover-soft` (§7.2). Estado disabled se mantuvo (`disabled:opacity-50 disabled:cursor-not-allowed`), ya cumplía el requisito.
- Texto "Mostrando X–Y de N": `text-gray-500` → `text-muted` (metadato, criterio: es un contador/subtítulo de listado, igual categoría que "Mínimo sugerido: X u." en §7.7, que usa `muted`).
- Sin sombras ni lift; sin cambios de lógica (`totalPages`, `from`/`to`, `onChange`).

## Nota técnica — color `dotted` como borde

`--color-dotted` genera utilidades Tailwind v4 automáticas (`bg-dotted`, `text-dotted`, `border-dotted`, etc.), pero `border-dotted` colisiona con la utilidad nativa de Tailwind para `border-style: dotted`. Para evitar que el core de Tailwind gane la colisión y termine aplicando un estilo de borde punteado en vez del color `#E7D8DC`, se usó la sintaxis arbitraria `border-[var(--dotted)]` en los 3 botones secundarios migrados (`ConfirmModal` Cancelar, `Pagination` Anterior/Siguiente). El resto de las clases de color (`bg-dotted`, ya usado en `AppLayout.tsx`) no tiene este problema porque no colisiona con ningún utility nativo.

## Verificación

```
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, sin errores)
pnpm --filter @estetica/client lint    → Exit 1, pero los 5 errores + 4 warnings son deuda preexistente
                                          ya documentada (react-bits/Aurora.tsx, react-bits/SplitText.tsx,
                                          react-bits/TextType.tsx, RegistroModal.tsx:126, Negocio.tsx:83,
                                          Turnos.tsx:208 — todos por watch()/refs en componentes ajenos
                                          a este sub-lote). CERO errores/warnings nuevos en Modal.tsx,
                                          ConfirmModal.tsx o Pagination.tsx.
```

`git diff --stat` confirma el alcance exacto:
```
apps/client/src/components/ui/ConfirmModal.tsx |  8 ++++----
apps/client/src/components/ui/Modal.tsx        | 14 +++++++-------
apps/client/src/components/ui/Pagination.tsx   |  6 +++---
3 files changed, 14 insertions(+), 14 deletions(-)
```

## Estado

Sub-lote A completo. Listo para que el `leader` lance los sub-lotes B/C/D (Dashboard, Clientes/Historial, Inventario) sobre las vistas de ruta, que heredan estos 3 primitivos ya migrados.
