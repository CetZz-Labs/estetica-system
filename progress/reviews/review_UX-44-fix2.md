# Reporte de Revisión Técnica — Feature UX-44 (fix2, ronda 3)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-25

## Limitación conocida (explícita, igual que rondas 1 y 2)

Sin navegador real disponible en este entorno de ejecución. Esta aprobación es sobre la
**corrección lógica/geométrica del código** (que la caja del `Canvas` ahora excede la caja de
`HeroMockup` con un margen calculado y auditable respecto al gap del grid), no sobre haber
observado el blob asomando en pantalla. Se recomienda que el usuario confirme visualmente en
el navegador antes de dar el ciclo por cerrado — tercera vez que se deja esta recomendación
explícita en este mismo hero (ver `review_UX-44.md`, `review_UX-44-fix.md`).

## Auditoría del fix (`apps/client/src/components/landing/Hero3DScene.tsx`)

- **Diagnóstico del bug (heredado del leader, verificado por lectura de código en disco):**
  confirmado que el wrapper del `Canvas` usaba `absolute inset-0`, dándole exactamente la misma
  caja que `.hero-visual`, cuyo tamaño en flujo normal lo determina el único hijo real en flujo
  normal (`HeroMockup`, wrapper `<div className="relative mx-auto max-w-lg px-8 py-4">`,
  `Landing.tsx:563`). Con la card opaca (`overflow-hidden`) ocupando casi toda esa misma caja, y
  la esfera (radio 1.4, cámara a distancia 4.5, fov 45, ~75-80% del frame) proyectándose sobre
  ella, el blob quedaba oculto detrás de la card — diagnóstico correcto y consistente con lo que
  ya había señalado el `reopen_note` de `feature_list.json` antes de este fix.
- **Cambio real en disco (`Hero3DScene.tsx:61`):**
  ```
  <div className="absolute -inset-8 lg:-inset-12 z-0 pointer-events-none" aria-hidden="true">
  ```
  confirmado por lectura directa del archivo — coincide exactamente con lo declarado en
  `impl_UX-44-fix2-frontend.md`. Se agregó además un bloque de comentario explicativo
  (`Hero3DScene.tsx:52-59`) documentando la técnica y el cálculo de buffer — sin efecto en
  runtime.
- **Resto del archivo intacto:** `Blob` (rotación Y `delta * 0.11`, flotación seno período 4s
  amplitud 0.12, congelado si `prefersReducedMotion`), `Sphere args={[1.4, 64, 64]}`,
  `MeshDistortMaterial color="#C89A5B"`, `camera={{ position: [0, 0, 4.5], fov: 45 }}`,
  `ambientLight`/`directionalLight` (`#F6EFE3` cálida, `#8C9178` sage) — todos idénticos a la
  versión aprobada en `review_UX-44.md` (ronda 1). Ninguna de las cifras de cámara/radio/fov fue
  tocada, tal como exige el alcance declarado del fix.

## Cálculo del buffer — verificado matemáticamente contra el código real (no solo la bitácora)

Grid real del hero, `Landing.tsx:279`:
```
<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
```
- Escala estándar de Tailwind (`spacing = n * 0.25rem`): `gap-12` = 12 × 0.25rem = **3rem = 48px**;
  `gap-16` = 16 × 0.25rem = **4rem = 64px**. `-inset-8` = 8 × 0.25rem = **2rem = 32px**;
  `-inset-12` = 12 × 0.25rem = **3rem = 48px**.
- Por debajo de `lg`: sin `grid-cols` explícito hasta el breakpoint `lg`, el grid cae en su
  columna implícita única → layout de una sola columna (visual apilado debajo del texto),
  `gap-12` actúa como *row-gap* vertical. `-inset-8` (32px) < `gap-12` (48px) → **16px (1rem) de
  buffer** antes de invadir el bloque de texto apilado arriba. Correcto.
- A partir de `lg`: `lg:grid-cols-2` activa 2 columnas lado a lado, `lg:gap-16` actúa como
  *column-gap* horizontal. `-inset-12` (48px) < `gap-16` (64px) → **16px (1rem) de buffer**
  antes de invadir la columna de texto a la izquierda. Correcto.
- Ambos breakpoints dejan el mismo margen relativo (1rem), consistente y auditable — la
  bitácora no exagera ni redondea el cálculo.
- **`.hero-visual` no clipea el desborde:** confirmado en `Landing.tsx:317`
  (`<div className="relative hero-visual">`) — sin `overflow-hidden` propio. La única red de
  seguridad contra un desborde accidental es la `<section ref={heroRef} ... overflow-hidden ...>`
  padre (`Landing.tsx:277`), igual que documenta la bitácora.

## Alcance del diff (anti scope-creep) — verificado de forma independiente

El repo no tiene commits intermedios por ronda (el árbol completo de UX-44 sigue sin
commitear desde la ronda 1), así que no existe un `git diff` aislado de "solo esta ronda"
contra un baseline en git. Verificación alternativa, cruzando el estado actual en disco contra
lo que cada review anterior documentó explícitamente como aprobado:

- `apps/client/src/views/Landing.tsx`: el diff completo respecto al HEAD commiteado
  (`git diff apps/client/src/views/Landing.tsx`) contiene únicamente los cambios ya descritos y
  aprobados en `review_UX-44.md` (cableado inicial: lazy import, `useGSAP`, `webglSupported`,
  clases `.hero-*`) y `review_UX-44-fix.md` (`isLoaded, userId` en `dependencies`, guarda
  `if (!heroRef.current) return;`). No hay ninguna línea adicional respecto a lo que
  `review_UX-44-fix.md` ya auditó línea por línea — confirma que **esta ronda (fix2) no tocó
  `Landing.tsx`**, tal como declara `impl_UX-44-fix2-frontend.md`.
- `apps/client/package.json`: `git diff` muestra únicamente las mismas 6 dependencias
  (`@gsap/react`, `@react-three/drei`, `@react-three/fiber`, `gsap`, `three`, `@types/three`)
  ya auditadas en la ronda 1 — sin librerías nuevas agregadas en esta ronda.
- `apps/client/src/components/landing/Hero3DScene.tsx`: archivo nunca commiteado (aparece como
  `??` sin tracking en `git status`, no en `git diff`), por lo que se auditó por lectura directa
  completa (arriba) en vez de diff — único cambio real respecto a la versión descrita en
  `impl_UX-44-frontend.md`/`review_UX-44.md` es la clase del wrapper (`inset-0` →
  `-inset-8 lg:-inset-12`) y el comentario nuevo. Sin cambios a `Blob`, luces, cámara ni al resto
  del render.
- Ningún otro archivo de `apps/client/src/` aparece en `git status` fuera de los ya conocidos
  (`Landing.tsx`, `package.json`, `components/landing/` completo). Sandbox hermético respetado.

## Verificación de builds (re-ejecutados de forma independiente, no se confió en la bitácora)

- `pnpm --filter @estetica/client build` (ejecutado como `pnpm build` dentro de
  `apps/client/`) → **exit 0**. Code-splitting intacto:
  `dist/assets/Hero3DScene-B2BDziJX.js 884.70 kB` como chunk separado de
  `dist/assets/index-6GimJHn-.js 1,695.22 kB`.
- `pnpm --filter @estetica/client lint` → **exit 0**, `✖ 4 problems (0 errors, 4 warnings)`.
  Los 4 warnings son exactamente los mismos preexistentes (`react-hooks/incompatible-library`
  por `watch()` de react-hook-form) en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:126`,
  `Negocio.tsx:83`, `Turnos.tsx:208` — ninguno de esos 4 archivos aparece en `git status` de
  esta sesión ni fue tocado en ninguna ronda de UX-44. Sin warnings nuevos.

## Regresión de rondas anteriores — verificado

- `useGSAP` (`Landing.tsx:172`) conserva `dependencies: [prefersReducedMotion, isLoaded, userId]`
  y la guarda `if (!heroRef.current) return;` (líneas 155-157) intacta — el fix de timing de la
  ronda 2 no fue tocado ni revertido.
- Fallback sin WebGL (`isWebGLAvailable()`, `Landing.tsx:24-31`, condicional
  `{webglSupported && <Suspense>...}`, `Landing.tsx:311`) y `prefers-reduced-motion` (prop
  `prefersReducedMotion` pasada a `Hero3DScene`, early-return en `useFrame` y rama
  `gsap.set(...)` en la timeline) — ambos intactos, sin modificaciones en esta ronda.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** una sola feature `in_progress`
  (`UX-44`, confirmado — único match de `"status": "in_progress"` en `feature_list.json`).
  Cambio quirúrgico acotado a una línea de clase + un comentario en un único archivo
  (`Hero3DScene.tsx`). Sandbox hermético: `git status` no muestra ningún archivo fuera de los
  ya conocidos de esta feature.
- [x] **C3 (Fidelidad Arquitectónica — Frontend):** sin scope creep, sin dependencias nuevas,
  sin tocar `Landing.tsx` en esta ronda, sin introducir `<div onClick>`/`role="button"`, wrapper
  decorativo sigue con `aria-hidden="true"` + `pointer-events-none`. `export default` preservado.
- [x] **C4 (Compilación Estática + Lint):** build y lint re-verificados de forma independiente,
  ambos exit 0, sin warnings/errores nuevos.
- N/A **C5 (Cierre de Sesión):** corresponde al leader tras este veredicto.
- N/A **C6 (Capa de Datos):** feature 100% frontend, sin modelos Mongoose involucrados.
- N/A **C7 (Security Gate):** sin backend tocado, sin variables sensibles ni endpoints.
- [x] **C8 (Estabilidad de API):** sin cambio de contrato de API — no aplica `CHANGELOG.md`.

## Cambios Requeridos

Ninguno. El fix es quirúrgico, matemáticamente consistente con el layout real del grid, no
introduce regresiones sobre los fixes de las rondas 1 y 2, y build/lint pasan en verde
verificados de forma independiente.

## Estado en `feature_list.json`

`UX-44` actualizado de `"in_progress"` a `"done"` por este reviewer. Campo `reopen_note`
removido (el bug que documentaba —blob oculto detrás de la card— es precisamente el que corrige
este fix2, ya auditado arriba). El historial completo de las 3 rondas queda preservado en
`progress/history.md` y en `review_UX-44.md` / `review_UX-44-fix.md` / este archivo.
