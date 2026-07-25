# Bitácora de Implementación — UX-45-fix2 (Landing pública, 2da ronda de refinamiento visual)

**Feature:** UX-45 — Landing pública, rediseño integral (reabierta, ronda `fix2` post-feedback de usuario en navegador real).
**Alcance de esta ronda:** 4 puntos del `reopen_note`, exclusivos de `apps/client/src/views/Landing.tsx` y `apps/client/src/components/landing/StatIcons.tsx`.

## Archivos modificados

- `apps/client/src/views/Landing.tsx` (modificado)
- `apps/client/src/components/landing/StatIcons.tsx` (reescrito por completo)

Ningún otro archivo tocado (`git status --porcelain apps/client/src/` solo lista estos dos).

## Punto 1 — Íconos ya hechos de una librería establecida (no SVG a medida)

**Set elegido: `react-icons/pi` (Phosphor), variante `Duotone`.** Razón: el usuario pidió explícitamente descartar los 5 SVG dibujados a mano y usar íconos ya hechos, con un estilo "más sólido/ilustrativo" que las líneas finas de Feather (`react-icons/fi`, que sigue usándose sin cambios en Funcionalidades). Phosphor `Duotone` rellena el ícono con dos capas de opacidad sobre `currentColor` (trazo sólido + relleno tenue), dando más peso visual sin salirse de la paleta monocromática por tinte que ya usaba cada card (`sectionTints`). Se evaluaron también `react-icons/tb` (Tabler, solo líneas — no resolvía el pedido de "más peso") y `react-icons/hi2` (Heroicons v2 `Fill` — más geométrico/duro, menos cálido); Phosphor Duotone fue el que mejor calzó con la calidez/minimalismo Shear.

Mapeo (mismos 2 lugares que la ronda anterior, sin tocar Funcionalidades):

| Card | Antes (SVG a medida) | Ahora (`react-icons/pi`) | Animación |
|---|---|---|---|
| Hero — Clientes activos | `AnimatedPeopleIcon` | `PiUsersThreeDuotone` | `pulse` (scale 1↔1.12) |
| Hero — Más eficiencia | `AnimatedTrendIcon` | `PiTrendUpDuotone` | `float` (y 0↔-5) |
| Hero — Setup inicial | `AnimatedClockIcon` | `PiClockDuotone` | `rotate` (±7°) |
| Stats — Setup inicial | `AnimatedClockIcon` | `PiClockDuotone` | `rotate` |
| Stats — Datos centralizados | `AnimatedLayersIcon` | `PiStackDuotone` | `float` |
| Stats — Más eficiencia | `AnimatedTrendIcon` | `PiTrendUpDuotone` | `float` |
| Stats — Disponible 24/7 | `AnimatedBarsIcon` | `PiChartBarDuotone` | `pulse` |

`StatIcons.tsx` se reescribió como un único wrapper reutilizable `AnimatedStatIcon` (default export) que recibe el ícono por prop (`icon: IconType` de `react-icons`) en vez de exportar 5 componentes SVG distintos — exactamente la alternativa que planteaba el pedido ("mantenerlo como wrapper de animación reutilizable con el ícono inyectado por prop"). Expone `animation?: 'rotate' | 'pulse' | 'float'` (tipo `StatIconAnimation`, exportado) para elegir el loop temático por ícono, con `prefers-reduced-motion` leído internamente (congela sin transición).

**Tamaño aumentado** (pedido explícito "más grandes y visibles"): contenedor de hero `w-12 h-12` → `w-16 h-16`, ícono `size={22}` → `size={32}`; contenedor de Stats `w-12 h-12` → `w-16 h-16`, ícono `size={22}` → `size={30}`.

Sin dependencias nuevas: `react-icons/pi` ya viene incluido en el paquete `react-icons` ya instalado (confirmado: `git diff --stat apps/client/package.json pnpm-lock.yaml` sin contenido real, solo advertencia de fin de línea).

## Punto 2 — Blobs del hero: más dinámicos, sin parallax de scroll, fondo extendido hasta el marquee

- **Más dinámicos:** `HeroBlob` ahora anima `opacity` y `scale` en el mismo `animate`/`transition` que ya tenía el drift de `x`/`y` (mismo `duration`/`delay`/`repeat: Infinity`/`repeatType: 'mirror'`). Nuevas props opcionales `opacityRange?: [number, number]` (default `[0.18, 0.42]`) y `scaleRange?: [number, number]` (default `[0.85, 1.15]`); el blob del CTA usa `opacityRange={[0.28, 0.55]}` (centrado en su valor previo `opacity-40`).
- **Parallax de scroll retirado:** se eliminó la prop `parallaxY: MotionValue<number>` de `HeroBlobProps` por completo (no se dejó opcional, ya que ningún caller la necesitaba tras el retiro) junto con el wrapper `motion.div` externo que aplicaba `style={{ y: parallaxY }}` — `HeroBlob` pasó de 2 nodos anidados a 1 solo `motion.div`. En `Landing()` se eliminaron `const { scrollY } = useScroll()` (sin `target`), las 3 constantes `blobParallaxY1/2/3` (`useTransform`) y `const ctaBlobY = useMotionValue(0)`, junto con los imports ya no usados (`useTransform`, tipo `MotionValue`). El blob del CTA (que reutilizaba `HeroBlob` con un `MotionValue` estático en 0) se actualizó quitando esa prop sin perder su drift/blend/opacidad.
- **Fondo extendido hasta el marquee:** se envolvió el `<section>` del hero + `<TrustMarquee />` en un `<div className="relative overflow-hidden bg-bg">` compartido (antes ese `overflow-hidden`/`bg-bg` vivía solo en el `<section>` del hero). Los 6 `<HeroBlob>` pasaron a ser hijos directos de ese wrapper (mismas clases de posición) en vez de hijos del `<section>`, de modo que su `blur-3xl` alcanza visualmente el área de `TrustMarquee`. Los blobs con offsets `-bottom-*` ahora anclan contra el borde inferior del wrapper más alto (hero + marquee), extendiendo su bleed naturalmente hacia/detrás de la franja. Para que ese bleed sea perceptible, `TrustMarquee` bajó su fondo de `bg-surface` (opaco) a `bg-surface/90`, con `relative z-10` explícito para apilarse por encima de los blobs (`z-0`) del wrapper padre — el `<section>` del hero también quedó con `relative z-10` (ya no necesita su propio `overflow-hidden`, delegado al wrapper).

## Punto 3 — Línea de "Cómo funciona": SVG serpenteante con `pathLength`

Se reemplazó el `<div>` recto (`scaleY` ligado a `howItWorksProgress`) por dos `<svg viewBox="0 0 40 600" preserveAspectRatio="none">` superpuestos con el mismo `path`:

```
M20 0 Q40 75 20 150 Q0 225 20 300 Q40 375 20 450 Q0 525 20 600
```

(constante `howItWorksPathD`, curva tipo "S" repetida verticalmente con 4 segmentos `Q` — quadratic Bézier alternando la curvatura izquierda/derecha). El primer `<svg>` (clase `text-dotted`) pinta el "carril" completo y fijo con `<path>` estático; el segundo (clase `text-accent`, cumpliendo el requisito de usar el token `accent`) pinta el trazo animado con `<motion.path style={{ pathLength: prefersReducedMotion ? 1 : howItWorksProgress }} />` — la técnica estándar de "dibujo de SVG al hacer scroll" vía la prop `pathLength` de `motion.path` (0→1 directo, sin calcular `strokeDashoffset` a mano), ligada al mismo `MotionValue` `howItWorksProgress` ya existente. Se preservó intacto: el `z-index` corregido en la ronda anterior (`z-0` en el contenedor, `z-10` en cada paso), `aria-hidden="true"`, y el comportamiento con `prefersReducedMotion` (línea completa sin animar, `pathLength: 1` fijo).

## Punto 4 — Card del CTA final: `TiltCard` en hover

Se envolvió el `motion.div` existente (`bg-wine rounded-card ...`, único bloque wine sólido de la página) con el componente `TiltCard` ya construido para las tarjetas de estadística del hero — sin reimplementar `rotateX`/`rotateY`/`useSpring`. `TiltCard` no recibe `className` (queda en su default `''`): todas las clases visuales (`overflow-hidden`, `rounded-card`, `bg-wine`, padding) permanecen en el `motion.div` interno, que también sigue manejando el fade-in por scroll (`initial`/`whileInView`/`viewport`/`transition`) sin cambios. El botón con hover magnético (`Magnetic`) sigue dentro, sin conflicto: ni `TiltCard` ni `Magnetic` llaman `stopPropagation()` en sus handlers de `mousemove`/`mouseleave`, así que ambos reciben el evento por bubbling y animan en simultáneo (tilt de la card completa + desplazamiento magnético del botón).

## Verificación

```
pnpm --filter @estetica/client build   → Exit Code 0 (dist/assets/index-Dz6QT0Z4.js 1,644.37 kB, gzip 498.79 kB — único warning preexistente de chunk-size, no bloqueante)
pnpm --filter @estetica/client lint    → Exit Code 0, 4 warnings preexistentes react-hooks/incompatible-library (ProfesionalModal.tsx:83, RegistroModal.tsx:126, Negocio.tsx:83, Turnos.tsx:208) — mismos 4 de siempre, cero warnings nuevos, ninguno en Landing.tsx ni StatIcons.tsx.
```

## Invariantes re-verificados (no rotos)

- `grep -rniE "three|@react-three|gsap|@gsap" apps/client/src` → único match real es el nombre del ícono `PiUsersThreeDuotone` (falso positivo de la palabra "Three"), más los 2 comentarios históricos ya existentes (líneas 87-88 de Landing.tsx) y el falso positivo ya documentado de `Negocio.tsx:13` (subcadena `gsap` en `notificationSettingsApi`). Cero imports reales de `three`/`@react-three/*`/`gsap`/`@gsap/react`.
- `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → únicamente `views/Landing.tsx` y `components/landing/StatIcons.tsx`. Sin fuga a vistas autenticadas.
- Único bloque `bg-wine` sólido: línea 713 (`className="relative overflow-hidden bg-wine rounded-card ..."`, dentro de `TiltCard`). El resto de las apariciones de `bg-wine` son `colorClassName` de blobs decorativos (blur+opacidad, grandfatherizadas) o strings/comentarios de configuración.
- `docs/design.md` no fue tocado en esta ronda (fuera del alcance del pedido, que se limitó explícitamente a los 2 archivos de Landing).
- Sin dependencias nuevas: `git diff apps/client/package.json pnpm-lock.yaml` sin contenido real (solo normalización de fin de línea LF→CRLF).
