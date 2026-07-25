# impl_UX-38-frontend — Landing pública, capa de animación vistosa (motion)

**Feature:** UX-38 — Landing pública — capa de animación vistosa (hero + scroll reveal)
**Sandbox:** `apps/client/` (única vista tocada: `src/views/Landing.tsx`)
**Timestamp:** 2026-07-21

## Dependencia instalada

- `pnpm --filter @estetica/client add motion` → quedó fijada en `apps/client/package.json` como `"motion": "12.42.2"`.
- Única dependencia nueva (no se agregó gsap/ogl/react-bits, conforme al acceptance criteria).
- Import path verificado contra los tipos del paquete instalado (`node_modules/motion/dist/react.d.ts` re-exporta `framer-motion` completo, incluye `motion`, `useReducedMotion` y el tipo `Variants`): se usó `import { motion, useReducedMotion } from 'motion/react';` y `import type { Variants } from 'motion/react';`.

## Archivo modificado

- `apps/client/src/views/Landing.tsx` (único archivo de código tocado).

## Puntos de animación agregados (sección → API de `motion`)

1. **Hero — badge superior** (`CRM para centros de estética`, antes `<div>`, ahora `motion.div`): fade+slide-down de entrada única (`initial`/`animate`, sin loop).
2. **Hero — fondo decorativo (pedido adicional del usuario, 2026-07-21):** 3 blobs `motion.div` (`rounded-full`, `blur-3xl`, opacidad 15-20%) en tokens ya existentes del sistema de diseño — `bg-accent-rose` (opacity-20), `bg-gold` (opacity-15), `bg-sage` (opacity-15) — posicionados `absolute` dentro de un contenedor `absolute inset-0 z-0 pointer-events-none aria-hidden="true"` detrás del contenido del hero (contenido pasó a `relative z-10`). Cada blob anima `x`/`y`/`scale` en loop (`repeat: Infinity`, `ease: 'easeInOut'`, duraciones 12s/14s/17s con pequeños `delay` para desincronizar) — "formas decorativas en movimiento lento" explícitamente permitido por §13.1. Sin gradientes CSS (`linear-gradient`/`radial-gradient`/`bg-gradient-*`), sin `box-shadow`, sin colores nuevos (todos los tokens ya estaban en uso en el archivo o en `docs/design.md` §2/§14). El loop se desactiva completamente cuando `prefersReducedMotion` es true (se omite la prop `animate`, quedando el blob estático).
3. **HeroMockup (componente completo):** ahora recibe prop `prefersReducedMotion: boolean` y es un `motion.div` con fade+slide-up de entrada única (`initial`/`animate`, sin loop — es el mockup completo, no repite el loop del punto 4).
4. **HeroMockup — 2 badges flotantes:** cada uno es `motion.div` con float loop (`animate: { y: [0,-8,0] }` y `{ y: [0,-6,0] }`, `repeat: Infinity`, `ease: 'easeInOut'`, duraciones 4s/3.2s con `delay: 0.6` en el segundo para que no se muevan en sincronía). Cuando `prefersReducedMotion` es true, se les pasa un objeto de props vacío (`{}`) — se elimina `animate`/`transition`, quedan estáticos.
5. **Features — grid de cards:** contenedor `motion.div` con `variants={featuresContainer}` (`staggerChildren: 0.08`), `initial="hidden"` `whileInView="visible"` `viewport={{ once: true, amount: 0.3 }}`; cada card es `motion.div` con `variants={fadeSlideUp}` (fade+slide-up 20px, `duration: 0.5`) + `whileHover={{ scale: 1.02 }}` (micro-hover explícitamente permitido por §13.1, `transition` tween 0.15s solo para el hover).
6. **Stats:** mismo patrón pero más sutil y con timing distinto para no ser monótono — contenedor `motion.div` con `variants={statsContainer}` (`staggerChildren: 0.05`, más rápido que Features), cada card `variants={fadeSlideUpShort}` (slide de solo 12px vs 20px de Features, `duration: 0.4`). Sin hover (a diferencia de Features).
7. **Cómo funciona — steps:** cada step es `motion.div` con `initial`/`whileInView` de `x` (no `y`, para diferenciarse de las otras secciones), alternando signo (`i % 2 !== 0 ? 24 : -24`) para reforzar el zig-zag ya existente del layout (`sm:flex-row-reverse`), `viewport={{ once: true, amount: 0.4 }}`.
8. **CTA final:** el bloque `bg-wine` (único bloque wine sólido de la página, sin tocar) se convirtió en `motion.div` con solo `opacity` de entrada (`initial={{opacity:0}}`, `whileInView={{opacity:1}}`, `duration: 0.6`) — sin animar posición ni el color/fondo en sí, tal como pedía el digest.
9. **Header/nav, mobile menu, Footer:** sin cambios — fuera de alcance explícito (punto 6 de la tarea del leader y digest del explorer).

## Accesibilidad (`prefers-reduced-motion`)

- `const prefersReducedMotion = useReducedMotion();` en el componente `Landing` (top-level, sin condicionales, respeta las reglas de hooks).
- Se propaga a `HeroMockup` vía prop (`prefersReducedMotion={!!prefersReducedMotion}`) para desactivar el float de sus 2 badges.
- Los 3 blobs decorativos del fondo del hero condicionan `animate` con `prefersReducedMotion ? undefined : {...}` — si el usuario prefiere menos movimiento, el blob queda estático (visible pero sin loop).
- El resto de las animaciones (`whileInView` de Features/Stats/Cómo funciona/CTA, fades de entrada única) no son loops infinitos y no requieren guard adicional — son transiciones cortas de una sola vez, consistentes con el criterio de aceptación ("loops/parallax se desactivan o reducen").

## Guardrails verificados al cierre

- Un único `bg-wine` sólido en toda la página (línea `className="bg-wine rounded-card p-8 sm:p-12 lg:p-16"`, sección CTA) — confirmado con grep, no se agregó ningún otro.
- Sin `gradientes` (`linear-gradient`/`radial-gradient`/`bg-gradient-*`) ni `box-shadow` de card en ningún punto agregado.
- Sin `dark:` / modo oscuro.
- `grep -rn "from 'motion" apps/client/src` → solo `views/Landing.tsx` importa `motion`; ninguna otra vista quedó afectada.
- Todos los colores usados en los blobs decorativos (`bg-accent-rose`, `bg-gold`, `bg-sage`) ya eran tokens existentes en uso dentro del propio `HeroMockup` (no se introdujo ningún color nuevo).

## Decisiones técnicas (ADR) no 100% especificadas en el digest

- El digest sugería animar "el mockup completo" O los badges; se optó por ambos con intensidad distinta (mockup: solo fade+slide de entrada única, sin loop; badges internos: float loop) para que el mockup no compita visualmente con el propio hero al cargar, y el loop quede acotado a los elementos decorativos pequeños, tal como sugiere el punto 3 de la recomendación del explorer.
- Para Stats se usó slide vertical corto (12px, sin hover) en vez de la animación de conteo numérico sugerida como "opcional" en el digest — se priorizó consistencia con el resto del patrón fade+slide (menor riesgo, sin introducir `useMotionValue`/`animate` imperativo que el digest marcaba como fuera del acceptance criteria explícito).
- El efecto de fondo del hero (blobs) fue un pedido adicional del usuario recibido durante la implementación (no estaba en el digest original). Se implementó dentro de los mismos límites de §13.1 ("formas decorativas en movimiento lento" ya estaba explícitamente permitido en el texto de la excepción), reutilizando tokens de color ya presentes en el archivo y el mismo hook `useReducedMotion` ya introducido para el float del `HeroMockup`. Se colocó en un contenedor `pointer-events-none aria-hidden="true"` con `z-0` y el contenido del hero se promovió a `z-10` para garantizar que los blobs queden estrictamente detrás y no interfieran con la legibilidad ni con clicks.

## Resultado de verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` completó sin errores. Exit 0.
```
dist/assets/index-B9MZeJpz.css     52.20 kB
dist/assets/index-BLcZTtGO.js   1,623.55 kB
✓ built in 1.02s
```
(único warning: chunk > 500kB, preexistente y no bloqueante, no relacionado con `motion`).

```
pnpm --filter @estetica/client lint
```
→ Exit 0. `0 errors, 4 warnings` — los 4 warnings son preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, por uso de `watch()` de react-hook-form), ninguno en `Landing.tsx` ni relacionado con `motion`.
