# impl_UX-37-B — Rediseño Shear Fase 2 (Landing pública), sub-lote B

## Alcance

Sub-lote B de `UX-37`, según delegación del líder: sección **FEATURES** (header + grilla de
features, antes `HorizontalScrollFeatures()`) y sección **STATS/IMPACT** (4 KPIs), en
`apps/client/src/views/Landing.tsx` (único archivo tocado).

No se tocó Nav/Hero/`HeroMockup()` (ya migrados en sub-lote A) ni How it works/CTA final/Footer
(sub-lote C, todavía pendientes — siguen usando `ShinyText`/`Aurora`/`StarBorder`, que no se
tocaron). Tampoco se tocó ningún archivo de `apps/client/src/components/react-bits/` (sub-lote D
se encarga de borrarlos).

## Decisiones de diseño

1. **Reemplazo del scroll horizontal atado a scroll vertical (cambio estructural intencional).**
   `HorizontalScrollFeatures()` usaba `useScroll`/`useTransform` de Framer Motion sobre un
   contenedor `h-[300vh]` + `sticky top-0` para lograr un efecto de scroll-jacking: al hacer
   scroll vertical, un `motion.div` con `style={{ x }}` desplazaba horizontalmente 6 cards dentro
   de un viewport fijo. Esto se reemplazó por un **grid estático** de layout normal:
   `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6` (mismo patrón que
   `Servicios.tsx`/`Profesionales.tsx`/`Dashboard.tsx`, y coherente con §6.3 de `docs/design.md`).
   Se eliminó por completo la función `HorizontalScrollFeatures()`, el `useRef`/`targetRef`, y el
   `<div className="relative h-[300vh]"><div className="sticky ...">` — la sección Features ahora
   vive en el flujo normal del documento, sin `position: sticky` artificial ni dependencia de
   `scrollYProgress`. Esto **no es un simple remapeo de tokens**: es un cambio de estructura de
   layout, pedido explícitamente por el plan/`explore_UX-37.md` porque el patrón de scroll-jacking
   depende de Framer Motion (librería externa de animación, prohibida por la lista "❌ Qué NO
   hacer" de `docs/design.md`: *"Prohibido... librerías externas de animación"*) y porque el
   catálogo de animaciones permitidas (§13) es taxativo (fade/opacity/background-color/color, sin
   parallax de scroll). Documentado aquí explícitamente para que el reviewer no lo marque como
   scope creep.
2. **Contenido de las 6 features: preservado íntegro.** Se mantuvo el array `features` (icono,
   título, descripción, `featured`/`stat` cuando aplica) sin tocar el copy ni el orden. Se dejó el
   campo `colorKey` de cada feature sin uso (metadata de estilo obsoleta tras el cambio de
   esquema de tinte) para minimizar el diff sobre datos de contenido — no genera error de
   TypeScript ni de lint porque los literales de objeto no se validan por propiedades no
   consumidas.
3. **`GradientText` (título "Todo lo que necesitas...") → título estático serif.** Se reemplazó
   por un `<h3 className="... font-serif text-wine">` sin animación de gradiente (prohibida por
   §1.1 y la lista "❌ Qué NO hacer"). El eyebrow label ("Funcionalidades") pasó de
   `text-primary/70 bg-primary/5 rounded-full` (tokens legacy) a un chip pill Shear
   `bg-rose-bg text-accent rounded-pill` — mismo patrón que el badge del hero migrado en
   sub-lote A ("CRM para centros de estética"), para mantener consistencia visual entre
   secciones. Se redujo el tamaño de fuente de `lg:text-9xl` (desproporcionado respecto al resto
   de encabezados de sección del archivo, que usan `lg:text-5xl`/`lg:text-6xl`) a
   `text-3xl sm:text-4xl lg:text-5xl`, alineado con el resto del documento.
4. **`SpotlightCard` (spotlight que sigue el mouse) → tarjeta genérica §7.3.** Cada feature ahora
   es `bg-surface border border-border rounded-card p-6 sm:p-8`, sin sombra ni glow. El ícono va
   en un contenedor `rounded-card` con tinte de fondo — se implementó **rotación determinística de
   tinte por índice** (`sectionTints`: rose → sage → gold → wine, mismo criterio de rotación que
   el avatar-tint de §7.10) en vez de un tinte fijo único, para dar variedad visual sin salir del
   catálogo de tokens de §2. `sectionTints` reemplaza por completo al objeto `featureColors`
   (que usaba tokens legacy `bg-primary/5`, `border-ring/20`, `text-warning`, etc., ya no
   referenciados en el archivo tras este sub-lote).
5. **Bloque "Big stat number" (`featureDetails`, cifras 128/47/0/∞ agrupadas por `colorKey`) —
   eliminado sin reemplazo.** Esta pieza no era contenido único por feature (se compartía entre
   pares de features con el mismo `colorKey`, ej. features 0 y 5 mostraban ambas "128"), sino un
   adorno del diseño de card grande original pensado para el formato de scroll horizontal
   (tipografía `text-5xl`/`text-6xl`). Al aplanar a grid de cards más chicas, esa cifra duplicaba
   el propósito de la sección Stats/Impact inmediatamente inferior. Se conservó en cambio el
   badge `feat.stat` (que sí es contenido único de las 2 features `featured: true`, "128 clientes
   activos" / "30% más rápido en decisiones") como una línea de texto con ícono `FiTrendingUp` en
   `text-accent`, separada por un borde superior sutil (`border-border-soft`).
6. **`CountUp` (contador animado) → cifra estática.** Reemplazado por `<p className="font-serif
   text-[34px] font-semibold text-text leading-none">` — mismo patrón exacto de jerarquía KPI ya
   usado por el componente `KpiCard` de `Dashboard.tsx` (label chico uppercase + cifra Cormorant
   34px). El copy/números de los 4 stats (5 min, 100%, 40%, 24/7 + labels/sublabels) se preservó
   exacto.
7. **`whileHover={{ y: -6 }}` (lift) en las stat cards → eliminado**, junto con el resto del
   `motion.div` que envolvía cada card (`initial`/`whileInView`/`transition`, glow-on-hover con
   `blur-2xl`, `group-hover:scale-110`). Las cards de stat ahora son `<div className="bg-surface
   border border-border rounded-card p-6 text-center">` estático, sin sombra
   (`shadow-sm hover:shadow-xl` retirado) ni efecto de elevación — regla dura §5/§13.
8. **Fade-in-on-scroll (`motion.div` con `initial`/`whileInView`) en ambos headers de sección —
   eliminado también, no solo el lift.** La consigna explícita solo pedía aplanar el lift de las
   stat cards y "cualquier `motion.div` de parallax horizontal asociado" en Features, pero se
   extendió el mismo criterio a los headers de ambas secciones (título + eyebrow de Features y de
   Stats) porque (a) el catálogo de animaciones permitidas de `docs/design.md` §13 no incluye
   fade-in-al-entrar-en-viewport para bloques de sección, (b) la lista "❌ Qué NO hacer" prohíbe
   explícitamente el uso de librerías externas de animación, y (c) mantiene consistencia con el
   criterio ya aplicado en sub-lote A (que retiró toda dependencia de `motion` de Nav/Hero). El
   import de `motion` se conservó porque **sigue siendo consumido** por How it works/CTA/Footer,
   fuera de este sub-lote (confirmado con grep antes de tocar imports).
9. **Fondos decorativos eliminados.** Se retiraron los `<div className="absolute inset-0
   bg-gradient-to-b from-... via-.../50 to-...">` (gradiente decorativo, prohibido por §1.1) de
   ambas secciones, y el blob decorativo `w-[600px] h-[600px] bg-primary/[0.03] blur-3xl` de
   Stats. Ambas secciones ahora usan `bg-bg` plano (fondo estándar de la app, §2.1), consistente
   con el fondo del hero ya migrado en sub-lote A.
10. **Imports retirados** (ya sin consumidores tras este sub-lote): `GradientText`,
    `SpotlightCard`, `CountUp` (componentes react-bits), `useScroll`/`useTransform` (de
    `motion/react`) y `useRef` (de `react`, solo usado por `HorizontalScrollFeatures`). Se
    mantuvieron `Aurora`, `ShinyText`, `StarBorder` y `motion`/`type Variants` — todos con
    consumidores confirmados en How it works/CTA/Footer, fuera de este sub-lote (sub-lote D borra
    `react-bits/` y las deps recién cuando no quede ningún consumidor).

## Archivos modificados

- `apps/client/src/views/Landing.tsx` — único archivo tocado (confirmado con `git diff --stat`).

No se modificó ni se borró ningún archivo de `apps/client/src/components/react-bits/`.

> Nota: `git status --short` del working tree muestra además otros archivos modificados
> (`AjusteStockModal.tsx`, `AppointmentDetail.tsx`, `CargaMasivaModal.tsx`, `ProductoModal.tsx`,
> `Servicios.tsx`) que **no fueron tocados en esta sesión** — no aparecen en el diff de mis
> ediciones ni fueron abiertos/escritos por este implementer. Se documentan aquí solo para
> transparencia; corresponden a trabajo concurrente ajeno a este sub-lote.

## Verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` exit 0 (bundle generado sin errores de tipo).

```
pnpm --filter @estetica/client lint
```
→ Exit 1, pero **los 4 errores reportados son idénticos a los ya documentados como pre-existentes
en `impl_UX-37-A.md`**, todos fuera de mi alcance: 2 en `react-bits/Aurora/Aurora.tsx`
(`react-hooks/refs`, `prefer-const`), 1 en `react-bits/SplitText/SplitText.tsx`
(`react-hooks/set-state-in-effect`), 1 en `react-bits/TextType/TextType.tsx` (`react-hooks/refs`).
Confirmado con `grep -i "Landing.tsx"` sobre la salida completa del lint: **cero coincidencias** —
`Landing.tsx` no aparece ni una vez, cero errores y cero warnings propios.

`git diff --stat -- apps/client/src/views/Landing.tsx` confirma el único archivo tocado por este
sub-lote (188 inserciones, 348 eliminaciones — el grid estático es sustancialmente más compacto
que el scroll horizontal + la función `HorizontalScrollFeatures` completa que reemplazó).
