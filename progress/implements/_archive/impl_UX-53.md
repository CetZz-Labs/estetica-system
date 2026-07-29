# impl_UX-53 — CTA final: efecto GradualBlur en el borde inferior de la card

## Feature
`UX-53` — Landing pública — CTA final: efecto de blur progresivo (GradualBlur) en el borde
inferior de la card.

## Archivos
- **Nuevo:** `apps/client/src/components/landing/GradualBlur.tsx`.
- **Modificado:** `apps/client/src/views/Landing.tsx` (import + montaje dentro del `motion.div`
  `bg-wine rounded-card` del CTA final, después del bloque de contenido `<div className="relative
  z-10">`).
- **Modificado:** `docs/design.md` §13.1 (nueva excepción puntual documentada).

## `GradualBlur.tsx` — diseño
- Reimplementación local (cero `npm install`/`pnpm add`), mismo criterio que Silk/DotField/
  MagicBento: sin ninguna dependencia nueva del proyecto.
- Props: `target` (solo `"parent"` soportado, prop mantenida por paridad de API), `position`
  (`"top" | "bottom" | "left" | "right"`, genérico sin costo extra relevante aunque solo se usa
  `"bottom"` en la Landing), `height` (CSS length), `strength` (multiplicador de blur máximo),
  `divCount`, `curve` (`"linear" | "bezier"`), `exponential` (boolean), `opacity`.
- Apila `divCount` capas `absolute inset-0` dentro de un contenedor posicionado sobre el borde
  indicado. Cada capa:
  - `backdropFilter`/`WebkitBackdropFilter: blur(Npx)` — `N` calculado con `easeProgress(t, curve,
    exponential)` × `strength` × `BLUR_UNIT_PX` (12px), donde `t = i / (divCount - 1)` es la
    posición relativa de la capa dentro de la banda (0 = extremo lejano al borde, 1 = capa más
    cercana al borde objetivo).
  - `maskImage`/`WebkitMaskImage: linear-gradient(...)` — el gradiente vive **únicamente** en la
    máscara (controla el canal alfa de esa capa), nunca en `background`/`backgroundImage`: no
    produce ninguna transición de color, solo define en qué banda se ve esa capa de blur, con
    bordes suaves (`transparent` → `black`, nunca un corte duro).
  - Las bandas de capas sucesivas se solapan a propósito (`[t - 1/divCount, t + 1/divCount]`): cerca
    del borde objetivo todas las capas quedan opacas y sus blurs se acumulan (blur máximo); lejos
    del borde solo las capas de menor índice (blur casi nulo) están activas — el blur total
    percibido crece gradualmente en vez de saltar en escalones.
  - `pointer-events-none` + `aria-hidden="true"` en el contenedor exterior.
- `easeProgress(t, curve, exponential)`:
  - `exponential: true` → `easeInExpo` clásico (`t <= 0 ? 0 : 2 ** (10 * (t - 1))`), crecimiento
    casi nulo hasta acercarse al final de la curva, donde se dispara — aproxima "curva bezier +
    exponencial, crece más rápido cerca del borde" sin resolver una Bézier real ni sumar una
    librería de easing.
  - `exponential: false` + `curve: "bezier"` → smoothstep cúbico (`t*t*(3-2t)`), aproximación de
    una curva de Bézier ease-in-out.
  - Fallback `linear` si no aplica ninguna de las anteriores.
- Es un efecto estático (no depende de scroll/mouse/tiempo): documentado explícitamente en el
  JSDoc del componente por qué no requiere guarda de `prefers-reduced-motion` (no hay ninguna
  animación que desactivar).

## Montaje en `Landing.tsx`
```tsx
<GradualBlur
    target="parent"
    position="bottom"
    height="4rem"
    strength={1.5}
    divCount={5}
    curve="bezier"
    exponential
    opacity={0.9}
/>
```
- Montado dentro del `motion.div` `relative overflow-hidden bg-wine rounded-card` (que ya tiene
  `position: relative` — `target="parent"` se resuelve contra ese ancestro) y **después** del
  bloque `<div className="relative z-10">` que contiene el texto/botones, sin `z-index` propio —
  queda en el nivel "auto" de ese stacking context y pinta por debajo del contenido con `z-10`, sin
  taparlo.
- **Decisión no 100% especificada — `height`:** el ejemplo genérico del usuario usaba `height:
  500`/`padding: '6rem 2rem'` de un demo con contenido scrolleable (no aplica acá) y sugería
  `height="6rem"` para el montaje real. Al revisar el JSX de la card (`p-8 sm:p-12 lg:p-16` = 2–4rem
  de padding inferior real, y el último elemento de texto — "Sin compromiso. Sin tarjeta de
  crédito." — separado de los botones solo por `mt-4`), `6rem` alcanzaba a pisar esa última línea
  de texto. Se redujo a `height="4rem"`, en el mismo orden de magnitud del padding máximo (`lg:p-16`)
  para que el efecto quede confinado al borde sin invadir el texto.
- Resto de valores (`strength={1.5}`, `divCount={5}`, `curve="bezier"`, `exponential`,
  `opacity={0.9}`) tal como los pidió el usuario en el snippet de referencia.

## `docs/design.md` §13.1
Se agregó una nueva viñeta de excepción puntual (después de la entrada de `MagicBento`/UX-47)
documentando: qué es `GradualBlur`, que el `linear-gradient` vive solo en `mask-image` (controla
el canal alfa de capas de blur, no produce ninguna transición de color visible — el `bg-wine` de
la card no cambia), por qué esto no reabre la prohibición general de gradientes decorativos (mismo
argumento ya usado para el `radialGradient` de un solo color de `DotField.tsx`), y que sigue
prohibido cualquier gradiente que sí cambie de color en `background`/`backgroundImage`/
`bg-gradient-*`.

## Verificación
```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (4 warnings preexistentes de
                                          react-hooks/incompatible-library en otros archivos,
                                          no relacionadas con este cambio)
```

`git --no-pager diff --ignore-all-space --stat -- apps/client/src/views/Landing.tsx` confirmado
sin reindentación espuria — el diff de `Landing.tsx` queda acotado al import de `GradualBlur` y al
bloque JSX de montaje agregado, además de los cambios de UX-51/UX-52 del mismo pase y los diffs
preexistentes de la edición manual del usuario (ajenos a las tres features de esta sesión).

## Estado
Implementación terminada. NO se cambió `feature_list.json` (sigue en `"in_progress"`, tarea
exclusiva del reviewer). El reviewer no tiene navegador real disponible en este entorno — el
usuario debería confirmar visualmente que el blur se percibe correctamente sobre el fondo wine sin
tapar texto/botones.
