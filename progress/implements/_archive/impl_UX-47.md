# impl_UX-47 — Landing pública: sección Funcionalidades con tarjetas MagicBento

## Archivos creados / modificados

- **Nuevo:** `apps/client/src/components/landing/MagicBento.tsx`
  - `BentoSpotlight` (componente, montado UNA vez en la sección): div `position: fixed` en
    `document.body` que sigue al mouse + actualiza `--glow-x`/`--glow-y`/`--glow-intensity`/
    `--glow-radius` de cada `.magic-bento-card` dentro de la sección; también inyecta la hoja de
    estilos (`<style>`) del glow de borde/partículas/ripple/`textAutoHide`.
  - `useMagicBentoCard` (hook interno, no exportado): partículas al `mouseenter`/`mouseleave` +
    ripple al `click`, animadas con `animate()` de `motion`.
  - `MagicBentoCard` (componente exportado): wrapper del `motion.div` de cada card — agrega
    `ref` interno + clase `magic-bento-card`, reenvía el resto de props de `motion.div` (incluido
    `whileHover`) intactas vía spread.
- **Modificado:** `apps/client/src/views/Landing.tsx`
  - Import de `BentoSpotlight`/`MagicBentoCard`.
  - Constante `MAGIC_BENTO_GLOW_COLOR = '183, 110, 132'` (accent `#B76E84`, `docs/design.md §2.3`
    en formato "R, G, B").
  - `funcionalidadesSectionRef` (`useRef<HTMLElement>(null)`) en `<section id="funcionalidades">`
    (sin `return` condicional por delante en el árbol de este componente — `ref` acotado seguro,
    mismo criterio que `howItWorksRef`, `docs/patterns-frontend.md § P14`).
  - `<BentoSpotlight sectionRef={funcionalidadesSectionRef} spotlightRadius={400}
    glowColor={MAGIC_BENTO_GLOW_COLOR} prefersReducedMotion={!!prefersReducedMotion} />` montado
    como primer hijo de la sección.
  - El `motion.div` de cada card del `features.map` pasa a ser `<MagicBentoCard ... glowColor=
    {MAGIC_BENTO_GLOW_COLOR} particleCount={12} clickEffect prefersReducedMotion={...}>` — MISMAS
    props de reveal/hover que ya tenía (`initial`/`whileInView`/`viewport`/`transition`/
    `whileHover` con el `boxShadow` ya aprobado), sin tocar el contenido interno (ícono/título/
    descripción/stat).
  - `<p>` de descripción de cada card gana la clase `magic-bento-clamp-text` (`textAutoHide`).
- **Modificado:** `docs/design.md §13.1` — nuevo bullet documentando que `MagicBento` NO reabre
  `gsap`/`three` (a diferencia de la excepción `ogl` de UX-46, acá no se instaló ninguna
  dependencia nueva).

## Traducción gsap → `motion`/CSS (detalle por efecto)

| Efecto original (gsap) | Traducción | Nota |
|---|---|---|
| `ParticleCard` spawn: `gsap.fromTo(scale 0→1, opacity 0→1, duration 0.3, ease 'back.out(1.7)')` | `animate(el, { scale: [0,1], opacity: [0,1] }, { duration: 0.3, ease: 'backOut' })` | `motion-utils` expone `backOut` como clave de easing string (`cubicBezier(0.33, 1.53, 0.69, 0.99)`), equivalente directo — no hizo falta armar un array de bezier a mano. |
| Deriva infinita: `gsap.to(x/y aleatorios ±50, rotation, duration 2-4s, repeat:-1, yoyo:true)` | `animate(el, { x:[0,driftX], y:[0,driftY], rotate:[0,rotation] }, { duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' })` | `repeatType: 'mirror'` = `yoyo:true` exacto. |
| Pulso de opacidad: `gsap.to(opacity 0.3, duration 1.5s, repeat:-1, yoyo:true)` | `animate(el, { opacity: [1, 0.3] }, { duration: 1.5, repeat: Infinity, repeatType: 'mirror' })` | Mismo idiom. |
| Salida (`mouseleave`): `gsap.to(scale:0/opacity:0, duration 0.3, ease 'back.in(1.7)', onComplete: remove)` | `animate(el, { scale: 0, opacity: 0 }, { duration: 0.3, ease: 'backIn' }).then(() => el.remove())` | `AnimationPlaybackControlsWithThen` (motion-dom) expone `.then()` — reemplazo directo del `onComplete`. |
| `GlobalSpotlight`: posición/opacidad suavizadas con `gsap.to(duration 0.1-0.5, ease 'power2.out')` | `transition: left 0.1s ease-out, top 0.1s ease-out, opacity 0.3s ease-out;` inline en el div + asignación directa de `style.left/top/opacity` en el handler de `mousemove` | Sin librería — el navegador interpola solo, técnica indicada explícitamente en el prompt como preferible a `motion` para este caso puntual. |
| Glow de borde: variables CSS `--glow-x`/`--glow-y`/`--glow-intensity`/`--glow-radius` | `updateCardGlowProperties()` — asignación directa vía `style.setProperty`, sin animar | 100% CSS (idéntico al original, que tampoco animaba esta parte). |
| Ripple: `gsap.fromTo(scale 0→1, opacity 1→0, duration 0.8, ease 'power2.out')` | `animate(el, { scale: [0,1], opacity: [1,0] }, { duration: 0.8, ease: 'easeOut' }).then(() => el.remove())` | `'power2.out'` no tiene nombre propio en `motion`; se usó `'easeOut'` (`cubicBezier(0,0,0.58,1)`, curva estándar de desaceleración de la librería) — visualmente equivalente, sin necesitar un array de bezier a medida. Confirmado contra los tipos instalados (`node_modules/.pnpm/framer-motion@12.42.2.../motion-utils/dist`): `easingLookup` incluye `linear, easeIn, easeInOut, easeOut, circIn, circInOut, circOut, backIn, backInOut, backOut, anticipate` como claves string válidas de `Easing`. |

`enableTilt`/`enableMagnetism` del componente original **no se portaron** (pedido explícito del
usuario) — no hay ningún `rotateX`/`rotateY` por mousemove ni desplazamiento magnético agregado
por esta feature (el `TiltCard`/`Magnetic` que ya existían en `Landing.tsx` para el hero/CTA no se
tocaron ni se reutilizaron acá).

## Integración con el `motion.div` existente sin romper `whileHover`

`MagicBentoCard` es un wrapper delgado: recibe todas las props que ya tenía el `motion.div` de la
card (`initial`, `whileInView`, `viewport`, `transition`, `whileHover` — incluido el `boxShadow`
de hover ya aprobado en `docs/design.md §13.1`) vía `...motionProps` y las reenvía intactas al
`motion.div` interno, agregando únicamente `ref={cardRef}` (usado por `useMagicBentoCard` para
adjuntar los listeners de partículas/ripple) y la clase `magic-bento-card` (leída por
`BentoSpotlight` vía `querySelectorAll('.magic-bento-card')` para actualizar el glow de borde).
Landing.tsx no perdió ningún prop existente de la card: solo cambió el nombre del componente
(`motion.div` → `MagicBentoCard`) y se agregaron los 4 props nuevos del efecto
(`glowColor`/`particleCount`/`clickEffect`/`prefersReducedMotion`).

**Gotcha evitado — `overflow: hidden` hubiera roto el `boxShadow` de hover:** el algoritmo
original de react-bits usa `overflow: hidden` en la card para contener partículas/ripple dentro
de sus bordes. Se decidió **no** aplicarlo acá: `overflow: hidden` en el mismo elemento que tiene
`box-shadow` recorta también su propio `box-shadow` (no solo el contenido), lo que hubiera
invisibilizado la sombra de hover ya aprobada (`0 8px 24px rgba(107, 52, 68, 0.10)`). Trade-off
documentado: partículas/ripple pueden bordear levemente las esquinas redondeadas de la card
durante la animación en vez de quedar perfectamente recortados — visualmente menor, y prioriza no
romper una relajación de diseño ya formalizada.

## prefers-reduced-motion

- `BentoSpotlight`: si `prefersReducedMotion` es `true`, el `useEffect` retorna antes de crear el
  div de spotlight y de adjuntar el listener de `mousemove` — cero spotlight, cero actualización
  de `--glow-intensity` (queda en su default `0` definido en la hoja de estilos), por lo tanto el
  `::after` de glow de borde no pinta nada. La hoja de estilos se sigue montando (inofensivo, solo
  define la regla CSS).
- `useMagicBentoCard`: si `prefersReducedMotion` es `true`, el `useEffect` retorna antes de
  adjuntar los listeners de `mouseenter`/`mouseleave`/`click` — cero partículas, cero ripple.
- Cubre los 4 efectos pedidos por el usuario (`enableSpotlight`, `enableBorderGlow`,
  `enableStars`/partículas, `clickEffect`/ripple) con la misma guarda binaria (todo o nada), igual
  criterio que `Silk`/`DotField` (un solo frame estático en vez de desmontar el componente).

## Verificación

```
pnpm --filter @estetica/client build   → exit 0 (tsc -b && vite build, sin errores)
pnpm --filter @estetica/client lint    → exit 0, 0 errores (4 warnings preexistentes de
                                          react-hooks/incompatible-library en
                                          ProfesionalModal.tsx/RegistroModal.tsx/Negocio.tsx/
                                          Turnos.tsx, no relacionados a esta feature)
```

Greps de cierre:
- `grep -rn "gsap" apps/client/package.json apps/client/src` → 0 imports/dependencias reales,
  solo comentarios de prosa explicando la traducción gsap→motion (en `MagicBento.tsx`) y una
  mención preexistente no relacionada en `Landing.tsx` ("en vez de gsap SplitText, ya...").
- `grep -rln "MagicBento" apps/client/src` → confinado a
  `components/landing/MagicBento.tsx` y `views/Landing.tsx`.
- `git diff --stat -- apps/client/package.json pnpm-lock.yaml` → único cambio presente es `ogl`
  (dependencia de la excepción puntual de UX-46/Silk, ya en el working tree antes de esta sesión,
  no tocada por UX-47). Cero dependencias nuevas agregadas por esta feature.

## Pendiente para el reviewer

No se cambia `"status"` de `UX-47` en `feature_list.json` — queda en `"in_progress"`, tarea
exclusiva del `reviewer` marcarla `"done"` tras auditar contra `CHECKPOINTS.md`.
