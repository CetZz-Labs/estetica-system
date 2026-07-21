# impl_UX-37-A — Rediseño Shear Fase 2 (Landing pública), sub-lote A

## Alcance

Sub-lote A de `UX-37`: Nav flotante + menú mobile + guard de auth (sin tocar lógica) + sección
HERO + `HeroMockup()`, en `apps/client/src/views/Landing.tsx` (único archivo tocado).

No se tocaron las secciones Features / Stats / HowItWorks / CTA / Footer /
`HorizontalScrollFeatures()` (sub-lotes B y C), ni ningún archivo de `components/react-bits/`
(sub-lote D). El componente `AceptarInvitacion.tsx` tampoco se tocó (fuera de alcance de UX-37).

## Decisiones de diseño

1. **Nav: de pill flotante a header sólido siempre visible.** Se eliminó el patrón de "pill"
   centrado con `backdrop-blur` + `shadow-lg` + estado `scrolled` (useState + `useEffect` con
   scroll listener). Se reemplazó por un `<header className="sticky top-0 z-50 bg-surface
   border-b border-border">` de ancho completo, en el mismo lenguaje visual que el topbar de la
   app autenticada (`AppLayout.tsx` §6.2 de `docs/design.md`) — sin blur ni sombra en ningún
   estado. Se optó por la variante "siempre sólido" (menos código) en vez de condicionar el
   fondo al scroll, ya que design.md prohíbe la sombra en cualquier caso y el único diferencial
   visual del estado `scrolled` original era la sombra — al quitarla, mantener el estado dejaba
   de tener efecto visible, así que se eliminó `scrolled`/`useEffect` por completo (y el import
   `useEffect` de `react`, que quedó sin otros consumidores en el archivo). Motivo documentado
   explícitamente porque la consigna permitía cualquiera de las dos rutas a criterio del
   implementer.
2. **Fondo del hero (reemplazo de `Aurora`).** Se retiró el `<Aurora>` (vía `ogl`) y los dos
   blobs decorativos `blur-3xl` sin reemplazo animado ni de gradiente: la sección hero ahora usa
   `bg-bg` plano (fondo estándar de la app, §2.1). No se usó un tinte adicional (`rose-bg`/
   `surface`) porque el hero ya contiene el badge y el mockup con suficiente contraste sin
   necesidad de un fondo diferenciado, y priorizar el fondo plano evita introducir un segundo
   bloque de color que compita con las reglas de "máximo 1-2 fondos por vista" (§1.3). Se
   eliminaron también los blobs `bg-primary/5`/`bg-ring/5 blur-3xl` (efecto decorativo tipo glow
   sin equivalente en el catálogo de §13).
3. **Badge "CRM para centros de estética" (reemplazo de `ShinyText`).** Chip estático pill
   (`rounded-pill`) con `bg-rose-bg text-accent`, siguiendo el patrón de chip §7.9/§2.4 (el par
   oficial de `rose-bg` es el texto `accent` `#B76E84`, confirmado en la tabla de tintes de
   `docs/design.md` §2.4).
4. **Palabra rotativa (reemplazo de `TextType`).** Se reemplazaron las 3 palabras animadas
   (`simplifica`/`organiza`/`automatiza`) por una única palabra fija `simplifica` en
   `text-accent`, heredando la tipografía serif del `<h1>` padre. Se conservó el subrayado SVG
   decorativo (trazo curvo bajo la palabra) remapeando su color de `text-ring/40` (token legacy)
   a `text-dotted` (token Shear ya destinado a líneas/adornos punteados sutiles, §2.1). Se quitó
   el `min-w-[200px] sm:min-w-[280px]` del contenedor de la palabra: ya no hace falta reservar
   ancho para evitar salto de layout, porque el texto ahora es estático.
5. **Botones CTA del hero.** "Prueba gratis" → botón primario estándar §7.2
   (`bg-accent hover:opacity-90 text-white`, `rounded-ctrl`, sin `shadow`/`hover:shadow`). Se
   quitó `group`/`group-hover:translate-x-0.5` del ícono de flecha (micro-lift prohibido por
   §13). "Ver funcionalidades" → botón secundario §7.2 exacto (`bg-surface
   border border-[var(--dotted)] hover:bg-hover-soft text-wine`), copiado literalmente del
   patrón ya usado en `Clients.tsx`/`Inventario.tsx` para el botón "+ Invitar"/"Carga masiva"
   (la clase `border-[var(--dotted)]` con valor arbitrario es necesaria porque el nombre de
   utilidad Tailwind `border-dotted` ya está tomado por el `border-style: dotted` nativo).
   Radio `rounded-ctrl` (10px) en ambos, no `rounded-full`, según la decisión ya tomada por el
   orquestador (consistencia con el resto de la app).
6. **`HeroMockup()`: remapeo directo de tokens.** Sin lógica que preservar (JSX puramente
   decorativo). Cambios notables: `bg-white`→`bg-surface`, hardcoded `#fff9f6`→`bg-surface-2`
   (visualmente equivalente, pero ahora es un token del sistema), `border-border/40|/60`→
   `border-border` (marco de card) o `border-border-soft` (divisor del window-chrome), se quitó
   `shadow-2xl`/`shadow-lg` en el marco y en los badges flotantes (regla dura de "sin sombra de
   card", §5/§13) apoyándose únicamente en el borde para la separación visual. Los 3 puntos de
   "traffic light" (rojo/amarillo/verde) del window-chrome, antes en hex crudo (`#e5484d`,
   `#E5A059`, `#6b8e7b`), se remapearon a los tokens de color más cercanos del sistema
   (`bg-alert-text`, `bg-gold`, `bg-sage`) para no introducir colores fuera de §2. Los badges
   "En 7 días"/"Mañana" y los puntos de categoría en "Movimientos" se remapearon a las parejas
   oficiales de §4 (`accent-rose`/`rose-bg` para la categoría rosa, `gold`/`gold-bg`+`gold-text`
   para la categoría dorada) en vez de los legacy `ring`/`warning`.
7. **Badges flotantes de `HeroMockup` (2 `motion.div` con delay).** Se decidió **quitarlos sin
   reemplazo animado** (renderizado estático, siempre visibles) en vez de portarlos a CSS puro
   con `transition`/`IntersectionObserver`: son puramente decorativos, su fade-in solo se veía
   una vez al cargar la página y no aportan información — mantenerlos estáticos simplifica el
   código y evita depender de Framer Motion en esta sección, coherente con que el resto de
   sub-lote A ya no usa `motion` en absoluto.
8. **Guard de auth (loading state).** Solo remapeo de las 2 clases legacy
   `bg-background`/`text-foreground` → `bg-bg`/`text-text` en el div de loading, más
   `text-gray-400` → `text-muted` en el texto "Cargando..." (dentro del mismo bloque, en alcance
   de línea). La lógica (`useAuth`, `isLoaded`, redirect a `/dashboard` si `userId`) no se tocó.
9. **Import cleanup.** Se retiraron los imports de `ClickSpark` y `TextType` (únicos consumidores
   confirmados por `explore_UX-37.md`, ya sin uso tras esta migración). Se mantuvieron los
   imports de `Aurora`, `ShinyText`, `GradientText`, `StarBorder`, `SpotlightCard`, `CountUp` y
   todo lo relacionado a `motion`/`useScroll`/`useTransform` porque **siguen siendo consumidos**
   por las secciones Features/Stats/HowItWorks/CTA/Footer, fuera de este sub-lote (confirmado
   línea por línea contra el inventario del explorer antes de tocar imports).

## Archivos modificados

- `apps/client/src/views/Landing.tsx` — único archivo tocado.

No se modificó ni se borró ningún archivo de `apps/client/src/components/react-bits/`
(confirmado con `git status --short`).

## Verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` exit 0 (bundle generado sin errores de tipo).

```
pnpm --filter @estetica/client lint
```
→ Exit 1, pero **los 4 errores reportados están todos fuera de mi alcance**: 2 en
`components/react-bits/Aurora/Aurora.tsx` (`react-hooks/refs`, `prefer-const`), 1 en
`components/react-bits/SplitText/SplitText.tsx` (`react-hooks/set-state-in-effect`), 1 en
`components/react-bits/TextType/TextType.tsx` (`react-hooks/refs`) — pre-existentes en
componentes `react-bits/` que este sub-lote tenía prohibido tocar (su limpieza es sub-lote D).
`Landing.tsx` no aparece en la salida del linter: cero errores y cero warnings propios.

`git diff --stat` / `git status --short` confirman que el único archivo tocado en esta sesión
fue `apps/client/src/views/Landing.tsx`.
