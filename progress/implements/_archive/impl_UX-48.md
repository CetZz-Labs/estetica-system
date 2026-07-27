# impl_UX-48 — Landing: reveal horizontal más marcado + eliminación de línea curva ("Cómo funciona")

## Alcance

Sandbox: `apps/client` exclusivamente. Único archivo tocado: `apps/client/src/views/Landing.tsx`.

## Cambio 1 — Reveal horizontal más marcado (pasos de "Cómo funciona")

En el `motion.div` de cada paso (`steps.map`), se mantuvo intacta la alternancia existente
(`i % 2 !== 0 ? ... : ...` → paso 1 izquierda, paso 2 derecha, paso 3 izquierda) y solo se
cambió magnitud + transición:

- `x: i % 2 !== 0 ? 24 : -24` → `x: i % 2 !== 0 ? 140 : -140`
- `transition={{ duration: 0.5, ease: 'easeOut' }}` → `transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}`

Valores finales elegidos: distancia `140px`, `bounce: 0.4` (dentro del rango sugerido 0.3–0.5,
perceptible como rebote pero sin overshoot excesivo que dificulte lectura del texto),
`duration: 0.8s`.

Rama `prefersReducedMotion` sin tocar: `initial={prefersReducedMotion ? false : {...}}` /
`whileInView={prefersReducedMotion ? undefined : {...}}` se preservó tal cual — con reduced
motion activo no se anima nada.

El círculo numerado interno (`motion.div` con `viewport={{ margin: '-50% 0px -50% 0px' }}`) no
se tocó, sigue con su reveal independiente (opacity/scale).

## Cambio 2 — Eliminación de la línea curva animada con scroll

Se eliminó por completo:

- El bloque `<div aria-hidden>` con los 2 `<svg>` superpuestos (trazo fijo `text-dotted` +
  `motion.path` con `pathLength` ligado a `howItWorksProgress`) y su comentario largo explicativo.
- La constante `howItWorksPathD` y su comentario (confirmado con grep que no tenía otro
  consumidor antes de borrarla).
- La declaración `const howItWorksRef = useRef<HTMLElement>(null)` y
  `const { scrollYProgress: howItWorksProgress } = useScroll({ target: howItWorksRef, offset: [...] })`,
  junto con su comentario — sin otro consumidor tras retirar la línea curva.
- El atributo `ref={howItWorksRef}` en el `<section id="como-funciona">` (único lugar donde se
  usaba el ref, exclusivamente como target de `useScroll`).
- El import `useScroll` de `motion/react` (quedó sin uso en el archivo tras retirar el bloque
  anterior; `useRef` se mantiene, sigue usado por `funcionalidadesSectionRef`, `numberRef`,
  `TiltCard`, `Magnetic`).

No se tocó el `z-10` del `motion.div` de cada paso (clase que antes coexistía con el `z-0` de la
línea eliminada) — se dejó tal cual siguiendo la indicación de que no era crítico limpiarla si no
rompía nada; no genera ningún efecto visual adverso sin la línea.

## Verificación

```
pnpm --filter @estetica/client build   → exit 0 (tsc -b && vite build OK, sin errores)
pnpm --filter @estetica/client lint    → exit 0, 0 errors (4 warnings preexistentes de
                                          react-hooks/incompatible-library en ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx — no
                                          relacionados con este cambio, no tocan Landing.tsx)
grep "howItWorksPathD\|howItWorksProgress\|howItWorksRef" apps/client/src/views/Landing.tsx
                                        → sin coincidencias (exit 1), confirmando limpieza total.
```

`git status --porcelain` confirma que el único archivo modificado por esta tarea es
`apps/client/src/views/Landing.tsx` (el resto de archivos listados como modified/untracked en el
working tree son preexistentes a esta sesión, no tocados por este implementer).

## Estado

Feature `UX-48` implementada y verificada (build + lint en verde). **No se marcó `"done"` en
`feature_list.json`** — corresponde al `reviewer`.
