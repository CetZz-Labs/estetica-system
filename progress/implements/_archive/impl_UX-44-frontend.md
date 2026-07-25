# Implementación — UX-44 (frontend)

Landing pública, hero: animación 3D real (three.js/WebGL vía @react-three/fiber+drei) + GSAP.

## Archivos tocados/creados

- `apps/client/package.json` — dependencias nuevas: `three`, `@react-three/fiber`,
  `@react-three/drei`, `gsap`, `@gsap/react` (dependencies); `@types/three` (devDependencies).
  Instaladas con `pnpm add`/`pnpm add -D` dentro de `apps/client/`.
- `apps/client/src/components/landing/Hero3DScene.tsx` (nuevo) — escena 3D del hero:
  `Canvas` (r3f) + `Sphere`/`MeshDistortMaterial` (drei), luces (`ambientLight` + 2
  `directionalLight`), rotación Y + flotación vertical via `useFrame`, congelado si
  `prefersReducedMotion`. `export default` (lazy-loadeable).
- `apps/client/src/views/Landing.tsx` — cableado del hero:
  - Import dinámico `const Hero3DScene = lazy(() => import('../components/landing/Hero3DScene'))`.
  - `gsap.registerPlugin(useGSAP)` a nivel de módulo.
  - `isWebGLAvailable()` (feature-detection sin importar `three`) a nivel de módulo.
  - `webglSupported` vía `useState(() => isWebGLAvailable())` (lazy initializer, sin
    `useEffect` — ver "Desvíos" abajo).
  - `heroRef` (`useRef<HTMLElement>`) asignado a la `<section>` del hero, usado como
    `scope` de `useGSAP`.
  - Timeline GSAP (`useGSAP` con `dependencies: [prefersReducedMotion]`): eyebrow → H1 →
    columna derecha (parallel) → subtítulo → CTAs (stagger 0.08) → trust row. Con
    `prefersReducedMotion` usa `gsap.set(...)` (estado final inmediato) en vez de timeline.
  - Clases nuevas (targets GSAP, sin alterar layout/estilos): `.hero-eyebrow` (antes
    `motion.div`, ahora `div` plano), `.hero-title` (`h1`), `.hero-subtitle` (`p`),
    `.hero-cta` (contenedor de los 2 CTA), `.hero-trust` (fila shield/smartphone),
    `.hero-visual` (wrapper `div.relative` de la columna derecha — envuelve tanto
    `Hero3DScene` como `HeroMockup`).
  - Canvas 3D montado condicionalmente (`{webglSupported && <Suspense fallback={null}>
    <Hero3DScene .../></Suspense>}`) dentro de `.hero-visual`, antes de `HeroMockup`.
  - `HeroMockup`: su `motion.div` contenedor exterior (líneas ~505-509 originales) pasó a
    ser un `div` plano sin `initial/animate/transition` propio — la entrada de esa columna
    ahora la orquesta GSAP vía `.hero-visual` (que envuelve tanto el Canvas como este div).
    Los loops infinitos internos (`floatA`/`floatB`, badges flotantes) **no se tocaron**,
    siguen siendo `motion.div` con sus animaciones en loop intactas.
- `docs/design.md` §13.1 — se agregó un nuevo bullet "Excepción render 3D/WebGL + GSAP
  (UX-44, 2026-07-22)" documentando la excepción acotada al hero de `Landing.tsx`, qué
  librerías se permiten, qué sigue prohibido (gradientes CSS, box-shadow de card/lift, >1
  bloque wine sólido, modo oscuro), y una nota de fallback sin WebGL. El bullet anterior que
  decía textualmente "No se agregan librerías de render 3D/WebGL... se resuelve con SVG/CSS
  + motion" se dejó intacto como registro histórico de la decisión previa (UX-39) y se separó
  la nueva excepción en un bullet propio para no reescribir historia — la excepción UX-44 la
  sustituye en la práctica.

## Decisiones técnicas / desvíos respecto al digest del explorer

1. **`useState` lazy initializer en vez de `useEffect` para el pre-check de WebGL.** El
   explorer sugería "useEffect/useState inicial". Al implementar con `useEffect` +
   `setWebglSupported(...)`, el linter (`react-hooks/set-state-in-effect`, ya activo en el
   proyecto) lo marcó como **error** ("Calling setState synchronously within an effect can
   trigger cascading renders"). Como la app es 100% CSR (sin SSR) y el check es puro/síncrono
   (no depende de nada que solo exista tras el commit al DOM), usar
   `useState(() => isWebGLAvailable())` es equivalente en comportamiento, evita el error de
   lint y es más simple (un render menos). No se tocó el error de lint con `eslint-disable`.
2. **Target `.hero-visual` = wrapper de la columna derecha completa (Canvas 3D + HeroMockup),
   no solo el `motion.div` interno de `HeroMockup`.** El explorer decía literalmente "el
   contenedor exterior de HeroMockup deja de tener su propio initial/animate... pasa a ser un
   target más de la timeline GSAP". Interpretación: si solo el `div` interno de `HeroMockup`
   animara, el Canvas (hermano suyo dentro de `.relative`) aparecería sin fade, rompiendo el
   "entra en paralelo (Canvas 3D + HeroMockup)" pedido explícitamente en el punto 6 del
   digest. Por eso animé el wrapper externo (línea ~270 original) y dejé el `div` interno de
   `HeroMockup` como plano sin animación propia — mismo resultado narrativo (un solo target,
   sin doble animación superpuesta), pero con el Canvas incluido en el fade/scale.
3. **`gsap.set(..., { clearProps: 'transform' })` en la rama `prefersReducedMotion`.** Añadido
   como defensivo extra (no pedido explícitamente) para asegurar que no quede ningún estilo
   inline de `transform` residual tras el `set`; funcionalmente no cambia nada porque los
   elementos no tenían transform previo.
4. **Parallax de mouse:** omitido, tal como el explorer lo marcó "opcional/nice-to-have,
   omitible sin culpa". No implementado en esta ronda.
5. **ScrollTrigger:** no usado, según lo indicado explícitamente (scope creep fuera de
   acceptance criteria).

## Verificación

```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (0 errores, 4 warnings preexistentes
                                          sin relación con esta feature: ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx — todos
                                          "React Compiler: incompatible-library" por
                                          react-hook-form `watch()`, ya presentes antes de
                                          este cambio, no se tocaron esos archivos)
```

Output de build relevante (confirma code-splitting):
```
dist/assets/Hero3DScene-CoeX-dNj.js    884.68 kB │ gzip: 235.54 kB   ← chunk separado (lazy)
dist/assets/index-C00xvsb9.js        1,695.20 kB │ gzip: 518.69 kB   ← bundle principal
```
El chunk `Hero3DScene-*.js` confirma que `three`/`@react-three/fiber`/`@react-three/drei`
quedaron fuera del bundle principal (se cargan solo cuando `webglSupported` es `true`, vía
`React.lazy`). El warning preexistente de "chunks larger than 500kB" ya existía en el
bundle principal por `@fullcalendar/*` antes de esta feature; no se investigó más a fondo
por estar fuera de alcance.

Grep de aislamiento (`three|@react-three|gsap` en `apps/client/src`):
```
apps\client\src\views\Landing.tsx
apps\client\src\components\landing\Hero3DScene.tsx
```
Solo esos dos archivos — cero matches en vistas autenticadas.

## Cosas que no pude validar sin navegador real

- **Visual real de la escena 3D** (framing del blob respecto al mockup, si "asoma por los
  bordes" como describe el digest, tono de color percibido, si el `dpr` cap se nota en gama
  baja): no hay forma de renderizar WebGL ni tomar screenshot en este entorno de ejecución.
  Solo validé que compila y tipa correctamente (tsc via `tsc -b`) y que la lógica de
  useFrame/rotación/flotación es matemáticamente consistente con la spec (delta*0.11 para
  rotación, seno con periodo 4s y amplitud 0.12 para flotación).
- **Comportamiento real de `prefers-reduced-motion`** (que el navegador efectivamente
  congele el loop 3D y salte la timeline GSAP): la lógica está condicionada correctamente en
  código (mismo `prefersReducedMotion` de `Landing.tsx:114` pasado por prop, sin duplicar el
  hook), pero no se pudo verificar en un navegador con la media query activada.
- **Limpieza real del contexto WebGL al desmontar** (no memory leak): se confía en el
  comportamiento estándar documentado de R3F (`Canvas` dispone el renderer/contexto
  automáticamente al desmontar el árbol React), no se instrumentó ninguna prueba manual de
  memoria.
- **Fallback en un navegador sin WebGL real**: la lógica de `isWebGLAvailable()` se probó
  solo por inspección de código (intenta `webgl2`/`webgl` en un canvas en memoria, catch →
  `false`); no hay forma de simular "sin WebGL" en este entorno para confirmarlo end-to-end.
