# Reporte de Revisión Técnica — Feature UX-44

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-22

## Limitación conocida (explícita)

Esta auditoría es de **código**, no de aceptación estética final. No hay navegador real
disponible en este entorno de ejecución — no se pudo renderizar WebGL, tomar screenshot,
verificar visualmente el framing del blob respecto al `HeroMockup`, ni activar
`prefers-reduced-motion: reduce` en un navegador real para confirmar el efecto observado.
Esta es la misma limitación documentada por los reviewers de UX-40/41/42 y por el propio
`implementer` en `progress/implements/impl_UX-44-frontend.md` (sección "Cosas que no pude
validar sin navegador"). **Se recomienda que el usuario revise el resultado visual en el
navegador antes de dar el ciclo por completamente cerrado**, dado el historial de 6 rondas
previas donde código técnicamente correcto no se tradujo en un resultado visual aceptado.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** una sola feature `in_progress`
  (`UX-44`), sandbox hermético — únicamente `apps/client/package.json`,
  `apps/client/src/views/Landing.tsx`, `apps/client/src/components/landing/Hero3DScene.tsx`
  (nuevo) y `docs/design.md` fueron tocados. `feature_list.json` no traía `"done"` premarcado.
- [x] **C3 (Fidelidad Arquitectónica — Frontend):**
  - Aislamiento de dependencias verificado con `grep -rn "three|@react-three|gsap|@gsap"
    apps/client/src` → únicamente 2 matches de archivo: `Landing.tsx` y `Hero3DScene.tsx`.
    Cero en vistas autenticadas.
  - `git diff --stat` confirma que `Landing.tsx` solo cambió 82 líneas, todas dentro de la
    sección HERO (imports, `useGSAP`, `webglSupported`, clases target `.hero-*`, wrapper
    `.hero-visual`) y el contenedor exterior de `HeroMockup` (de `motion.div` a `div` plano).
    Las secciones Features/Stats/Cómo funciona/CTA final no fueron tocadas.
  - Los loops infinitos `floatA`/`floatB` de los badges de `HeroMockup` (Landing.tsx:630-658)
    siguen intactos como `motion.div`. El reveal "mazo de cartas" de Features
    (`featureCardMotion`, Landing.tsx:49-57) no fue modificado.
  - HTML semántico: no se introdujeron `<div onClick>`/`role="button"` simulando controles.
    El wrapper decorativo del Canvas (`Hero3DScene.tsx:53`) lleva `aria-hidden="true"` y
    `pointer-events-none`, sin interferir con el tab order ni con los controles interactivos
    del hero (CTAs, badges).
  - Componentes con `export default` (`Hero3DScene.tsx:51`). Props tipadas con interface local
    `Props`/`BlobProps`. Sin `console.log`/`debugger`/`TODO` sueltos (grep vacío en ambos
    archivos).
- [x] **C4 (Compilación Estática + Lint):** re-ejecutados de forma independiente (no se confió
  en el reporte del implementer):
  - `pnpm --filter @estetica/client build` → exit 0. Output confirma code-splitting real:
    `dist/assets/Hero3DScene-CoeX-dNj.js  884.68 kB` como chunk separado del bundle principal
    `dist/assets/index-C00xvsb9.js  1,695.20 kB` — `three`/`@react-three/fiber`/`@react-three/drei`
    quedan detrás de `React.lazy(() => import('../components/landing/Hero3DScene'))`
    (`Landing.tsx:16`), no en el chunk inicial de la Landing pública.
  - `pnpm --filter @estetica/client lint` → exit 0, 0 errores. Los 4 warnings
    (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`,
    `Negocio.tsx`, `Turnos.tsx`) son preexistentes y ajenos a esta feature — ninguno de esos
    4 archivos aparece en `git status`/`git diff` de esta sesión.
- N/A **C5 (Cierre de Sesión):** corresponde al leader tras este veredicto (history.md,
  current.md, archivado de `progress/`).
- N/A **C6 (Capa de Datos):** feature 100% frontend, sin modelos Mongoose involucrados.
- N/A **C7 (Security Gate):** sin backend tocado; sin variables sensibles ni endpoints
  involucrados. `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` en `apps/server/src/` no aplica a
  este diff (ningún archivo de servidor fue tocado).
- [x] **C8 (Estabilidad de API):** sin cambio de contrato de API — no aplica `CHANGELOG.md`.

## Verificación de acceptance criteria específicos de UX-44

- [x] `docs/design.md:499-510` (§13.1) tiene el bullet nuevo "Excepción render 3D/WebGL + GSAP
  (UX-44, 2026-07-22)" — texto verificado en disco (no solo en el resumen del implementer):
  acota `three`/`@react-three/fiber`/`@react-three/drei`/`gsap`/`@gsap/react` exclusivamente al
  hero de `Landing.tsx`, exige `React.lazy`, prohíbe explícitamente gradientes CSS,
  `box-shadow` de card/lift, más de un bloque `wine` sólido y modo oscuro, y agrega notas de
  accesibilidad (`prefers-reduced-motion`) y fallback sin WebGL. El bullet histórico previo
  (UX-38/39) se dejó intacto como registro, sin reescribir historia.
- [x] `apps/client/package.json` (`git diff`) agrega únicamente `@gsap/react`, `@react-three/drei`,
  `@react-three/fiber`, `gsap`, `three` (deps) y `@types/three` (devDep) — sin librerías
  ajenas. `package.json` raíz del monorepo no fue tocado.
- [x] Escena 3D real en WebGL (`Hero3DScene.tsx`): `Canvas` de `@react-three/fiber` +
  `Sphere`/`MeshDistortMaterial` de `@react-three/drei`, sin simulación SVG/CSS. Paleta de
  tokens Shear: `color="#C89A5B"` (gold), luz de relleno `color="#8C9178"` (sage),
  `directionalLight` cálida `#F6EFE3`. Movimiento continuo vía `useFrame` (rotación Y +
  flotación senoidal), congelado (`early return`) si `prefersReducedMotion`.
- [x] GSAP orquesta la entrada del hero (`Landing.tsx:145-159`): timeline secuencial
  eyebrow→título→visual(paralelo)→subtítulo→CTAs(stagger)→trust row, `scope: heroRef`. Rama
  `prefersReducedMotion` usa `gsap.set(...)` (salto directo al estado final), replicando el
  patrón `featureCardMotion` ya usado en el codebase.
- [x] Canvas acotado al hero: wrapper `.hero-visual` (`Landing.tsx:310-317`), `Hero3DScene`
  usa `absolute inset-0` **dentro** de ese wrapper — nunca `fixed`/full-bleed. Contexto WebGL:
  se delega en el ciclo de vida estándar de `Canvas` de R3F (dispose automático al desmontar el
  árbol React) — no se instrumentó una prueba de memoria real (limitación de entorno,
  documentada arriba).
- [x] `prefers-reduced-motion`: reutiliza el `prefersReducedMotion` ya calculado en
  `Landing.tsx:138` (`useReducedMotion()` de `motion/react`), pasado por prop a `Hero3DScene`
  sin duplicar el hook (`Hero3DScene.tsx` no importa `useReducedMotion`). Afecta tanto el
  `useFrame` (early return) como la timeline GSAP (`gsap.set` en vez de `.from(...)`).
- [x] Fallback sin WebGL: `isWebGLAvailable()` (`Landing.tsx:24-31`) hace pre-check síncrono
  con un canvas en memoria (`webgl2`/`webgl`) **antes** de intentar montar `Canvas`; si es
  `false`, `Hero3DScene` ni siquiera se renderiza (`{webglSupported && ...}`,
  `Landing.tsx:311`) — el hero queda igual que sin la escena, sin romper layout.
- [x] Ninguna vista autenticada importa `three`/`gsap` (grep confirmado). Loops de
  `HeroMockup` y reveal de Features intactos (confirmado por diff scope).
- [x] Build y lint pasan con exit code 0 (re-verificado independientemente, ver C4).

## Observaciones no bloqueantes

- El `useState(() => isWebGLAvailable())` con lazy initializer en vez de `useEffect` es una
  desviación documentada y justificada respecto al digest del explorer (evita el error de
  lint `react-hooks/set-state-in-effect` ya activo en el proyecto); es una alternativa
  funcionalmente equivalente para una app 100% CSR y no introduce riesgo.
- Cleanup de listeners de `mousemove`/`resize`: no aplica — el parallax de mouse era opcional
  y el implementer confirmó no haberlo implementado (grep de `addEventListener` vacío en ambos
  archivos), consistente con "omitido sin culpa" del digest del explorer.

## Cambios Requeridos

Ninguno. No se detectaron violaciones bloqueantes de gobernanza, arquitectura, aislamiento de
dependencias, accesibilidad o build.

## Estado en `feature_list.json`

`UX-44` actualizado de `"in_progress"` a `"done"` por este reviewer.
