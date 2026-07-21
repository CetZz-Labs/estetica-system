# impl_UX-37-C — Rediseño Shear Fase 2 (Landing pública), sub-lote C

## Alcance

Sub-lote C de `UX-37`: sección **HOW IT WORKS** (3 pasos), **CTA final** y **FOOTER**, en
`apps/client/src/views/Landing.tsx` (único archivo tocado). Adicionalmente se remapeó el
`<div>` raíz del `return` (línea ~127, `bg-background text-foreground` → `bg-bg text-text`):
no estaba explícitamente asignado a ningún sub-lote anterior (A tocó solo el guard de auth y
Nav/Hero/HeroMockup, B tocó Features/Stats) y quedaba como único resto de tokens legacy fuera
de mi alcance nominal; lo corregí porque (a) es un remapeo de 1 línea sin riesgo, (b) soy el
último sub-lote que edita contenido de `Landing.tsx` — sub-lote D solo borra `react-bits/` y
hace `pnpm remove`, no vuelve a tocar el archivo — y (c) el acceptance criteria de `UX-37` exige
cero uso de `bg-background`/`text-foreground` al cerrar, verificado por grep específico sobre
`Landing.tsx`.

No se tocó Nav/Hero/`HeroMockup()` (sub-lote A) ni Features/Stats (sub-lote B). No se tocó ni
borró ningún archivo de `apps/client/src/components/react-bits/` (confirmado con
`git status --short apps/client/src/components/react-bits` → sin salida).

## Decisiones de diseño

1. **HOW IT WORKS — número de paso (reemplazo de `ShinyText` + `animate-ping`).** El círculo de
   número dejó de usar gradiente (`bg-gradient-to-br from-primary via-primary/90 to-primary/70`)
   + `ShinyText` (texto blanco con shine) + anillo `animate-ping`. Se reemplazó por un círculo
   estático con **rotación determinística de tinte** reutilizando el array `sectionTints` ya
   definido en el archivo (rose → sage → gold → wine, mismo criterio que Features/Stats en
   sub-lote B y que el avatar-tint de `docs/design.md` §7.10): fondo `tint.bg` (`bg-rose-bg` /
   `bg-sage-bg` / `bg-gold-bg`) y número en `tint.text` (`text-accent` / `text-sage` /
   `text-gold`), `font-serif font-bold`, sin anillo ni shine. Se prefirió esta rotación de tinte
   por sobre un `bg-wine` fijo en los 3 círculos porque el CTA final de esta misma sección ya usa
   el único bloque `wine` sólido de la página (§1.3/§7.5) — repetir `wine` en los 3 círculos de
   paso habría introducido una segunda superficie de acento fuerte compitiendo visualmente con el
   CTA. La consigna permitía `text-wine` **o** `text-accent`; se usó la paleta completa de 4
   tintes (que incluye ambos) en vez de fijar uno solo, por consistencia con el patrón ya
   establecido en el resto del archivo.
2. **`motion.div` de la sección (header, cada paso, número, contenido) → JSX estático.** Se
   aplanaron los 4 niveles de `motion.div` (`initial`/`whileInView`/`viewport`/`transition`) a
   `<div>` planos, mismo criterio aplicado por sub-lote A (Nav/Hero) y B (Features/Stats headers):
   el catálogo de animaciones permitidas de `docs/design.md` §13 es taxativo
   (fade/opacity/background-color/color, sin fade-in-on-scroll para bloques de sección) y la
   lista "❌ Qué NO hacer" prohíbe librerías externas de animación.
3. **Fondo de la sección — quitado el gradiente decorativo.** Se retiró
   `<div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />`
   (gradiente prohibido por §1.1/"❌ Qué NO hacer") y se aplicó `bg-bg` plano directamente al
   `<section>`, mismo patrón que Hero/Features/Stats.
4. **Remapeo de tokens en textos de la sección.** Eyebrow "Cómo funciona":
   `text-primary/70 bg-primary/5 rounded-full` (legacy) → chip pill idéntico al ya usado en
   Features/Stats (`bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold
   uppercase tracking-widest`), para consistencia visual entre las 3 secciones que comparten el
   mismo patrón de eyebrow. Título `text-foreground`→`text-wine` (igual que los `<h3>` de
   Features/Stats). Cuerpo `text-gray-500`→`text-text-2`. Label "Paso {n}" `text-primary/60`→
   `text-muted` (mismo tratamiento que un label de KPI §7.4: mayúsculas, atenuado, no compite con
   el título). `<h4>` del título de paso `text-foreground`→`text-text`.
5. **CTA final — `Aurora` → bloque `bg-wine` sólido (§1.3/§7.5).** Se retiró el `<Aurora
   colorStops={...} />` (vía `ogl`) y los 2 blobs decorativos `blur-3xl` (`bg-primary/5`,
   `bg-ring/5`, prohibidos por §1.1). El contenedor pasó de `bg-card border border-border/60
   rounded-3xl ... shadow-sm` a `bg-wine rounded-card` sin borde ni sombra (§5/§13: "sin sombra de
   card"). Texto sobre el fondo `wine`: título `text-white`; párrafo secundario y microcopy final
   ("Sin compromiso...") en `style={{ color: 'var(--color-accent-tint)' }}` — mismo patrón exacto
   ya usado en el bloque "Ingresos de la semana" de `Dashboard.tsx` (línea 487/495) para texto
   secundario sobre `wine`, en vez de instanciar una clase Tailwind nueva (`--color-accent-tint`
   sí está expuesta como token `@theme inline`, pero se prefirió replicar el patrón inline ya
   auditado en `Dashboard.tsx` por consistencia entre los dos únicos bloques `wine` de toda la
   app).
6. **Botón CTA primario (reemplazo de `StarBorder`) — decisión de contraste.** El botón "Crear
   cuenta gratis" pasó del borde animado `StarBorder` a un botón primario estándar §7.2, pero
   **invertido en blanco sobre wine** (`bg-white text-wine`) en vez del primario estándar
   `bg-accent text-white`: sobre fondo `wine` (`#6B3444`), `accent` (`#B76E84`) pierde
   diferenciación de contraste frente al fondo oscuro (ambos son tonos rosados/vino de luminosidad
   media-baja, contraste insuficiente para un CTA principal), mientras que blanco sólido sobre
   `wine` da el máximo contraste posible y es coherente con el patrón de avatar "Dueña/admin"
   (§7.10: `wine` de fondo + texto claro). Radio `rounded-ctrl` (no `rounded-full`), sin
   `hover:shadow`/lift, solo `hover:opacity-90` (§7.2/§13).
7. **Botón CTA secundario "Iniciar sesión" sobre `wine`.** No existe en `docs/design.md` una
   variante de botón secundario pensada para fondo `wine` (el secundario estándar §7.2 es
   `bg-surface border-[dotted] text-wine`, ilegible sobre `wine`). Se optó por un outline blanco
   translúcido (`border border-white/30 hover:bg-white/10 text-white`), consistente con el
   criterio de "cambio de opacidad/fondo, sin sombra ni lift" de §13, documentado aquí como
   variante ad-hoc justificada por la ausencia de precedente en el sistema (no hay otro botón
   sobre bloque `wine` en el resto de la app — el bloque de `Dashboard.tsx` no lleva botones).
8. **`motion.section`/`motion.div` de stagger en el CTA → JSX estático**, mismo criterio que el
   resto del sub-lote.
9. **Footer — solo remapeo de tokens, confirmado sin componentes react-bits.** `border-border/60`
   → `border-border`; `bg-card/50` → `bg-surface` (mismo fondo que el header/nav, ya migrado en
   sub-lote A, para dar consistencia de "chrome" superior/inferior de la página);
   `hover:text-foreground` → `hover:text-text`; `text-gray-400` → `text-muted` (nav de links y
   copyright). El único cambio estructural fue aplanar `<motion.footer initial="hidden"
   whileInView="visible" variants={fadeIn}>` a `<footer>` estático, ya que no había ningún
   componente `react-bits` en esta sección (confirmado, coincide con el digest del explorer).
10. **Verificación de cierre de imports.** Tras este sub-lote, `ShinyText`, `Aurora` y
    `StarBorder` no tienen ningún uso restante en `Landing.tsx` (grep de sus 3 nombres sobre el
    archivo final → 0 resultados) — se quitaron sus 3 imports. `motion`/`type Variants` de
    `motion/react` tampoco tienen ya ningún uso residual (grep de `motion\.` y `Variants` → 0
    resultados) — se quitó el import completo, junto con las 3 constantes `fadeUp`/`fadeIn`/
    `stagger` que solo esas 3 secciones consumían.

## Archivos modificados

- `apps/client/src/views/Landing.tsx` — único archivo tocado en esta sesión (confirmado con
  `git status --short apps/client/src` — los demás archivos listados como modificados en el
  working tree son de sesiones/sub-lotes previos ajenos a este trabajo, no fueron abiertos ni
  escritos por este implementer).

No se modificó ni se borró ningún archivo de `apps/client/src/components/react-bits/`.

## Verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` exit 0 (bundle generado sin errores de tipo).

```
pnpm --filter @estetica/client lint
```
→ Exit 1, pero los 4 errores reportados son los mismos 3 componentes `react-bits/` ya
documentados como pre-existentes en `impl_UX-37-A.md`/`impl_UX-37-B.md` (2 en
`react-bits/Aurora/Aurora.tsx`, 1 en `react-bits/SplitText/SplitText.tsx`, 1 en
`react-bits/TextType/TextType.tsx`, todos `react-hooks/refs` o similares, fuera de mi alcance —
su limpieza es sub-lote D), más 3 warnings pre-existentes de `react-hooks/incompatible-library`
en `RegistroModal.tsx`/`Negocio.tsx`/`Turnos.tsx` (uso de `watch()` de react-hook-form, no
relacionados con `UX-37`). `Landing.tsx` no aparece en ningún punto de la salida del linter:
cero errores y cero warnings propios.

Grep de cierre sobre `Landing.tsx`: `ShinyText|Aurora|StarBorder|motion|Variants|bg-background|
text-foreground|bg-card|bg-primary|text-primary|bg-muted|text-muted-foreground|border-border/|
text-gray-|shadow-|from-primary|bg-ring|border-ring|animate-ping` → 0 coincidencias.

`git diff --stat -- apps/client/src/views/Landing.tsx` (259 inserciones, 494 eliminaciones,
acumulado sobre A+B+C ya que las sesiones previas siguen sin commitear) y
`git status --short apps/client/src/components/react-bits` (sin salida) confirman el único
archivo tocado por este sub-lote.
