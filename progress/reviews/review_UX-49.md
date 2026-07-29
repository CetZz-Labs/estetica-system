# Reporte de Revisión Técnica — Feature UX-49

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-28

## Alcance Auditado

`apps/client/src/components/landing/DotField.tsx` (radialGradient del glow + techo de opacidad
configurable) y `apps/client/src/views/Landing.tsx` (constante `DOTFIELD_GLOW_COLOR`).

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** `UX-49` está `in_progress` junto con
  `UX-50`..`UX-53` de forma simultánea. Esto se aparta literalmente del checkpoint "máximo una
  feature `in_progress`", pero corresponde a una decisión deliberada del leader (5 ajustes
  chicos, no conflictivos, sobre el mismo `Landing.tsx`, en la misma sesión, para evitar 5 rondas
  de revisión separadas). Se registra como observación de proceso, no como bloqueante — evaluado
  igual el resto de C2: `progress/implements/impl_UX-49.md` existe con bitácora completa; el
  sandbox queda acotado a `DotField.tsx` + la constante/comentario de `DOTFIELD_GLOW_COLOR` en
  `Landing.tsx` (confirmado con `git diff --ignore-all-space`).
- [x] **C3 (Fidelidad Arquitectónica):** no aplica paginación/multi-tenancy (feature 100%
  visual). Verificado en el diff real (`git diff --ignore-all-space -- DotField.tsx`):
  - `<radialGradient>`: los 3 stops (`0%`, `45%`, `100%`) usan el mismo `stopColor={glowColor}`,
    variando únicamente `stopOpacity` (`1`, `0.35`, `0`) — cero `stopColor="transparent"` ni
    interpolación hacia negro. Cumple el criterio de aceptación 1.
  - Prop nueva `glowMaxOpacity?: number` (default `0.22`) agregada a `Props`, `DynamicProps` y al
    objeto sincronizado en `propsRef` (mismo mecanismo ya usado para el resto de props leídas
    dentro de `tick()`). La línea de convergencia pasa de
    `glowOpacity.current += (eng - glowOpacity.current) * 0.08` a
    `glowOpacity.current += (eng * p.glowMaxOpacity - glowOpacity.current) * 0.08` — el glow
    converge como máximo a `glowMaxOpacity`, nunca a disco sólido. Cumple criterio 2.
  - `DOTFIELD_GLOW_COLOR` en `Landing.tsx` pasa de `'#6B3444'` (wine) a `'#D98BA4'`
    (accent-rose, `docs/design.md` §2.3) con comentario explicando el motivo. Cumple criterio 3.
  - Ningún `linear-gradient`/`radial-gradient` CSS ni clase `bg-gradient-*` introducido; el
    `radialGradient` SVG de un solo color hacia alfa 0 permanece dentro de la excepción existente
    de `docs/design.md` §13.1. Cumple criterio 4.
  - La guarda de `prefersReducedMotion` (rama de frame único sin RAF) y el fix de coordenadas de
    cursor de UX-46-fix2 (`onMouseMove` con `e.clientX`/`e.clientY`) no aparecen en el diff —
    intactos. Cumple criterio 5.
- [x] **C4 (Compilación Estática + Lint):** re-ejecutados por este reviewer sobre el estado
  actual del working tree (con las 5 features del pase ya aplicadas):
  - `pnpm --filter @estetica/client build` → exit 0 (`tsc -b && vite build`, sin errores; único
    warning preexistente de tamaño de chunk >500kB, no relacionado).
  - `pnpm --filter @estetica/client lint` → exit 0, **0 errors**, 4 warnings preexistentes
    (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`,
    `Negocio.tsx`, `Turnos.tsx` — ninguno relacionado a esta feature).
- [x] **C5 (Cierre de Sesión Append-Only):** pendiente de completar por el leader tras este
  veredicto (entrada en `progress/history.md`, restauración de `progress/current.md`) — no
  bloqueante para el veredicto de código.
- [x] **C6 (Capa de Datos):** no aplica — sin modelos Mongoose ni `apps/server/` tocados.
- [x] **C7 (Security Gate):** no aplica — sin backend, sin endpoints, sin variables de entorno.
  Auditoría de variables sensibles (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/`)
  no aplicable (cero archivos de backend en el diff de esta feature).
- [x] **C8 (Estabilidad de API):** no aplica — sin cambios de contrato de API.

## Nota sobre la reindentación pendiente (impl_UX-49.md, sección "Corrección post-review ronda 2")

La bitácora documenta que una ronda 2 del coordinador pidió revertir una reindentación cosmética
del bloque HERO y el `className` de `AnimatedStat` en `Landing.tsx`, y que el implementer no
completó esa limpieza por detectar ediciones concurrentes en vivo del usuario sobre ese archivo.
Confirmado con `git diff --ignore-all-space -- Landing.tsx` en el estado final auditado: el bloque
HERO no muestra reindentación espuria (el diff es limpio, hunk por hunk, atribuible a cambios
reales de UX-49/50/51/52/53 + las ediciones manuales del usuario fuera de alcance de esta
auditoría, según instrucción explícita del leader). No se registra impacto negativo remanente.

## Cambios Requeridos

Ninguno. La implementación cumple los 6 criterios de aceptación de `UX-49` en `feature_list.json`.
