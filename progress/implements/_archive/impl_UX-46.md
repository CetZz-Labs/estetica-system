# impl_UX-46 — Fondos animados Silk + ShapeGrid en Landing

## Archivos creados

- `apps/client/src/components/landing/Silk.tsx` — fondo de olas animadas del hero, puerto a `ogl`
  (WebGL) del componente Silk-JS-CSS de react-bits (variante oficial requiere three.js +
  @react-three/fiber, purgados en UX-45). `Triangle`/`Program`/`Mesh` de `ogl`, `ResizeObserver`
  sobre el contenedor (no `window.resize`, a diferencia de ShapeGrid — Silk está confinado al
  `section` del hero, no al viewport completo), loop de RAF que congela `uTime` (no lo avanza)
  cuando `prefersReducedMotion` es `true` en vez de desmontar el canvas, cleanup completo en el
  `return` del `useEffect` (`cancelAnimationFrame` + `resizeObserver.disconnect()` +
  `gl.getExtension('WEBGL_lose_context')?.loseContext()` + remoción manual del canvas del DOM).
- `apps/client/src/components/landing/ShapeGrid.tsx` — fondo de grilla animada del resto de la
  Landing, puerto Canvas 2D puro (sin dependencias) recortado a shape `square` únicamente, con
  hover simple (una celda se resalta al pasar el mouse, sin estela — `hoverTrailAmount` no
  implementado, coherente con la decisión de producto ya tomada). Cleanup en el `return`:
  `cancelAnimationFrame` + remoción de los 3 listeners (`resize`, `mousemove`, `mouseleave`).

## Archivos modificados

- `apps/client/src/views/Landing.tsx`:
  - Import de `Silk` y `ShapeGrid` (imports normales, sin lazy loading — ambos son livianos, a
    diferencia del `Hero3DScene` de UX-44).
  - Constantes `SILK_COLOR` (`#D98BA4`, accent-rose) y `SHAPEGRID_BORDER`
    (`rgba(107, 52, 68, 0.06)`, wine al 6%).
  - **Eliminadas las 6 invocaciones JSX de `<HeroBlob>` del hero** (dentro del wrapper
    `hero+marquee`), reemplazadas por un único `<Silk />` montado como primer hijo del `<section>`
    del hero, envuelto en un `<div aria-hidden pointer-events-none overflow-hidden opacity-[0.14]>`
    con `style={{ mixBlendMode: 'multiply' }}`. La función `HeroBlob` (más abajo en el archivo)
    **no se tocó** — sigue usada intacta en el CTA final (única invocación JSX restante,
    confirmada por grep).
  - Wrapper hero+marquee: `relative overflow-hidden bg-bg` → `relative z-10 overflow-hidden bg-bg`
    (z-10 explícito, requisito para que el canvas `fixed` de `ShapeGrid` no se pinte por encima).
  - Nuevo mount de `<ShapeGrid />` como `<div aria-hidden className="fixed inset-0 z-0">` (SIN
    `pointer-events-none`, a diferencia del wrapper de Silk — decisión de producto: ShapeGrid
    mantiene hover simple), insertado justo antes de la sección Features.
  - Secciones Features/Stats/"Cómo funciona"/CTA final/footer: se retiró `bg-bg` opaco (excepto
    footer, que pasó de `bg-surface` opaco a `bg-surface/90`, mismo patrón ya usado en
    `TrustMarquee`) y se agregó `relative z-10` explícito a cada una — sin este par de cambios el
    canvas `fixed z-0` de ShapeGrid se pintaría encima del contenido real por no tener estas
    secciones un stacking context propio con z-index mayor.
  - Actualizados 2 comentarios que quedaban desactualizados tras retirar los blobs del hero (uno
    junto a `useReducedMotion()`, otro en el wrapper hero+marquee) para no inducir a error a
    futuras lecturas del archivo.
- `docs/design.md §13.1`: párrafo nuevo documentando la excepción puntual de `ogl` (alcance:
  exclusivo de `components/landing/Silk.tsx`), aclarando que `ShapeGrid.tsx` no requiere ninguna
  excepción de dependencias (Canvas 2D puro), y corrigiendo la frase de "puramente decorativo sin
  ninguna interacción" del digest del explorer para reflejar que ShapeGrid sí tiene hover simple
  (a diferencia de Silk, que sí es puramente decorativo).
- `apps/client/package.json` / `pnpm-lock.yaml`: `pnpm --filter @estetica/client add ogl` →
  `ogl@1.0.11` (única dependencia nueva).

## Decisiones técnicas / ajustes sobre el digest del explorer

1. **Confirmado contra el código fuente real de `ogl@1.0.11`** (`node_modules/.pnpm/ogl@1.0.11/.../src/extras/Triangle.js`
   y su `.d.ts`): los atributos de `Triangle` son exactamente `position` (vec2) y `uv` (vec2),
   como anticipaba el digest — no hizo falta ajustar los nombres del vertex shader. También se
   confirmó la firma de `Renderer.render({ scene, camera, ... })` contra `src/core/Renderer.js`
   antes de escribir el harness — coincide con el pseudocódigo del digest §3.3.
2. **`ShapeGrid` con `prefersReducedMotion=true` sí redibuja en hover** (llama `updateCellOpacities()`
   + `drawGrid()` dentro de los handlers de `mousemove`/`mouseleave` cuando está activo, en vez de
   quedar completamente estático tras el primer `drawGrid()`): sin este ajuste, con reduced-motion
   activo el hover quedaría roto (la celda nunca se resaltaría, porque no hay loop de RAF que
   redibuje). Es una actualización discreta disparada por un evento de usuario, no un loop
   continuo — coherente con "reducir drásticamente" (no eliminar) el movimiento que exige
   `docs/design.md §13.1`.
3. Colores: se usó `SILK_COLOR = '#D98BA4'` (accent-rose) tal como recomendaba el digest §5.1, con
   `opacity-[0.14]` + `mixBlendMode: multiply` (dentro del rango sugerido 0.10-0.18, sin necesidad
   de recalibrar tras inspección visual del build). `SHAPEGRID_BORDER` = wine al 6%
   (`rgba(107, 52, 68, 0.06)`), sin `hoverFillColor` configurable — se dejó fijo en
   `rgba(183, 110, 132, 0.12)` (accent al 12%) dentro del componente, ya que solo se usa una vez.

## Resultado build/lint

```
pnpm --filter @estetica/client build
✓ tsc -b && vite build — exit code 0 (775 módulos transformados, sin errores de tipos)

pnpm --filter @estetica/client lint
✖ 4 problems (0 errors, 4 warnings) — exit code 0
```
Los 4 warnings son preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`,
`RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — uso de `watch()` de react-hook-form), no
relacionados con esta feature.

## Resultado de los 3 greps de verificación (Paso 7)

1. `grep -rln "ogl\|Silk\|ShapeGrid" apps/client/src --include=*.tsx --include=*.ts` →
   `components/landing/ShapeGrid.tsx`, `components/landing/Silk.tsx`, `views/Landing.tsx`. Ningún
   leak a vistas autenticadas.
2. `grep -rn "three\|@react-three\|gsap" apps/client/package.json apps/client/src` → único match
   real en `package.json` es nulo (sin `three`/`@react-three`/`gsap`); los matches en `src` son
   todos comentarios explicativos dentro de `Silk.tsx` (mencionando que la variante oficial de
   react-bits requiere three.js, y que `gsap` sigue descartado) y `Landing.tsx` (comentario
   preexistente de UX-45), ningún import ni dependencia real revivida.
3. `<HeroBlob>` del CTA final: única invocación JSX restante en todo el archivo (confirmada por
   grep de `HeroBlob`), intacta — solo se retiraron las 6 invocaciones del hero.

## Pendiente para el reviewer

- Verificación visual manual (build + captura) del contraste de `Silk` sobre el hero, tal como
  señala el digest del explorer §9.2 — no cubierto por build/lint automatizados.
- Prueba de montaje/desmontaje repetido de Landing (navegación ida y vuelta) para descartar fuga
  de contextos WebGL de `ogl` (digest §9.3) — no cubierto por build/lint automatizados.
