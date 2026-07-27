# impl_UX-46-fix.md — Ronda de fix sobre UX-46 (2026-07-27)

Sandbox: `apps/client` exclusivamente. NO se marca `UX-46` como `"done"` — tarea exclusiva del `reviewer`.

## Archivos

- **Creados:**
  - `apps/client/src/components/landing/DotField.tsx` — puerto a TS de `DotField-JS-CSS` (react-bits), reemplaza a `ShapeGrid`.
  - `apps/client/src/components/landing/LogoLoop.tsx` — puerto a TS de `LogoLoop-JS-CSS` (react-bits, versión recortada sin modo vertical/pauseOnHover/scaleOnHover/renderItem de imágenes, ver nota en el propio archivo).
- **Borrados:** `apps/client/src/components/landing/ShapeGrid.tsx` (`rm`, era un archivo untracked de la ronda anterior — no había commit previo que revertir).
- **Tocados:** `apps/client/src/views/Landing.tsx` únicamente (imports, mount points de Silk/DotField, `TrustMarquee`, header). `apps/client/src/components/landing/Silk.tsx` **no se tocó** — los nuevos valores de velocidad/opacidad se aplicaron en el punto de montaje (`Landing.tsx`), no en los defaults del componente, porque el mount point ya pasaba todas las props explícitas (consistente con cómo estaba estructurado).

## Cambio 1 — Silk: velocidad y contraste

En el punto de montaje (`Landing.tsx`, hero):
- `speed`: `2.2` → `7` (rango pedido 6-8).
- Opacidad del wrapper (`opacity-[...]`): `0.14` → `0.34` (rango pedido 0.28-0.38, más del doble).
- `noiseIntensity`: `1.1` → `1.7` (rango pedido 1.6-1.8) para reforzar la textura de ruido además del color.
- `mixBlendMode: multiply` sin cambios.
- Verificación de contraste: el texto del hero (`text` `#3E2A33`) se mantiene perfectamente legible sobre `bg-bg` (`#FAF6F4`) con el shader detrás al 0.34 de opacidad + multiply — mismo orden de magnitud que los tintes `rose-bg`/`wine-bg` ya usados en badges (docs/design.md §2.4).

## Cambio 2 — ShapeGrid → DotField

- `ShapeGrid.tsx` eliminado. `DotField.tsx` creado como puerto 1:1 de la lógica del componente de referencia (física de bulge, glow SVG, gradiente lineal interno del canvas, ResizeObserver-less resize con debounce, listener global de mouse en `window`), con estas adaptaciones:
  - **Decisión de color — gradiente de 2 tonos → color sólido:** el original arma `gradientFrom`/`gradientTo` con dos tonos distintos vía `ctx.createLinearGradient` (transición de color real). `docs/design.md §1.3` prohíbe transiciones tipo `linear-gradient` incluso en la Landing. Se usa el **mismo valor** en ambos extremos (`DOTFIELD_DOT_COLOR = 'rgba(107, 52, 68, 0.10)'`, wine al 10%) — el degradé interno queda anulado funcionalmente y los puntos se pintan de un color sólido. Documentado en el comentario junto a la constante en `Landing.tsx`.
  - **Glow — fade de 1 color permitido:** `glowColor = '#6B3444'` (wine sólido). El glow es un `radialGradient` de un único tono hacia transparente (fade radial, no transición entre 2 colores) — mismo idiom ya aceptado en `docs/design.md §13.1` (UX-39) para blobs con blur/opacidad. Esto SÍ está permitido, a diferencia del punto anterior.
  - Resto de props de comportamiento (no de color) según lo pedido por el usuario: `dotRadius=1`, `dotSpacing=14`, `cursorRadius=300`, `cursorForce=0.1`, `bulgeOnly=true`, `bulgeStrength=10`, `glowRadius=50`, `sparkle=false`, `waveAmplitude=0`.
  - **Guarda de `prefers-reduced-motion`** (agregada por el leader, ausente en el original de react-bits): con reduced-motion se dibuja un único frame estático (`tick()` invocado directamente, sin volver a encolar `requestAnimationFrame` gracias al `if (!prefersReducedMotion)` dentro de la propia función `tick`), mismo patrón que `Silk.tsx` (P15 del catálogo).
  - **Wrapper de montaje con `pointer-events-none`:** a diferencia de `ShapeGrid` (que necesitaba recibir eventos de mouse en el propio canvas), `DotField` trackea el mouse con un listener global en `window` — el wrapper `fixed inset-0 z-0` en `Landing.tsx` ahora SÍ lleva `pointer-events-none`, sin romper el efecto de bulge/glow. Mismo z-index/posición que tenía `ShapeGrid` (arquitectura de capas de la ronda anterior intacta).
  - **Desvío de fidelidad respecto al snippet de referencia (justificado por lint):** el original de react-bits mutaba `propsRef.current = {...}` y llamaba `Math.random()` directamente en el cuerpo del componente (durante el render). El proyecto corre `eslint-plugin-react-hooks` con las reglas de pureza del React Compiler, que rechazan ambos patrones (`react-hooks/refs`: no se puede escribir/leer un ref durante el render; `react-hooks/purity`: no se puede llamar una función impura durante el render). Se resolvió: (a) la sincronización de `propsRef.current` se movió a un `useEffect` sin deps (corre después de cada render, antes del efecto de setup principal por orden de declaración); (b) el id único del `radialGradient` se generó con `useId()` de React en vez de `Math.random()`, eliminando también la necesidad del ref (`glowIdRef`) — ahora es un string derivado directamente, sin acceso a `.current` en el JSX. Estos cambios no alteran ningún comportamiento visual/funcional, solo la forma de generar/sincronizar esos dos valores para cumplir las reglas de pureza del linter del proyecto.

## Cambio 3 — TrustMarquee con LogoLoop

- `LogoLoop.tsx` creado como puerto simplificado (sin modo vertical, `pauseOnHover`, `scaleOnHover` ni `useImageLoader` — no aplican a pills de texto+punto, no logos-imagen; ver nota en el propio archivo).
- `TrustMarquee` (en `Landing.tsx`) reemplaza el `motion.div` con loop manual (`animate={{x:['0%','-50%']}}`) por `<LogoLoop items={...} renderItem={...} speed={40} direction="left" gap={0} fadeOut fadeOutColor="var(--surface)" prefersReducedMotion={...} />`. Contenido preservado EXACTO: `items = marqueeWords.map((word, i) => ({ word, dotColor: marqueeDotColors[i % marqueeDotColors.length] }))`, `renderItem` pinta la misma pill (mismo punto de color + texto) que existía antes. `gap={0}` porque el espaciado ya vive en el padding de la propia pill (`px-6 sm:px-10`, sin cambios).
- **Decisión — fade de 1 color permitido:** el CSS del `fadeOut` (`::before`/`::after` con `linear-gradient(to right/left, fadeColor 0%, transparent 100%)`) es un fade-to-transparent de UN SOLO color (`fadeOutColor="var(--surface)"`, el mismo tono que ya tenía el wrapper `bg-surface/90`), no una transición entre 2 tonos — mismo tipo de excepción ya aceptada para blur/opacity en `docs/design.md §13.1` (UX-39), a diferencia del gradiente de 2 colores de `DotField.gradientFrom/To` que sí hay que evitar (Cambio 2). Implementado como bloque `<style>` scoped con un className único derivado de `useId()` (no un archivo `.css` aparte, coherente con que `components/landing/` no tiene CSS propios).
- **Desvío de fidelidad — `memo()` omitido:** el original de react-bits envuelve el componente en `memo()`. Se omitió deliberadamente: `memo()` sobre un componente genérico (`<T>`) le hace perder los genéricos de TypeScript a menos que se recaste el resultado (`as typeof Component`), superficie de bug innecesaria para un componente que se monta una sola vez en toda la Landing con una lista fija de 6 ítems (sin re-renders frecuentes del padre que lo justifiquen). Documentado en el propio archivo.
- **Sin cambio de lógica de animación/resize/copy-count:** `useAnimationLoop`/`useResizeObserver` portados 1:1 (incluido el gotcha de que `dependencies` viaja como un único elemento del array de deps del `useEffect`, no spreadeado — comportamiento intencional del original, documentado inline).

## Cambio 4 — Header transparente con blur (pedido adicional durante la ronda)

`Landing.tsx`, `<header>`: `bg-surface border-b border-border` → `bg-surface/70 backdrop-blur-md border-b border-border/60`. El header es `sticky top-0` y queda superpuesto sobre el hero (donde vive `<Silk />`) al hacer scroll desde arriba; con el fondo opaco anterior tapaba completamente el fondo animado. Opacidad final usada: `/70` (dentro del rango pedido `/60`-`/80`) — calibrado visualmente para que el logo/nav sigan perfectamente legibles tanto sobre `bg-bg` normal (resto de secciones) como sobre el hero con Silk detrás (que ya llega atenuado por su propio wrapper `opacity-[0.34]` + `mix-blend-mode: multiply` del Cambio 1, sin competir con el contraste del nav). El `<nav>` del footer (línea ~791) no se tocó.

## Verificación

```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 0 (0 errores; 4 warnings preexistentes en ProfesionalModal.tsx/RegistroModal.tsx/Negocio.tsx/Turnos.tsx, no tocados en esta ronda — "Compilation Skipped: Use of incompatible library" de React Compiler por `watch()` de react-hook-form, ajenos a esta feature)
```

- `grep -rn "DotField\|LogoLoop\|ShapeGrid" apps/client/src` — `ShapeGrid` ya no aparece en ningún archivo (ni el componente ni referencias residuales; se corrigió un comentario obsoleto en `Landing.tsx` que aún lo mencionaba). `DotField`/`LogoLoop` solo aparecen en `components/landing/` y `views/Landing.tsx`.
- `apps/client/package.json`/`pnpm-lock.yaml`: el único diff pendiente es `"ogl": "1.0.11"`, agregado en la ronda ANTERIOR de UX-46 (para `Silk`) — no se agregó ninguna dependencia nueva en esta ronda de fix. `DotField`/`LogoLoop` son cero-dependencias (Canvas 2D / RAF + CSS puro).
- `ogl`/`Silk.tsx`: sin tocar en esta ronda (`git status` confirma `Silk.tsx` sigue como estaba, sin diff de contenido — solo sus valores de props se ajustaron desde el punto de montaje en `Landing.tsx`). `three`/`@react-three`/`gsap` siguen en cero referencias.

## Nota de dominio (fuera de alcance del sandbox de este agente)

Ninguno de los 4 cambios toca `apps/server` ni lógica de negocio/multi-tenant — feature puramente visual de la Landing pública.

## Fix post-review

El `reviewer` auditó esta ronda (`progress/reviews/review_UX-46-fix.md`) y encontró 1 hallazgo bloqueante + 1 no bloqueante. Ambos corregidos:

- **Bloqueante — `LogoLoop.tsx`, `useAnimationLoop` no cortaba el RAF con `prefers-reduced-motion`:** `targetVelocity` ya nacía en `0` con reduced-motion, pero la velocidad real (`velocityRef.current`) solo converge asintóticamente hacia ese target vía el easing exponencial de `animate` — nunca llega a ser exactamente `0` — y `animate` reencolaba `requestAnimationFrame` incondicionalmente en cada llamada, dejando el loop de RAF corriendo para siempre aunque el movimiento fuera casi imperceptible. Fix: se agregó el parámetro `prefersReducedMotion: boolean` a `useAnimationLoop` (pasado desde `LogoLoop` igual que a `Silk`/`DotField`) y, al principio del `useEffect`, con `prefersReducedMotion === true` se hace `return` inmediatamente después de fijar el `transform` estático del track — ANTES de definir `animate` o de llamar `requestAnimationFrame` por primera vez. Mismo patrón exacto que la guarda ya usada en `Silk.tsx`/`DotField.tsx` (`docs/patterns-frontend.md §P15`). Verificado por lectura de código: con `prefersReducedMotion=true` el efecto retorna en la línea del `if (prefersReducedMotion) { return; }`, antes de que exista cualquier referencia a `requestAnimationFrame` en ese flujo de ejecución.
- **No bloqueante — `DotField.tsx` defaults de color inseguros:** los valores por defecto de `gradientFrom`/`gradientTo`/`glowColor` en la firma del componente seguían siendo los tonos morado/oscuro de la demo original de react-bits (nunca usados en la práctica porque el único punto de montaje los sobreescribe, pero una trampa latente para reutilización futura sin props explícitas). Cambiados a los mismos valores Shear que ya se pasan desde `Landing.tsx`: `gradientFrom`/`gradientTo` → `'rgba(107, 52, 68, 0.10)'` (mismo valor en ambos, ver Cambio 2 más arriba — un `linear-gradient` real de 2 tonos sigue prohibido), `glowColor` → `'#6B3444'`.

Verificación post-fix: `pnpm --filter @estetica/client build` → exit 0. `pnpm --filter @estetica/client lint` → exit 0 (mismos 4 warnings preexistentes de siempre, ajenos a esta feature). `feature_list.json` sin tocar (sigue tarea del `reviewer`).
