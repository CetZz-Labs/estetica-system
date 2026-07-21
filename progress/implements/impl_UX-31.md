# impl_UX-31 — Rediseño Shear, Etapa 1: Fundación index.css + index.html

## Archivos modificados

- `apps/client/src/index.css` — reescritura completa (269 líneas, +145/-126 según `git diff --stat`)
- `apps/client/index.html` — reemplazo del `<link>` de Google Fonts (línea 10)

Ningún otro archivo de `apps/client/` fue tocado (confirmado con `git status --porcelain apps/client`).

## Resumen de cambios

1. **Fuentes:** reemplazado el `@import` de Fraunces+Manrope por Cormorant Garamond (ital 500/600/700)
   + Figtree (400/500/600/700) en `index.css` línea 1, y el `<link rel="stylesheet">` equivalente en
   `index.html`. Los 2 `<link rel="preconnect">` de Google Fonts se mantuvieron intactos.
2. **`:root`:** reescrito con los 27 tokens hex de `docs/design.md §2` y `§14` (neutros/superficies,
   texto, marca/acentos, tintes de fondo, pares de texto de badge, radios `--r-card`/`--r-ctrl`/`--r-pill`,
   fuentes `--serif`/`--sans`). Sin excepciones — todos los tokens pedidos están presentes.
3. **`@theme inline`:** mapea cada token a `--color-*` con nombres literales de `design.md`
   (`bg-bg`, `bg-surface`, `bg-surface-2`, `text-text`/`text-text-2`/`text-text-3`, `text-muted`,
   `bg-accent`/`text-accent`, `bg-accent-rose`, `bg-wine`/`text-wine`, `bg-sage`/`text-sage`,
   `bg-gold`/`text-gold`, `border-border`/`border-border-soft`/`border-dotted`,
   `bg-rose-bg`/`bg-sage-bg`/`bg-gold-bg`/`bg-wine-bg`/`bg-alert-bg`, más los pares de texto de badge
   `text-sage-text`/`text-gold-text`/`text-alert-text`/`text-rose-text`, y extras `bg-hover-soft`/
   `bg-accent-tint` no exigidos explícitamente pero coherentes con los tokens de §2.4).
   `--font-serif`/`--font-sans` remapeados a Cormorant Garamond/Figtree (las ~64 clases `font-serif`/
   `font-sans` existentes heredan el cambio sin tocarlas). `--radius-card`/`--radius-ctrl`/`--radius-pill`
   agregados (opcionales, no bloqueantes).
4. **Eliminado por completo:** bloque `.dark { ... }` (35 líneas oklch), escala `--shadow-sm..xl`
   (en `:root`, `.dark` y `@theme inline`), keyframe `@keyframes pageIn` y `.animate-page-in`.
5. **Base styles:** agregadas las 4 reglas de `docs/design.md §14` (`a`, `a:hover`,
   `input::placeholder`, `input:focus`) dentro de `@layer base`, conservando el bloque `* { @apply
   border-border outline-ring/50; }` y `body { @apply bg-background text-foreground min-h-screen
   antialiased; }` existente (con su `transition` original, no se tocó por no estar en el alcance).
6. **Scrollbar:** `.custom-scrollbar` remapeado (`thumb: var(--border)`, `hover thumb: var(--dotted)`
   en vez del hex viejo `#ead9cf`); agregado el scrollbar global de `design.md §14`
   (`::-webkit-scrollbar` 8px + `::-webkit-scrollbar-thumb` con `var(--dotted)`).

## Decisiones técnicas

### Conflicto `--color-accent` (instruido explícitamente en la tarea)

Se definió **una sola vez** `--color-accent: var(--accent)` (el nuevo acento de marca Shear,
`#B76E84`), priorizando la semántica nueva porque `docs/design.md` exige que `bg-accent`/`text-accent`
generen ese color. No se agregó una segunda entrada `--color-accent` con la semántica vieja de
shadcn (fondo de acento suave `#f5d5cc`/texto `#c4656a`). **Efecto aceptado:** los ~19 usos viejos de
`bg-accent`/`text-accent` en el código (`AjusteStockModal`, `CargaMasivaClientesModal`,
`CargaMasivaModal`, `ClienteModal`, `RegistroModal`, `ProductoModal`, `ServicioModal`,
`ProfesionalModal`, `ConfirmModal`, `ThemeToggle`, `Landing`) van a mostrarse con el acento vino-rosa
de marca en vez del tinte durazno claro anterior, hasta que esas vistas se migren en UX-32+.

### Conflicto análogo no explicitado en la tarea: `--color-muted`

Se detectó el mismo tipo de conflicto para `muted`: `docs/design.md` exige la clase literal
`text-muted` apuntando al texto atenuado `#A08D95`, pero el bridge de tokens viejos pedía
`--color-muted: var(--surface-2)` (semántica vieja: fondo claro `bg-muted`, usado **60 veces** en 9
vistas — Dashboard, Historial, Inventario, Turnos, etc., mayormente en skeletons `animate-pulse
bg-muted`). Apliqué la misma resolución que para `accent`: una sola definición
`--color-muted: var(--muted)` (semántica nueva), y `--color-muted-foreground: var(--muted)` ya
coincide con esa misma intención (era la más cercana disponible). **Efecto aceptado:** los ~60 usos
viejos de `bg-muted` van a mostrarse con el tono grisáceo-rosado `#A08D95` (más oscuro que el
`#f7f2ed` original) hasta que se migren en UX-32/33 — este es el impacto visual más notorio de la
etapa, concentrado en skeletons de loading, y queda documentado aquí para que el reviewer y las
etapas siguientes lo tengan en cuenta.

### `@custom-variant dark`

Se **mantuvo** la línea `@custom-variant dark (&:is(.dark *));` (excepción documentada, tal como
habilita la consigna). Motivo: aunque Tailwind v4 ya soporta `dark:` vía `prefers-color-scheme` sin
esta línea, `useIsDark.ts`/`ThemeToggle.tsx` siguen vivos (usados por `Landing.tsx` y
`AceptarInvitacion.tsx` hasta UX-32) y dependen de la variante **basada en clase** `.dark` en
`<html>`, no en la preferencia de SO. Quitar la línea habría roto silenciosamente ese mecanismo sin
fallar el build (Tailwind igual compila `dark:*` bajo media query) — riesgo de regresión visual en
Landing/AceptarInvitacion no detectable por `tsc`/`vite build`. Se prioriza no romper esos 2 archivos
sobre la pureza del punto 5 de la consigna, como esta permite explícitamente.

### `.dark`, `--shadow-*`, `pageIn` — eliminados sin alias

Se eliminaron sin dejar puente, tal como se pidió: no hay ningún uso de `.dark` como clase de
estilos residual (solo la variante `dark:` en TSX, que no depende de que exista el bloque `.dark`
en CSS), ningún uso de `shadow-sm/md/lg/xl` verificado como bloqueante, y `animate-page-in` no
aparece en ningún componente actual.

### Tokens sin mapeo natural (`destructive`, `warning`, `ring`)

Se detectó uso residual real de estos tokens (`text-destructive` en `Clients.tsx`,
`AceptarInvitacion.tsx`, `CompletarRegistro.tsx`; `text-warning` en `Clients.tsx`;
`focus:ring-ring`/`ring-ring-subtle`/`destructive-subtle` en `appointmentStatus.tsx` y
`AppointmentDetail.tsx`), por lo que se aplicaron los mapeos seguros sugeridos por la consigna:
- `--color-destructive: var(--alert-text)` (`#B0553F`)
- `--color-destructive-foreground: #ffffff`
- `--color-warning: var(--gold)` (`#C89A5B`)
- `--color-warning-foreground: #ffffff`
- `--color-ring: var(--accent-rose)` (`#D98BA4`)
- `--color-destructive-subtle: var(--alert-bg)`
- `--color-ring-subtle: var(--rose-bg)`

`--input`/`--popover`/`--popover-foreground` se eliminaron sin alias: verificado con grep que no
tienen ningún uso (`bg-input`, `border-input`, `bg-popover`, `text-popover`) fuera del propio
`index.css` viejo.

## Alias-puente temporales vivos tras esta etapa (responsabilidad de UX-35)

| Alias | Valor | Nota |
|---|---|---|
| `--color-primary` | `var(--accent)` | `#B76E84` |
| `--color-primary-foreground` | `#ffffff` | |
| `--color-card` | `var(--surface)` | `#FFFFFF` |
| `--color-card-foreground` | `var(--text)` | `#3E2A33` |
| `--color-foreground` | `var(--text)` | |
| `--color-background` | `var(--bg)` | `#FAF6F4` |
| `--color-muted-foreground` | `var(--muted)` | `#A08D95` |
| `--color-border` | `var(--border)` | `#F0E4E4` |
| `--color-secondary` | `var(--rose-bg)` | |
| `--color-secondary-foreground` | `var(--wine)` | |
| `--color-sidebar*` (7 subcampos) | ver `index.css` | consumidos por `AppLayout.tsx` hasta UX-32 |
| `--color-destructive*`/`--color-warning*`/`--color-ring*` | ver arriba | sin equivalente Shear directo |

Nota especial para UX-35: **no existen** entradas separadas `--color-accent`/`--color-muted` con la
semántica vieja — ya fueron resueltas como la semántica Shear nueva (ver "Decisiones técnicas"
arriba). Al migrar las vistas que usan `bg-accent`/`text-accent`/`bg-muted` con la intención vieja,
deben reemplazarse por las clases Shear correctas (`bg-rose-bg`/`text-accent-rose` según contexto
para el viejo "acento suave"; `bg-surface-2` para el viejo "fondo muted"), no asumir que el alias
las va a rescatar.

## Resultado de build y lint

```
pnpm --filter @estetica/client build
```
→ Exit code 0. `tsc -b && vite build` sin errores. Output: `dist/assets/index-CaGa2cLB.css` (73.65 kB),
`dist/assets/index-BpodNS8p.js` (1.77 MB, warning preexistente de chunk size no relacionado a esta
feature).

Verificaciones adicionales sobre el CSS compilado (`dist/assets/index-*.css`):
- `--wine:#6b3444;` y `--accent:#b76e84;` presentes en `:root` compilado.
- `Cormorant+Garamond` y `Figtree` presentes en `dist/index.html`.
- `pageIn`/`animate-page-in` y `oklch` (valores del bloque `.dark` viejo): 0 ocurrencias.
- Las clases `bg-wine`/`text-muted` (semántica nueva) todavía no aparecen en el CSS emitido porque
  Tailwind v4 solo genera utilidades efectivamente usadas en el código fuente escaneado, y ninguna
  vista consume esos nombres todavía (se espera que aparezcan en UX-32+). Esto es comportamiento
  esperado, no un defecto de esta etapa — la variable base y el mapeo `@theme` ya están disponibles.

```
pnpm --filter @estetica/client lint
```
→ Exit code 1, pero **ningún error es nuevo ni atribuible a esta feature**. Confirmado con
`git status --porcelain apps/client` / `git diff --stat apps/client` que únicamente
`apps/client/index.html` y `apps/client/src/index.css` fueron modificados; los 6 errores + 4
warnings de lint están todos en archivos `.tsx` no tocados:
- `ProductoModal.tsx:37` — `'stock' is assigned a value but never used` (deuda ya documentada en
  `progress/current.md`).
- `react-bits/Aurora.tsx`, `react-bits/SplitText.tsx`, `react-bits/TextType.tsx` — errores de
  React Compiler (`refs`/`set-state-in-effect`/`prefer-const`) preexistentes en componentes de
  terceros vendorizados, ajenos al alcance de fundación CSS.
- `AceptarInvitacion.tsx:64` — `useIsDark` llamado condicionalmente (`react-hooks/rules-of-hooks`),
  bug preexistente del propio hook que UX-32 va a eliminar junto con `ThemeToggle.tsx`/`useIsDark.ts`.
- `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, `ProfesionalModal.tsx` — warnings
  `react-hooks/incompatible-library` por `watch()` de react-hook-form, preexistentes.

Ninguno de estos archivos fue leído/editado por este implementer; la deuda de lint es
pre-existente al inicio de la sesión de UX-31.

## Deuda / riesgos para etapas siguientes

- **UX-32:** al remover `ThemeToggle.tsx`/`useIsDark.ts`, eliminar también la línea
  `@custom-variant dark (&:is(.dark *));` de `index.css` (justificación de mantenerla documentada
  arriba deja de aplicar una vez que `Landing.tsx`/`AceptarInvitacion.tsx` dejen de usar `dark:`).
- **UX-33 (o antes):** el cambio de `bg-muted` (60 usos, principalmente skeletons `animate-pulse`)
  de `#f7f2ed` a `#A08D95` es el impacto visual más grande de esta etapa — priorizar Dashboard.tsx
  (20 usos) e Historial.tsx (8 usos) si se reporta como regresión visual notoria antes de que les
  toque su etapa de migración.
- Lint pre-existente (no bloqueante, no introducido aquí): ver lista de 6 errores/4 warnings arriba.
