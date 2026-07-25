# impl_UX-40-frontend — Landing pública, corrección visual del efecto de caustics del hero

**Feature:** UX-40 — Landing pública — corrección visual del efecto de caustics del hero (no se ve como luz bajo el agua)
**Sandbox:** `apps/client/` (único archivo tocado: `src/views/Landing.tsx`, únicamente el bloque de fondo decorativo del hero, líneas ~220-278 tras el reemplazo)
**Sin dependencias nuevas:** se reutiliza `motion` (ya en `apps/client/package.json` desde UX-38). No se tocó `package.json`/`pnpm-lock.yaml`.

## Corrección post-implementación (mismo día): blend mode `screen`/`soft-light` sobre fondo casi blanco

El coordinador señaló — antes de pasar a review — el mismo riesgo que yo había anotado como duda honesta en la primera versión de esta bitácora: `--bg: #FAF6F4` (fondo de la Landing) es casi blanco. Las fórmulas `screen` (`1 - (1-base)*(1-blend)`) y `soft-light` dependen de que `(1-base)` tenga margen para cambiar; con `base` ya cerca de 1, el resultado post-blend casi no se mueve sin importar el color que se le aplique encima — el efecto quedaba prácticamente invisible.

**Corrección aplicada:** se removieron **todas** las clases `mix-blend-*` del bloque (tanto `mix-blend-soft-light` del `<svg>` de la red de caustics como `mix-blend-screen` de los 3 haces de luz). Ahora todo el bloque usa **blending normal por alfa** (composición estándar "over", sin `mix-blend-mode`): el color tokenizado (`var(--gold)`, `bg-gold`, `bg-accent-rose`) se pinta directamente con su opacidad, en vez de "screenearse" contra el fondo — con alfa normal el color sí se percibe sobre un fondo claro, sin depender de que el fondo sea oscuro.

Para compensar que el blending normal no tiene el "impulso" que daban `screen`/`soft-light`, se subió la opacidad de cada capa:
- Rect de la red de caustics: `opacity="0.5"` → `opacity="0.55"`.
- Haz 1 (dorado, esquina superior izq.): `opacity-20` → `opacity-25`.
- Haz 2 (rosado, centro): `opacity-10` → `opacity-20`.
- Haz 3 (dorado suave, franja derecha): `opacity-10` → `opacity-[0.15]` (valor arbitrario Tailwind, ya que `opacity-15` no existe en la escala por defecto — se usó sintaxis de corchetes, mismo patrón ya usado en el archivo para `w-[…]`/`h-[…]`).

Se re-corrieron `pnpm --filter @estetica/client build` y `pnpm --filter @estetica/client lint` tras el cambio — ambos exit 0 (ver sección de verificación actualizada más abajo). La duda que había anotado sobre "si `mix-blend-screen` sobre tokens cálidos produce suficiente contraste contra `bg-bg` ya claro" queda **resuelta**: ya no se usa ningún blend mode de tipo screen/multiply/soft-light en este bloque, el color se pinta directamente por alfa, por lo que ya no aplica ese riesgo.

## Diagnóstico confirmado

Se leyó el código previo de UX-39: usaba `feTurbulence` + `feDisplacementMap` desplazando la **geometría** de dos `<circle>` sólidos. Eso deforma el contorno de una forma en un blob orgánico — visualmente muy distinto de una red de manchas de luz ("caustics"). Se reemplazó por completo esa técnica.

## Técnica implementada: ruido como máscara de luminosidad (no deformación de silueta)

Un único `<filter id="hero-caustic-mask">` aplicado sobre un `<rect>` de fondo completo (`100% x 100%`), en vez de sobre círculos aislados:

1. `feTurbulence type="fractalNoise" baseFrequency="0.008 0.015" numOctaves="3" seed="7"` — frecuencia baja y asimétrica en x/y (evita un patrón uniforme/repetitivo), 3 octavas para más detalle en la red de luz sin disparar el costo de recomputo.
2. `feColorMatrix type="matrix"` con la fila de alfa `0.33 0.33 0.33 0 0` y las filas de RGB en cero: vuelca el promedio de luminosidad del ruido al canal alfa; el color del ruido deja de importar (se descarta), solo su brillo define cuánta "luz" pasa.
3. `feComponentTransfer` con `feFuncA type="discrete" tableValues="0 0 0 0.05 0.15 0.35 0.6 0.85 1 1"`: convierte la rampa continua de alfa en escalones de alto contraste — esto es lo que produce manchas de luz **nítidas y separadas** en vez de un blur difuso parejo (10 escalones, con los primeros 3 en 0 para recortar el "piso" de ruido y dejar zonas realmente transparentes).
4. `feComposite in="SourceGraphic" in2="causticMask" operator="in"`: recorta el `<rect>` sólido (`fill="var(--gold)"`, `opacity="0.55"`, ver corrección de blend mode más abajo) con la máscara de alfa nítida — el resultado es un panel de color cálido visible solo donde la máscara "deja pasar luz", con bordes definidos por los escalones discretos.
5. Animación: `<animate attributeName="baseFrequency" ...>` (SMIL, 26s, solo si `!prefersReducedMotion`) hace que la red de manchas "respire"/fluya lentamente, sin tocar geometría alguna — coherente con agua en movimiento.
6. Composición **normal por alfa** en el `<svg>` contenedor (sin `mix-blend-mode`, ver corrección más abajo) para que el panel de color se pinte directamente y se perciba contra el fondo casi blanco de la Landing.

## Haces de luz (2-3 "rayos" superpuestos)

3 `motion.div` con barras angostas y altas (`w-16/w-20/w-24` × `h-[28rem]` a `h-[44rem]`), color tokenizado (`bg-gold`, `bg-accent-rose`), `blur-3xl`, opacidad ajustada por capa (`opacity-25`/`opacity-20`/`opacity-[0.15]`, ver corrección más abajo) con composición **normal por alfa** (sin `mix-blend-mode`) para que se vean como haces de color cálido difuminados sobre el panel de caustics.

- Cada haz tiene un `initial={{ rotate: N, x: 0 }}` (ángulo base 12-18°, alternando signo para no verse todos paralelos) y `animate` con arrays de 4 keyframes que vuelven al valor inicial (`[14, 20, 9, 14]` etc.) — el balanceo es lento (11s/13s/15s) y con `delay` escalonado (0/1.6s/3.1s) para que no oscilen en fase.
- Posicionados en distintas franjas horizontales (`left-[6%]`, `left-[42%]`, `right-[8%]`) para que se lean como 2-3 rayos independientes cruzando el hero, no un único bloque.
- Los 3 conservan `w-[…]`/`h-[…]` con unidades Tailwind arbitrarias (`rem`), mismo patrón ya usado en UX-39 para los paneles SVG (`w-[28rem]`), sin introducir sintaxis nueva al proyecto.

## Estructura final del bloque

```
<div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
    <svg>...<rect filter="url(#hero-caustic-mask)" /></svg>   {/* red de caustics */}
    <motion.div ... />  {/* haz 1 */}
    <motion.div ... />  {/* haz 2 */}
    <motion.div ... />  {/* haz 3 */}
</div>
```

Se eliminaron los 2 blobs de apoyo (`bg-sage`/`bg-accent` con blur) de UX-39: el nuevo diseño ya cubre "profundidad" con la red de caustics + 3 haces, y agregar blobs adicionales hubiera diluido la lectura de "rayos de luz" pedida explícitamente en el criterio de aceptación. El resto de la sección hero (título, texto, botones, `HeroMockup`, `z-10`) no se tocó.

## Accesibilidad (`prefers-reduced-motion`)

- La animación SMIL de `baseFrequency` en el filtro se omite por completo si `prefersReducedMotion` (`{!prefersReducedMotion && (<animate ... />)}`) — la red de caustics queda estática pero visible (mismo patrón nítido, sin flujo).
- Los 3 haces: `animate={prefersReducedMotion ? undefined : {...}}` — quedan fijos en su ángulo `initial` (14°/-12°/18°), sin balanceo.

## Restricciones verificadas

- `grep -n "linear-gradient|radial-gradient|conic-gradient|bg-gradient-" Landing.tsx` → sin resultados.
- `grep -n "feDisplacementMap" Landing.tsx` → sin resultados (técnica de UX-39 completamente removida).
- `grep -n "mix-blend" Landing.tsx` → sin coincidencias de clase (solo aparece en un comentario explicativo), confirmando que no queda ningún `mix-blend-*` tras la corrección de blend mode.
- Colores: `var(--gold)` (custom property existente), `bg-gold`, `bg-accent-rose` (clases Tailwind ya usadas en el archivo) — cero hex/colores nuevos.
- No se instaló ninguna librería (`motion` ya presente, sin diff en `package.json`/lockfile).
- No se tocaron las cards de Funcionalidades (UX-39) ni ninguna otra sección — único bloque modificado: fondo decorativo del hero.
- `z-0`/`pointer-events-none` en el contenedor del efecto, contenido del hero sigue en `z-10` (sin cambios en ese wrapper).

## Resultado de verificación (tras la corrección de blend mode)

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` completó sin errores. Exit 0.
```
dist/assets/index-DSHNo1xd.css     52.33 kB
dist/assets/index-dTQ1DSMl.js   1,624.76 kB
✓ built in 1.01s
```
(único warning: chunk > 500kB, preexistente, no relacionado con este cambio).

```
pnpm --filter @estetica/client lint
```
→ Exit 0. `0 errors, 4 warnings` — los 4 warnings son preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`), ninguno en `Landing.tsx`.

## Duda honesta sobre el resultado visual (no puedo renderizar, solo razonar sobre el código)

- La cadena `feColorMatrix` → `feComponentTransfer(discrete)` → `feComposite(in)` es la técnica canónica para convertir ruido en una máscara de "luz recortada" (es el mismo principio que un patrón de caustics real: luz que pasa o no pasa según la refracción). Con `numOctaves="3"` y `baseFrequency="0.008 0.015"` el patrón debería leerse como manchas alargadas/red, no como manchas circulares aisladas — pero la escala exacta de las "celdas" de luz depende del tamaño real en píxeles del hero en el viewport final (no pude verlo renderizado). Si las manchas resultan demasiado grandes/pequeñas o demasiado uniformes, el ajuste más directo es tocar `baseFrequency` (subir = manchas más chicas y numerosas) o los `tableValues` de `feFuncA` (más escalones = transición más suave; menos escalones = más "binario").
- Los 3 haces de luz usan `blur-3xl` (el máximo blur nativo de Tailwind, `64px`); en pantallas grandes con barras de `h-[44rem]` el blur podría sentirse insuficiente para que los bordes se vean completamente difusos (vs. nítidos). No se subió a un `stdDeviation` SVG custom para no mezclar dos mecanismos de blur distintos (CSS `blur-3xl` vs. filtro SVG) sobre el mismo elemento; si el reviewer/usuario lo ve "con bordes duros", la corrección sería envolver cada haz en un filtro SVG propio con `feGaussianBlur stdDeviation` más alto, o aumentar el ancho de la barra para que el ratio blur/tamaño sea mayor.
- **Resuelta:** la duda original sobre si `mix-blend-screen` aportaría contraste suficiente contra `bg-bg` ya casi blanco quedó resuelta al remover por completo los `mix-blend-mode` del bloque (ver sección "Corrección post-implementación" arriba) — ahora el color se pinta por alfa normal, que sí es perceptible sobre cualquier fondo independientemente de su luminosidad. El punto de incertidumbre remanente (no resuelto, porque no puedo renderizar) es si las opacidades elegidas (0.55 / 0.25 / 0.20 / 0.15) logran el balance correcto entre "se nota como fondo decorativo" y "no compite con el texto" — son valores razonados pero no verificados visualmente; si el reviewer/usuario lo ve muy tenue o muy cargado, el ajuste es puramente numérico (subir/bajar esos 4 valores), sin tocar la estructura del filtro ni de los haces.

## Archivo modificado

- `apps/client/src/views/Landing.tsx` (único archivo).
