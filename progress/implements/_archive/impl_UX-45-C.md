# impl_UX-45-C — Landing pública, sub-lote C (Stats con conteo animado + Cómo funciona con línea de scroll)

**Feature:** UX-45 — "Landing pública — rediseño integral desde cero, llamativo y con animaciones en toda la página" (ronda C de 4: A → B → C → D). Sigue `"in_progress"` en `feature_list.json`; esta ronda NO cierra la feature ni la toca.

**Sandbox:** `apps/client/` exclusivamente. Único archivo de código fuente modificado: `apps/client/src/views/Landing.tsx`. No se tocó ningún otro archivo.

---

## 1. Contexto leído antes de codear

- `progress/implements/impl_UX-45-A.md` (limpieza de deps WebGL/GSAP, Hero reconstruido, decisión de `useScroll()` SIN `target` en el hero por el `return` temprano de `!isLoaded`).
- `progress/implements/impl_UX-45-B.md` (franja de confianza, Features bento + reveal clip-path, relajación puntual de `box-shadow` en hover de cards).
- `progress/explores/explore_UX-45.md`, secciones 4 (Stats) y 5 (Cómo funciona) de la composición propuesta.
- `docs/design.md` completo — reutilicé el patrón de barra de progreso ya documentado en §7.7 ("Poco stock": track `dotted` + relleno proporcional en color semántico) tanto para la barra de Stats como para la línea vertical de Cómo funciona, sin inventar un token nuevo. No relajé ninguna regla adicional.
- `.claude/rules/frontend.md`.
- `apps/client/src/views/Landing.tsx` completo (post ronda B) antes de tocar Stats/Cómo funciona.
- `react-icons/lib/iconBase.d.ts` y `node_modules/.pnpm/framer-motion@12.42.2.../dist/es/motion/features/viewport/index.mjs` para confirmar que `onViewportEnter`/`viewport.margin` y `useMotionValueEvent`/`animate`/`useMotionValue` están disponibles vía el re-export de `motion/react` → `framer-motion` (no son deps nuevas, ya viene todo en el paquete `motion` instalado).

---

## 2. Stats — conteo animado + barra de progreso

Nuevo componente `AnimatedStat` (agregado al final del archivo, junto a `HeroBlob`/`TiltCard`/`Magnetic`). Reemplaza el `motion.div` inline que antes solo aplicaba `variants={fadeSlideUpShort}` sobre un número estático.

- **Un solo `MotionValue`** (`progress`, rango 0→1) impulsa a la vez el número y la barra — evita mantener dos animaciones desincronizadas.
- **Número:** `useMotionValueEvent(progress, 'change', ...)` escribe `numberRef.current.textContent = String(Math.round(latest * value))` directo sobre un `<span ref={numberRef}>`, **sin `setState` por frame** (evita re-render de React en cada tick, cumpliendo la restricción explícita de la consigna).
- **Disparo:** `onViewportEnter` + `viewport={{ once: true, amount: 0.5 }}` sobre el `motion.div` raíz de la card — dispara `animate(progress, 1, { duration: 1.4, ease: [0.16,1,0.3,1] })` una sola vez; `once: true` en el propio observer de motion garantiza que no se re-anime al volver a scrollear. El `motion.div` raíz conserva su `variants={fadeSlideUpShort}` (fade/slide heredado del stagger del contenedor padre, sin tocar `statsContainer`) — `variants` (propagación del padre) y `onViewportEnter`+`viewport` (observer propio) conviven sin conflicto, son features independientes de la librería.
- **Barra de progreso:** debajo de cada cifra, track `h-1 rounded-pill bg-dotted overflow-hidden` (mismo patrón que "Poco stock" §7.7) + relleno `motion.div` con `style={{ scaleX: progress }}` y `origin-left` — se llena en sincronía exacta con el conteo porque comparte el mismo `MotionValue`, sin `useTransform` intermedio (progreso 0→1 ya es directamente el `scaleX` que se necesita).
- **Color del relleno:** `barColor` se deriva de `iconText` (`tint.text`, ej. `text-accent`) reemplazando `text-` por `bg-` (`bg-accent`) — mismo token sólido que ya usa el ícono/stat individual, sin inventar un color nuevo (patrón ya usado por `marqueeDotColors` en la franja de confianza de la ronda B, que usa exactamente `bg-accent`/`bg-sage`/`bg-gold`/`bg-wine` en el mismo orden que `sectionTints`).
- **`prefersReducedMotion`:** `progress` nace en `1` (no en `0`) vía `useMotionValue(prefersReducedMotion ? 1 : 0)`, el `<span>` renderiza `value` directo en vez de `0` en su primer render, y `handleViewportEnter` hace `progress.set(1)` en vez de llamar `animate()` — la barra ya está llena al 100% sin transición y el número ya muestra el valor final, sin animar nada.

## 3. Cómo funciona — línea de progreso ligada a scroll + círculos que se iluminan

### 3.1 Línea vertical (`scaleY` vía `useScroll` con `target` acotado)

- Nuevo `howItWorksRef` (`useRef<HTMLElement>(null)`) atado a `<section id="como-funciona" ref={howItWorksRef}>`. A diferencia del hero (ronda A, `useScroll()` SIN `target` por el `return` temprano de `!isLoaded`), esta sección **no** está detrás de ningún `return` condicional, así que `useScroll({ target: howItWorksRef, offset: ['start end', 'end start'] })` es seguro — el ref ya está hidratado en el primer render real donde existe la sección. Documentado in-line en el código para que la ronda D no reintroduzca dudas sobre cuándo es seguro usar `target`.
- `offset: ['start end', 'end start']` recorre 0→1 mientras la sección **atraviesa completamente** el viewport (progreso 0 cuando el borde superior toca el borde inferior del viewport al entrar, progreso 1 cuando el borde inferior termina de salir por arriba) — tal cual pedía la consigna ("offset razonable para que el progreso vaya de 0 a 1 mientras la sección atraviesa el viewport").
- `scrollYProgress` ya es un `MotionValue` en rango 0→1, así que se usa **directamente** como `scaleY` del relleno (`style={{ scaleY: prefersReducedMotion ? 1 : howItWorksProgress }}`), sin `useTransform` intermedio innecesario.
- Estructura: track `bg-dotted` (`w-1 rounded-pill overflow-hidden`, mismo patrón §7.7 track/relleno) + relleno `motion.div bg-accent origin-top` con el `scaleY`. **No** se usó `stroke-dashoffset` de SVG, tal cual exigía la consigna — `div` angosto con `transform-origin: top` vía la clase Tailwind `origin-top`.
- **Prohibido usar SVG de trazo:** cumplido — es un `div` con `scaleY` CSS puro.
- **Decisión documentada sobre posicionamiento:** el layout de cada paso alterna el lado del círculo (`sm:flex-row-reverse` en pasos impares), por lo que una línea centrada horizontalmente en el wrapper de pasos **no coincide con el centro exacto de cada círculo** en `sm:` y superiores — es un conflicto real entre "línea recta" y "zigzag alternado". En vez de reestructurar el layout alternado ya aprobado (que la consigna pide preservar salvo conflicto real), la línea se implementó como una **columna vertebral narrativa** centrada en el wrapper (`absolute left-1/2 -translate-x-1/2`), visible desde `sm:` en adelante (`hidden sm:block` — en mobile los pasos ya se apilan en una sola columna centrada por `flex-col items-center`, sin zigzag, así que ahí el orden vertical ya comunica la progresión sin necesitar el conector). Esto se documentó explícitamente en un comentario in-line en el código, como pedía la consigna ante esta decisión.

### 3.2 Círculos que se iluminan al cruzar el centro del viewport

- El círculo numerado (antes un `<div>` estático) pasa a ser un `motion.div` anidado dentro del `<div className="shrink-0">` existente (que se conserva sin cambios).
- `initial={{ opacity: 0.45, scale: 0.82 }}` → `whileInView={{ opacity: 1, scale: 1 }}` con `viewport={{ once: true, margin: '-50% 0px -50% 0px' }}` — el `margin: '-50% 0px -50% 0px'` colapsa el área efectiva de detección del `IntersectionObserver` a una línea horizontal exacta en el centro del viewport (top y bottom se contraen un 50% cada uno), técnica estándar de `motion` para aproximar "cruza el centro" con mayor precisión que un `amount` genérico — más preciso que el `viewport={{ amount: 0.5 }}` sugerido como alternativa en la consigna, y explícitamente permitido por ella ("no hace falta que sea matemáticamente exacto, usá tu criterio").
- **Se preservó intacto** el slide lateral alternado por paso que ya existía (el `motion.div` exterior de cada step, con `initial={{ opacity: 0, x: ... }}` / `whileInView` / `viewport={{ amount: 0.4 }}`) — la iluminación del círculo es una capa `motion` anidada adicional, no un reemplazo. Los dos observers de viewport (el del step completo y el del círculo) son independientes y no interfieren entre sí.
- **`prefersReducedMotion`:** `initial={false}` y `whileInView={undefined}` en el círculo (mismo patrón ya usado en `featureCardReveal`/`heroTitleWord` de rondas A/B) — el círculo no recibe ninguna prop de animación de `motion` y queda en su estado final visible (opacity/scale por defecto del DOM, sin clase inline que los sobreescriba) sin transición.

---

## 4. Verificación

```
pnpm --filter @estetica/client build
```
→ Exit 0. `tsc -b` sin errores. Vite build:
```
dist/index.html                     0.79 kB │ gzip:   0.45 kB
dist/assets/index-B0t5zaCU.css     52.92 kB │ gzip:  10.00 kB
dist/assets/index-D4D64gJV.js   1,639.34 kB │ gzip: 497.23 kB
```
(Tamaño estable respecto a la ronda B — solo se agregó un componente nuevo y ~40 líneas de JSX, sin dependencias nuevas; `useMotionValue`/`useMotionValueEvent`/`animate` ya vienen incluidos en el paquete `motion` instalado, re-exportado desde `framer-motion`.)

```
pnpm --filter @estetica/client lint
```
→ Exit 0, 0 errores. Los mismos 4 warnings preexistentes de `react-hooks/incompatible-library` (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, uso de `watch()` de react-hook-form) ya reportados por las rondas A y B — no relacionados con esta ronda, no tocados.

---

## 5. Archivos modificados

- `apps/client/src/views/Landing.tsx` — únicamente: (a) import de `useMotionValue`, `useMotionValueEvent`, `animate` de `motion/react` y `IconType` de `react-icons`; (b) nuevo hook `useScroll({ target: howItWorksRef, offset: [...] })` acotado a la sección "Cómo funciona"; (c) Stats: nuevo componente `AnimatedStat` (conteo animado + barra de progreso) reemplazando el número estático; (d) Cómo funciona: línea vertical `scaleY` ligada a scroll (spine narrativa, `hidden sm:block`) + círculos numerados con iluminación por `whileInView`/`viewport.margin` centrado, preservando intacto el slide lateral alternado existente. Ninguna otra sección (Hero, Features, CTA final, footer, nav) fue tocada. `docs/design.md` no fue tocado en esta ronda.

---

## Estado: implementación completa, pendiente de sub-lote D

Ronda C cerrada funcionalmente (build + lint verdes). El siguiente implementer (ronda D) retoma `Landing.tsx` para CTA final (textura de puntos + forma con blur) y footer (fade-in), y debe actualizar formalmente `docs/design.md §13.1` documentando la relajación de `box-shadow` en hover de cards de Features de la ronda B (valor exacto `0 8px 24px rgba(107, 52, 68, 0.10)`). No se marcó `feature_list.json` — sigue `"in_progress"`.
