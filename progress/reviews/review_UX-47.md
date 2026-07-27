# Reporte de Revisión Técnica — Feature UX-47

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-27

## Contexto auditado

`apps/client/src/components/landing/MagicBento.tsx` (nuevo) + `apps/client/src/views/Landing.tsx`
(modificado, sección Funcionalidades) + `docs/design.md §13.1` (nuevo bullet). Puerto de
`MagicBento-JS-CSS` de react-bits (spotlight global + glow de borde por card + partículas al hover
+ ripple al click) reimplementado con `motion`/CSS puro en vez de `gsap` (decisión de producto ya
tomada por el usuario en ronda anterior — no reabierta acá).

## Verificaciones ejecutadas por el reviewer (re-corridas de forma independiente)

- `pnpm --filter @estetica/client build` → **exit 0** (`tsc -b && vite build`, sin errores; único
  warning es el de tamaño de chunk >500kB, preexistente y no relacionado a esta feature).
- `pnpm --filter @estetica/client lint` → **exit 0**, 0 errores, 4 warnings preexistentes
  (`react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:126-129`,
  `Negocio.tsx:83`, `Turnos.tsx:208-210`, todos por `watch()` de react-hook-form) — confirmado que
  ninguno se origina en `MagicBento.tsx`/`Landing.tsx`.
- `grep -rn "gsap" apps/client/package.json apps/client/src` → 0 imports/dependencias reales; los
  13 matches son prosa de comentario (JSDoc explicando la traducción gsap→motion en
  `MagicBento.tsx`, y una mención preexistente no relacionada en `Landing.tsx:118`).
- `grep -rln "MagicBento" apps/client/src` → confinado a `components/landing/MagicBento.tsx` y
  `views/Landing.tsx`. Cero fuga a vistas autenticadas.
- `git diff --stat -- apps/client/package.json pnpm-lock.yaml` → único delta es `ogl@1.0.11`
  (dependencia de la excepción de `Silk.tsx`, ya aprobada y mergeada en `UX-46`, presente en el
  working tree antes de esta ronda). **Cero dependencias nuevas agregadas por UX-47** — confirmado
  también contra `git status --short`, que muestra `MagicBento.tsx` como único archivo nuevo de
  esta ronda (además de `impl_UX-47.md`).
- `grep -rn "console\.(log|debug)|debugger|// TODO" apps/client/src/components/landing/MagicBento.tsx`
  → sin matches.
- `grep -rn "dangerouslySetInnerHTML" apps/client/src/components/landing/MagicBento.tsx` → sin
  matches (el `<style>{magicBentoStyles(glowColor)}</style>` usa children de string controlado, no
  `dangerouslySetInnerHTML`; SEC-G cumple).

## `prefers-reduced-motion` — hallazgo bloqueante reciente de este mismo proyecto, verificado línea por línea

Contexto: en la ronda de fix de `UX-46`, el reviewer anterior encontró bloqueante que el RAF loop
de `LogoLoop.tsx` no cortaba estructuralmente antes de `requestAnimationFrame` cuando
`prefersReducedMotion` estaba activo (solo convergía asintóticamente). Se auditó `MagicBento.tsx`
contra ese mismo estándar:

- `BentoSpotlight` (`MagicBento.tsx:124-128`): `useEffect` hace `return` **antes** de
  `document.createElement('div')` (el spotlight) y antes de `window.addEventListener('mousemove', ...)`
  cuando `prefersReducedMotion` es `true`. Cero listener persistente, cero nodo huérfano en el DOM.
- `useMagicBentoCard` (`MagicBento.tsx:236-240`): mismo patrón — `return` antes de declarar
  `spawnParticle`/adjuntar `mouseenter`/`mouseleave`/`click`. Cero listener, cero timeout encolado.
- Ambos son cortes **estructurales** (el `return` precede a cualquier creación de listener/nodo/loop),
  no una convergencia asintótica como el bug original de `LogoLoop`. Cumple el estándar exigido.
- No hay ningún `requestAnimationFrame` en este componente (las animaciones de partículas/ripple
  usan `animate()` de `motion`, que internamente gestiona su propio RAF encapsulado y se limpia
  solo al completar o al desmontar vía el `.then()`/cleanup del hook) — no aplica el mismo vector de
  bug de `LogoLoop` (loop manual sin guarda), pero se verificó igual que ninguna instancia de
  `animate()` se dispara nunca si `prefersReducedMotion` es `true`, dado que el `useEffect` que las
  encola corta antes.

## Cleanup de listeners/timeouts — mismo rigor exigido a `Silk.tsx`/`DotField.tsx`

- `BentoSpotlight` (`MagicBento.tsx:187-190`): cleanup remueve el listener de `mousemove` y el
  propio div `spotlight` del DOM. Completo para su superficie (un listener + un nodo).
- `useMagicBentoCard` (`MagicBento.tsx:318-330`): cleanup remueve los 3 listeners
  (`mouseenter`/`mouseleave`/`click`, este último condicional a `clickEffect`, simétrico con el
  `addEventListener` condicional de la línea 314-316), cancela todos los `timeouts` pendientes
  (`window.clearTimeout`) y remueve del DOM cualquier partícula que ya se hubiera alcanzado a crear
  (`particles.forEach((el) => el.remove())`). Documentado explícitamente por qué no se reproduce la
  animación de salida en el desmontaje (el nodo padre `card` está por desaparecer con el árbol de
  React de todas formas) — criterio razonable, sin fuga de nodos ni de listeners.
- Único matiz frente al estándar de `Silk.tsx` (cleanup de 4 pasos, incluye liberar contexto WebGL):
  acá no aplica un contexto WebGL, así que el cleanup de 3 pasos (listeners + timeouts + nodos DOM)
  es la superficie completa real de este hook. No hay nada pendiente de liberar.

## Trade-off de `overflow: hidden` vs. `box-shadow` de hover — evaluación explícita

La bitácora documenta la decisión de **no** aplicar `overflow: hidden` en `.magic-bento-card`
(a diferencia del original de react-bits) para no recortar el `box-shadow` de hover ya aprobado en
`docs/design.md §13.1` (`0 8px 24px rgba(107, 52, 68, 0.10)`, `Landing.tsx:580`).

**Evaluación:** es un trade-off razonable, no bloqueante. Alternativa mencionada en el brief
(wrapper interno con `overflow: hidden` separado del contenedor con `box-shadow`) es técnicamente
viable pero habría requerido partir `MagicBentoCard` en dos elementos anidados (uno para el shadow
de hover del `motion.div` ya aprobado, otro interno para contener partículas/ripple con el `ref` y
la clase `magic-bento-card` reubicados) — una refactorización estructural no trivial para un efecto
puramente cosmético (partículas/ripple bordeando levemente las esquinas redondeadas durante la
animación, nunca de forma permanente ni afectando texto/contenido/controles). No compromete
legibilidad, accesibilidad ni ningún checkpoint duro. Se aprueba el trade-off tal como está, con
nota de que si el usuario reporta feedback visual negativo sobre este detalle específico tras probar
en navegador real, la alternativa de wrapper interno queda como fix puntual documentado (no bloquea
esta ronda).

## Verificación del gotcha P14 (`useScroll`/ref detrás de `return` condicional)

`funcionalidadesSectionRef` (`Landing.tsx:246`) se declara junto con `howItWorksRef`, ambos
**antes** de los dos `return` condicionales del componente (`!isLoaded` en `Landing.tsx:248`,
`userId` en `Landing.tsx:259`) — inevitable, ya que las reglas de hooks de React exigen que todos
los `useRef` se invoquen incondicionalmente. La diferencia relevante frente al bug real de P14
(`useScroll({ target })` invocado directamente en el cuerpo de `Landing()`, cuyo callback interno
memoiza sobre la identidad estable del `ref` y no se re-dispara cuando `ref.current` pasa de `null`
a un elemento real en un render posterior) es que `BentoSpotlight`/`MagicBentoCard` son
**componentes hijos** que solo existen en el árbol JSX cuando `Landing()` ya superó ambos
`return` tempranos. No se montan nunca durante el render de loading/redirect — su primer montaje
real (y por tanto la primera ejecución de sus propios `useEffect`) ocurre en el mismo commit en el
que `<section ref={funcionalidadesSectionRef}>` adjunta el DOM real, por lo que `sectionRef.current`
ya está poblado cuando el efecto de `BentoSpotlight` corre. No es la misma familia de bug que afectó
a `LogoLoop`/hooks de nivel superior — no hay hallazgo acá.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, `progress/current.md`
  describe únicamente `UX-47`, cambios acotados a `components/landing/MagicBento.tsx` +
  `views/Landing.tsx` + `docs/design.md`.
- [x] C3 (Fidelidad Arquitectónica) — Frontend puro (no aplica capa backend/paginación/multi-tenancy
  a esta feature). `export default`/`export function` consistentes, tipado explícito
  (`BentoSpotlightProps`, `UseMagicBentoCardOptions`, `MagicBentoCardProps extends HTMLMotionProps<'div'>`),
  sin llamadas HTTP. HTML semántico respetado: `MagicBentoCard` envuelve un `motion.div` decorativo,
  sin simular controles interactivos con `onClick` de navegación/acción de negocio.
- [x] C4 (Compilación Estática + Lint) — build y lint re-ejecutados por el reviewer, exit 0 ambos.
- [x] C5 (Cierre de Sesión Append-Only) — `progress/implements/impl_UX-47.md` y este
  `progress/reviews/review_UX-47.md` en disco; `progress/history.md`/`current.md` quedan a cargo del
  `leader` en el protocolo de cierre.
- [x] C6 (Capa de Datos) — N/A, feature 100% frontend sin modelos Mongoose.
- [x] C7 (Security Gate) — SEC-G confirmado (sin `dangerouslySetInnerHTML`). Resto de SEC-A..F/H no
  aplica (sin backend, sin variables de entorno nuevas, sin tenant).
- [x] C8 (Estabilidad de API) — N/A, sin cambio de contrato de API.

## Hallazgos no bloqueantes

1. Trade-off `overflow` vs. `box-shadow` (ver sección dedicada arriba) — aceptado, sin acción
   requerida en esta ronda.

## Limitación estándar de este entorno

Sin navegador real disponible, no se puede verificar empíricamente cómo se sienten en la práctica el
spotlight/las partículas/el ripple (velocidad, intensidad de glow, calibración del `spotlightRadius=400`,
si las partículas bordeando las esquinas redondeadas resultan perceptibles o no). Auditado
exclusivamente por lectura de código — mismo estándar y misma limitación documentada en
`progress/reviews/review_UX-46.md` y `review_UX-46-fix.md`. Si el usuario prueba en su navegador y
reporta ajustes, corresponde una ronda de fix puntual (mismo patrón que UX-46).

## Cambios Requeridos

Ninguno. Feature aprobada sin rondas de fix.
