# impl_UX-39-frontend — Landing pública, refinamiento: caustics en el hero + reveal "mazo de cartas"

**Feature:** UX-39 — Landing pública — refinamiento: efecto de luz tipo "caustics" en el hero + rediseño del reveal de cards de Funcionalidades
**Sandbox:** `apps/client/` (único archivo de código tocado: `src/views/Landing.tsx`)
**Timestamp:** 2026-07-21
**Sin dependencias nuevas:** se reutiliza `motion` ya instalada en UX-38 (`apps/client/package.json` → `"motion": "12.42.2"`). No se tocó `package.json`/`pnpm-lock.yaml`.

## Archivo modificado

- `apps/client/src/views/Landing.tsx` (único archivo).

## 1. Hero — efecto "caustics" (luz bajo el agua)

Técnica elegida: **2 paneles SVG con `feTurbulence` + `feDisplacementMap` desplazando un círculo sólido tokenizado**, tal como sugiere la opción A del digest — se descartó la alternativa de `feTurbulence` + `feColorMatrix`/`feComponentTransfer` (banding puro) porque el desplazamiento de un plano sólido da un borde "ondulado" más legible como luz/agua, y porque encaja mejor con la aclaración de §13.1 ("displacement map sobre formas/planos de color sólido").

Estructura por panel (`motion.svg` con `viewBox="0 0 400 400"`):
- `<filter>` con `feTurbulence type="fractalNoise" baseFrequency="…" numOctaves="2"` (2 octavas para acotar costo de recomputo por frame) + `<animate>` SMIL sobre `baseFrequency` (22s / 19s, `repeatCount="indefinite"`) que hace "respirar" el ruido.
- `feDisplacementMap in="SourceGraphic" in2="turb…" xChannelSelector="R" yChannelSelector="G" scale="…"` + `<animate>` SMIL sobre `scale` (15s / 13s) para variar la amplitud del desplazamiento — el desfase entre el período de `baseFrequency` y el de `scale` evita que el loop se perciba repetitivo a corto plazo.
- `feGaussianBlur stdDeviation` final para suavizar bordes.
- Un `<circle>` relleno con color plano tokenizado (`fill="var(--gold)"` / `fill="var(--accent-rose)"`, tomados directamente de los custom properties de `:root` en `index.css`, no hex nuevos) con el filtro aplicado y `opacity` baja (0.38–0.4).
- El `<svg>` wrapper (`motion.svg`) además anima `x`/`y` con **4 keyframes no lineales** (`[0, a, b, c, 0]`) vía `motion`, sumando un drift lento (26s/32s) por encima del movimiento interno del filtro — dos capas de movimiento con periodos distintos (turbulencia interna + drift externo) para la sensación de "movimiento constante" pedida.
- `mix-blend-soft-light` / `mix-blend-overlay` (utilidades core de Tailwind, sin config nueva) para que el panel "ilumine" el fondo en vez de pintarlo como bloque opaco.

Se agregaron además **2 blobs de apoyo** (`bg-sage`, `bg-accent`, ya tokens en uso en el archivo) con `blur-3xl` + `mix-blend-mode` y trayectorias `x`/`y`/`scale` de 4-5 keyframes no lineales (reemplazan los 3 blobs de UX-38 que solo iban 0→a→0), para dar profundidad de capas detrás de los paneles de caustics.

**Rendimiento:** se evaluó evitar filtros SVG "recalculando en loop" per la advertencia del digest; se optó por mantenerlos porque son solo 2 paneles, acotados a `numOctaves="2"`, tamaño de `viewBox` fijo 400×400 (no fullscreen), y porque el desplazamiento vía SMIL es la técnica explícitamente sugerida por la tarea para lograr "caustics" reales (transform/opacity puro no puede simular refracción de luz). El drift adicional de posición sí se resolvió con `motion` (transform, GPU-friendly) en vez de mover el `viewBox`/atributos SVG, minimizando el costo extra. No se detectó degradación notoria en `vite build`/dev; el build sigue completando en ~1s.

Todo el conjunto vive en un `<div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">` — detrás del contenido (`z-10` en el grid del hero) y sin bloquear clicks, igual que UX-38.

## 2. Features — reveal "mazo de cartas"

Se reemplazó el `motion.div` contenedor con `variants={featuresContainer}` (stagger de contenedor) por **reveal por-card individual**: cada card es un `motion.div` con `initial`/`whileInView` propios (factory `featureCardMotion(i, prefersReducedMotion)`), `viewport={{ once: true, amount: 0.35 }}` (se mantiene `once: true` como pide el acceptance criteria).

- Estado inicial: `opacity: 0, y: 90, scale: 0.78, rotate: i % 2 === 0 ? -10 : 10, rotateX: -30` — simula una carta repartida desde un mazo (rotación 2D alternada + leve giro 3D `rotateX`).
- Estado final: `opacity: 1, y: 0, scale: 1, rotate: 0, rotateX: 0`, `transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: (i % 3) * 0.16 }` — el delay se calcula por **columna** (`i % 3`, grid de 3 columnas) en vez de por índice absoluto, para que el despliegue se note "en oleada" fila por fila sin acumular demoras excesivas en la última fila.
- `style={{ transformPerspective: 1400 }}` en cada card + `style={{ perspective: 1400 }}` en el contenedor grid habilitan el giro 3D (`rotateX`) sin herencia de perspectiva desde un ancestro no-motion.
- `whileHover={{ scale: 1.02, transition: { duration: 0.15, ease: 'easeOut' } }}` (con `transition` inline para no chocar con la transición de entrada) reemplaza el `whileHover` + `transition` global previo.
- Con `prefersReducedMotion`, el factory devuelve solo `{ opacity: 0 } → { opacity: 1 }` (sin escala/rotación/3D), consistente con el resto del archivo.

Se eliminaron las variants `fadeSlideUp` y `featuresContainer` (quedaron sin uso tras el refactor); se mantienen `fadeSlideUpShort` (Stats) y `statsContainer` (Stats) intactas — Stats/Cómo funciona/CTA/Footer/nav no se tocaron.

## Accesibilidad (`prefers-reduced-motion`)

- Los 2 paneles de caustics: se omiten los `<animate>` SMIL internos (`{!prefersReducedMotion && (...)}`) y se pasa `animate={undefined}` al `motion.svg` externo → el panel queda estático (visible, tinte y forma fijos, sin desplazamiento ni drift).
- Los 2 blobs de apoyo: mismo patrón condicional ya usado en UX-38 (`animate={prefersReducedMotion ? undefined : {...}}`).
- Cards de Features: reveal reducido a fade puro (sin scale/rotate/rotateX) vía el factory `featureCardMotion`.

## Guardrails verificados al cierre

- `grep -n "linear-gradient|radial-gradient|conic-gradient|bg-gradient-|box-shadow" Landing.tsx` → sin resultados.
- Un único `bg-wine` sólido en toda la página (bloque CTA final, sin tocar) — confirmado con grep.
- `grep -rn "from 'motion" apps/client/src` → solo `views/Landing.tsx`; ninguna otra vista importa `motion`.
- `git diff apps/client/package.json` → sin cambios míos (el único diff pendiente, `"motion": "12.42.2"`, es preexistente de UX-38, no se reinstaló nada).
- Colores usados en los paneles/blobs: `var(--gold)`, `var(--accent-rose)` (custom properties ya definidas en `:root` de `index.css`), `bg-sage`, `bg-accent` (clases Tailwind ya en uso en el archivo) — cero hex/colores nuevos.
- `mix-blend-soft-light`/`mix-blend-overlay` son utilidades core de Tailwind v4, sin tocar config.

## Resultado de verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` completó sin errores. Exit 0.
```
dist/assets/index-CwURomhm.css     52.67 kB
dist/assets/index-S1mHjfIq.js   1,625.68 kB
✓ built in 1.08s
```
(único warning: chunk > 500kB, preexistente y no bloqueante, no relacionado con este cambio).

```
pnpm --filter @estetica/client lint
```
→ Exit 0. `0 errors, 4 warnings` — los 4 warnings son preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`), ninguno en `Landing.tsx`.

## Decisiones técnicas (ADR)

1. **Displacement map vs. color-matrix puro:** se eligió `feDisplacementMap` sobre un `<circle>` sólido (opción A del digest) en vez de tintar ruido vía `feColorMatrix`/`feComponentTransfer` (que hubiera requerido un `feFlood` + `feComposite` para inyectar color) porque el resultado visual de un plano sólido "ondulado" se lee más claramente como luz refractada, y reduce un paso más de la cadena de filtros (menor costo por frame).
2. **2 paneles, no 3+:** se limitó a 2 paneles de caustics (más 2 blobs simples de apoyo) en vez de 3+ capas con filtro, priorizando la advertencia de rendimiento del digest — la sensación de "vivo" se refuerza combinando drift de `motion` (barato) con solo 2 regiones de recomputo de filtro SVG (más caro pero acotado).
3. **Delay por columna (`i % 3`) en vez de por índice absoluto:** con 6 features y stagger por índice puro, la última card hubiese esperado ~0.8-1s tras entrar en viewport; agrupar por columna da una cascada perceptible por fila sin demoras excesivas acumuladas.
