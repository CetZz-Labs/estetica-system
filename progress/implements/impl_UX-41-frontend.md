# impl_UX-41-frontend — Landing pública, hero: rayos de sol convergentes ("god rays") vistos desde el fondo del mar

**Feature:** UX-41 — Landing pública — hero: rayos de sol convergentes vistos desde el fondo del mar (composición "god rays")
**Sandbox:** `apps/client/` (único archivo tocado: `src/views/Landing.tsx`, únicamente el bloque de fondo decorativo del hero — comentario explicativo + los ex-"3 haces sueltos" de UX-40). No se tocaron las cards de Funcionalidades ni ninguna otra sección.
**Sin dependencias nuevas:** se reutiliza `motion` (ya en `apps/client/package.json` desde UX-38). No se tocó `package.json`/`pnpm-lock.yaml`.

## Diagnóstico confirmado (por qué las 3 rondas previas no alcanzaban)

Los 3 `motion.div` de UX-40 eran barras rectangulares independientes: cada una con su propio `top`/`left`/`right` y su propio `rotate` inicial, sin ningún punto de pivote compartido. Visualmente se leían como 3 manchas de color sueltas cruzando el hero en ángulos arbitrarios — no como "rayos de sol convergiendo hacia un punto único", que es la esencia geométrica del efecto god rays/crepuscular rays.

## Composición implementada

Reemplacé los 3 haces por **5 cuñas (trapezoides) en abanico**, todas ancladas al mismo punto de convergencia:

1. **Punto de origen compartido:** cada rayo vive en un wrapper `<div>` propio con clases idénticas de posicionamiento: `absolute -top-8 sm:-top-14 left-1/2 -translate-x-1/2`. Los 5 wrappers comparten exactamente el mismo `top`/`left`/`-translate-x-1/2`, por lo que el punto top-center de los 5 coincide en el mismo píxel — ese es el eje de convergencia (cerca del borde superior del hero, centrado horizontalmente, "fuera de cuadro" simulando la superficie del agua/el sol).
2. **Forma de cuña vía `clip-path`:** el `motion.div` interno (100% del `w`/`h` del wrapper) usa `[clip-path:polygon(46%_0%,54%_0%,100%_100%,0%_100%)]` — angosto (8% del ancho) en el borde superior, ancho completo en la base. Es un trapezoide real, no un rectángulo uniforme.
3. **Rotación compartiendo pivote:** decidí NO combinar `translateX` de centrado con `rotate` en el mismo elemento animado por `motion` (el orden de composición de `transform` de Framer/`motion` puede desplazar el pivote efectivo si se mezclan translate+rotate en un solo elemento con transform-origin). En cambio, el centrado horizontal (`-translate-x-1/2`) vive en el wrapper estático (CSS puro, sin motion), y el `motion.div` interno **solo anima `rotate`**, con `origin-top` (Tailwind, equivalente a `transform-origin: top center`). Como el wrapper ya centró el box completo en el eje compartido, el `origin-top` del hijo (top-center de su propia caja, que mide 100%×100% del wrapper) cae exactamente sobre ese mismo eje en los 5 rayos. Esto evita cualquier ambigüedad de orden de transform y garantiza el pivote común de forma determinística.
4. **Abanico:** ángulos base `-26°, -13°, 0°, 13°, 26°` (5 rayos, simétricos respecto al eje vertical, abriéndose hacia abajo).
5. **Superposición aditiva por alfa normal:** opacidades bajas (`opacity-10` los extremos, `opacity-[0.15]` los intermedios, `opacity-20` el central) con colores tokenizados alternados (`bg-gold`/`bg-accent-rose`) — sin `mix-blend-mode` (mismo criterio que la corrección de UX-40: sobre `--bg:#FAF6F4`, casi blanco, blend modes tipo screen/soft-light quedan invisibles; alfa normal sí se percibe). Cerca del origen las 5 cuñas se solapan, por lo que esa zona se ve naturalmente más brillante sin necesitar ningún blend mode especial.
6. **Movimiento constante y desincronizado:** cada rayo anima `rotate` en un ciclo de 4 keyframes (`[base-2, base+3, base-1.5, base]`) con duración distinta por rayo (9s/12s/14s/11s/10s) y `delay` propio (0/1.4/2.6/0.7/3.3s) — balanceo sutil (±1.5-3°) que no se siente sincronizado, evocando el ondulado de la superficie del agua.
7. **Caustics (UX-40) conservado intacto:** el `<svg>` con el filtro `hero-caustic-mask` (`feTurbulence` → `feColorMatrix` → `feComponentTransfer` → `feComposite`) no se tocó — sigue como capa de "piso" complementaria debajo de los rayos.
8. **Capas y z-index:** todo el bloque sigue dentro de `<div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">`, detrás del contenido (`z-10` sin cambios).

## Accesibilidad (`prefers-reduced-motion`)

- Los 5 rayos: `animate={prefersReducedMotion ? undefined : { rotate: [...] }}` — con `animate` en `undefined`, motion no anima y el elemento queda fijo en su `initial={{ rotate: baseAngle }}` (mismo patrón ya usado en el archivo para los haces de UX-40 y el filtro de caustics).
- La animación SMIL `baseFrequency` de la red de caustics sigue omitida cuando `prefersReducedMotion` (sin cambios respecto a UX-40).

## Restricciones verificadas

- `grep -n "linear-gradient|radial-gradient|conic-gradient|bg-gradient-|mix-blend|three\.js|pixi|ogl" Landing.tsx` → única coincidencia es la palabra "mix-blend-mode" dentro de un comentario explicativo (no hay ninguna clase `mix-blend-*` real ni gradiente ni librería 3D).
- Colores: `bg-gold`, `bg-accent-rose` — clases Tailwind ya mapeadas a tokens existentes (`--color-gold`, `--color-accent-rose` en `index.css`), cero hex nuevos.
- No se instaló ninguna librería (`motion` ya presente, sin diff en `package.json`/lockfile).
- No se tocaron las cards de Funcionalidades (UX-39) ni ninguna otra sección — único bloque modificado: fondo decorativo del hero (comentario explicativo + los 5 rayos, que reemplazan los 3 haces de UX-40). El `<svg>` de caustics no se modificó.
- `z-0`/`pointer-events-none` preservado en el contenedor del efecto.

## Resultado de verificación

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` completó sin errores. Exit 0.
```
dist/assets/index-BWzDUwtc.css     52.97 kB
dist/assets/index-4qKCRdCT.js   1,625.20 kB
✓ built in 1.16s
```
(único warning: chunk > 500kB, preexistente, no relacionado con este cambio).

```
pnpm --filter @estetica/client lint
```
→ Exit 0. `0 errors, 4 warnings` — los 4 warnings son preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`), ninguno en `Landing.tsx`.

## Honestidad sobre el resultado visual (no puedo renderizar, solo razonar sobre el código/geometría)

- **Geometría de convergencia:** estoy razonablemente seguro de que la composición SÍ corresponde a "god rays"/crepuscular rays vistos desde abajo: 5 cuñas angostas-arriba/anchas-abajo, con el vértice angosto de las 5 coincidiendo en el mismo punto exacto (mismo `top`/`left`/`-translate-x-1/2` en los 5 wrappers, mismo `origin-top` en los 5 hijos), abriéndose en abanico simétrico (±13°, ±26°, 0°) hacia abajo. Es la diferencia estructural clave frente a UX-40 (donde cada haz tenía su propio eje arbitrario) y es exactamente lo que describe el criterio de aceptación.
- **Decisión de diseño no 100% especificada — cantidad y ángulos:** el prompt sugería "4-6 rayos" con ángulos de ejemplo `±5°/±15°/±25°`; elegí 5 rayos (impar, con un rayo central en 0° que actúa como "eje" visual) en `±13°/±26°`, ligeramente más abiertos que el ejemplo, para que el abanico se note más en el ancho real del hero (viewport ~1280-1536px) sin que los rayos extremos salgan completamente del contenedor en pantallas chicas (`sm:` reduce anchos/altos pero no ángulos).
- **Decisión de diseño no especificada — ubicación exacta del origen:** usé `left-1/2` (centrado horizontal exacto) en vez de "levemente desplazado" — decisión consciente para maximizar la simetría del abanico y que se lea inequívocamente como un único punto de origen, dado que es la primera vez que se implementa esta composición y la simetría ayuda a validarla visualmente antes de afinar la posición.
- **Punto de incertidumbre no resuelto (no puedo renderizar):** el `clip-path` con blur aplicado sobre el mismo elemento (`blur-2xl sm:blur-3xl`) difumina también el borde recortado por el `clip-path` — es el comportamiento esperado y deseado (bordes de "rayo de luz" suaves, no un trapezoide con bordes duros), pero no pude verificar visualmente si el blur alcanza a suavizar lo suficiente el vértice angosto (8% de ancho) sin que se vea "cortado" antes de difuminarse del todo. Si el reviewer/usuario lo ve con un borde duro en el vértice, el ajuste más directo es aumentar el `blur` o ensanchar levemente el vértice (ej. `40%_0%,60%_0%` en vez de `46%_0%,54%_0%`).
- **Opacidades:** mantuve el mismo rango que UX-40 (0.10-0.20) por las mismas razones ya documentadas ahí (alfa normal sí se percibe sobre el fondo casi blanco); con 5 capas superpuestas cerca del origen, la zona de convergencia debería verse notablemente más brillante que los extremos — coherente con el efecto buscado, pero el balance fino (si se ve "demasiado cargado" o "demasiado tenue" en conjunto) solo se puede confirmar viendo el render real.

## Archivo modificado

- `apps/client/src/views/Landing.tsx` (único archivo).
