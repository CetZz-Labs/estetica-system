# impl_UX-60 — Logo 3D en el hero (reemplaza las 3 cards de stats)

## Feature
`UX-60` — Landing pública — hero: reemplazar las 3 cards de stats por el logo en 3D (`ogl`).

## Resumen
Se creó `apps/client/src/components/landing/HeroLogo3D.tsx`, un render 3D real (perspectiva de
cámara `ogl`, no un tilt CSS) del logo de Shear (`/shear-favicon.png`) que reemplaza por completo
el bloque `heroStatCards.map(...)` (las 3 `TiltCard` con ícono+cifra: "128 clientes activos",
"+40% más eficiencia", "5 min setup inicial") en la columna derecha del hero de `Landing.tsx`.

## Estado final: `Plane` (v1), SIN geometría de profundidad
La implementación final usa `Plane` (`ogl`) — geometría plana con textura del favicon, sin
espesor real en Z. Este es el estado que el usuario **validó explícitamente** como bueno
("el logo se ve bien").

## Intento de profundidad en Z (ronda 2) — probado y descartado por el usuario
Después de la validación inicial, el usuario pidió agregarle "más ancho en el eje Z" porque lo
veía "muy plano". Se implementó una ronda 2 reemplazando `Plane` por `Box` (`ogl`, placa
extruida con `depth: 0.55`), con el fragment shader distinguiendo caras por normal
(`abs(normal.z) > 0.5`: caras grandes con textura del favicon, 4 "cantos" laterales con color
sólido wine) y ajustando el cull de caras (de `cullFace: false` a cull por defecto, apropiado
para un sólido convexo cerrado) y la distancia de cámara (3.4 → 3.6).

**El usuario probó esta ronda 2 en navegador real y reportó que "se ve extremadamente mal"**,
pidiendo revertir puntualmente ese cambio y devolver `HeroLogo3D.tsx` exactamente al estado de
`Plane` simple ya aprobado. Se revirtió el archivo completo a esa versión (confirmado
byte-a-byte: el build post-revert produjo el mismo hash de chunk `index-BeD6IabZ.js` y el mismo
tamaño exacto — 1,728.27 kB — que el build de la v1 original, antes de tocar nada de la ronda 2).

**Nota para futuras iteraciones (si se retoma la idea de profundidad):** la técnica de `Box` +
distinguir caras por normal en el fragment shader es funcionalmente válida (compila, buildea,
lintea limpio) pero el resultado visual no fue aceptado por el usuario con los parámetros
probados (`depth: 0.55`, cantos en wine sólido, cull por defecto, cámara a 3.6). No se investigó
la causa raíz del rechazo visual (¿el color de canto, la proporción del grosor, el sombreado, el
ángulo de rotación resultante?) — quedó fuera de alcance de esta sesión, el usuario indicó
explícitamente que lo van a retomar más adelante. No repetir el mismo intento sin ese contexto.

## Setup `ogl` (arquitectura del componente, estado final)
- `Renderer` (`alpha: true`, `dpr` acotado a 2) crea el canvas WebGL, montado dentro de un
  `<div ref={containerRef}>` propio (mismo idiom que `Silk.tsx`).
- `Camera` con perspectiva real (`fov: 32`, `near: 0.1`, `far: 100`, posición `(0, 0, 3.4)`) — no
  un tilt CSS falso.
- `Transform` como raíz de escena (`scene`), con el `Mesh` (`Plane` + `Program`) como único hijo
  (`mesh.setParent(scene)`).
- `Texture` cargada de forma asíncrona: se crea vacía, se arma un `Image` con `onload` que asigna
  `texture.image = image` cuando termina de cargar `/shear-favicon.png` — el `Mesh` ya está
  montado y el loop de render arranca sin esperar la imagen (mientras carga, `ogl` sube un pixel
  vacío para no producir errores de WebGL, comportamiento estándar de `Texture` sin imagen).
- Vertex shader con las matrices estándar (`modelViewMatrix`/`projectionMatrix`/`normalMatrix`)
  que `Mesh.draw({ camera })` inyecta automáticamente como uniforms — a diferencia de `Silk.tsx`
  (P15, shader fullscreen con un solo `Triangle` en espacio de clip, sin cámara ni geometría 3D
  real), acá sí hacen falta porque el objeto rota en espacio 3D.
- Fragment shader con difusa direccional fija (luz en espacio de cámara) + highlight especular
  Blinn-Phong sobre la textura del favicon, para que se perciba algo de volumen pese a ser un
  plano (sombreado que varía con el ángulo de rotación).
- `cullFace: false` en el `Program`: necesario porque un `Plane` sin espesor pierde el logo al
  pasar los 90° de rotación si se deja el cull de back-face por defecto de `ogl`.
- `ResizeObserver` sobre el contenedor propio (no `window.resize`) — recalcula `renderer.setSize`
  y `camera.perspective({ aspect })` en cada cambio de tamaño de la columna del hero.
- Rotación continua y sutil en loop: `mesh.rotation.y` gira continuo (`t * 0.45`),
  `mesh.rotation.x` oscila con un seno (`Math.sin(t * 0.6) * 0.18`).
- Cleanup en 4 pasos en el `return` del `useEffect` (mismo checklist que `Silk.tsx`,
  `docs/patterns-frontend.md` § P15): `cancelAnimationFrame` → `resizeObserver.disconnect()` →
  `gl.getExtension('WEBGL_lose_context')?.loseContext()` → remover el canvas del DOM.
- `prefersReducedMotion` recibido como prop (no se invoca `useReducedMotion()` adentro, mismo
  patrón que `Silk`/`DotField`): con reduced-motion, se fija un ángulo estático
  (`mesh.rotation = { x: 0.32, y: 0.55 }`) y se renderiza un único frame sin loop de RAF.

## Montaje en `Landing.tsx`
- Se reemplazó el bloque completo:
  ```tsx
  <div className="relative">
      <div className="relative mx-auto max-w-sm space-y-5 py-4">
          {heroStatCards.map((card, i) => (...))}
      </div>
  </div>
  ```
  por:
  ```tsx
  <div className="relative h-80 sm:h-96 lg:h-[28rem]">
      <HeroLogo3D prefersReducedMotion={!!prefersReducedMotion} />
  </div>
  ```
  con altura explícita (`h-80`/`sm:h-96`/`lg:h-[28rem]`) para conservar una proporción similar a
  la que ocupaban las 3 cards apiladas, sin romper el grid `lg:grid-cols-2` del hero.

## Limpieza
- Se eliminó el array `heroStatCards` y su comentario asociado — sin otro consumidor en el
  archivo tras el reemplazo.
- Se eliminó del import de `react-icons/pi` el ícono `PiUsersThreeDuotone`, que solo se usaba en
  `heroStatCards` (confirmado con `grep` antes de tocar el import). `PiTrendUpDuotone` y
  `PiClockDuotone` **se conservaron** — siguen usados en la sección Stats ("Números que hablan").
- `AnimatedStatIcon`, `sectionTints`, `StatIconAnimation`, `IconType` y `TiltCard` se confirmaron
  con `grep` como usados en otras secciones (Features, Stats, CTA final) — no se tocaron sus
  imports.
- Se actualizó un comentario en el CTA final que hacía referencia a "las tarjetas de estadística
  del hero" (contexto de `TiltCard`), ya no vigente tras el reemplazo.

## Gobernanza (`docs/design.md` §13.1)
Se agregó una nueva entrada en §13.1 (después de la de `GradualBlur`/UX-53) documentando que la
excepción puntual de `ogl` (instalada originalmente solo para `Silk.tsx` en UX-46) se **extiende**
a este segundo componente, `HeroLogo3D.tsx` — mismo criterio/formato que las excepciones
anteriores. No se instaló ninguna dependencia nueva. `three`/`@react-three/fiber`/
`@react-three/drei`/`gsap`/`@gsap/react` siguen fuera del proyecto sin ninguna excepción nueva.
(Esta entrada de gobernanza sigue vigente tal cual — describe la extensión del permiso de `ogl`
al componente en general, no depende de si la geometría interna es `Plane` o `Box`.)

## Build / Lint (verificado en el estado final, post-revert)
```
pnpm --filter @estetica/client build   → exit code 0 (chunk index-BeD6IabZ.js, 1,728.27 kB —
                                          idéntico al build de la v1 original, confirma revert
                                          completo)
pnpm --filter @estetica/client lint    → exit code 0 (solo 4 warnings preexistentes de
                                          react-hooks/incompatible-library en archivos no
                                          tocados por esta feature: ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx)
```

## Archivos modificados (estado final)
- `apps/client/src/components/landing/HeroLogo3D.tsx` (nuevo — versión `Plane` simple)
- `apps/client/src/views/Landing.tsx` (import, eliminación de `heroStatCards`, montaje del nuevo
  componente, ajuste de un comentario en el CTA final)
- `docs/design.md` (§13.1, nueva entrada de gobernanza)

## Nota
No se marcó la feature como `"done"` en `feature_list.json` — corresponde al reviewer.
