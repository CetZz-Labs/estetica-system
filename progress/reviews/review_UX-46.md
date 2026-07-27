# Reporte de Revisión Técnica — Feature UX-46

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-27

## Alcance auditado

Frontend puro. Archivos nuevos: `apps/client/src/components/landing/Silk.tsx`,
`apps/client/src/components/landing/ShapeGrid.tsx`. Archivos modificados:
`apps/client/src/views/Landing.tsx`, `docs/design.md §13.1`, `apps/client/package.json` +
`pnpm-lock.yaml` (nueva dependencia `ogl@1.0.11`), `feature_list.json` (altas de UX-46/UX-47 por
el leader), `progress/current.md`. Backend (`apps/server/`) sin cambios — confirmado con
`git status --short` (sin entradas fuera de `apps/client/`, `docs/`, `feature_list.json`,
`pnpm-lock.yaml`, `progress/`).

## Verificaciones empíricas propias (no delegadas al reporte del implementer)

1. **Build:** `pnpm --filter @estetica/client build` → `tsc -b && vite build`, **exit code 0**, 775
   módulos transformados, sin errores de tipos. (Warning preexistente de Vite sobre tamaño de
   chunk >500kB, no relacionado con esta feature — no bloqueante.)
2. **Lint:** `pnpm --filter @estetica/client lint` → **exit code 0**, `✖ 4 problems (0 errors, 4
   warnings)`. Los 4 warnings (`react-hooks/incompatible-library` por uso de `watch()` de
   react-hook-form) están en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:126-129`,
   `Negocio.tsx:83`, `Turnos.tsx:208-211` — ninguno toca `components/landing/` ni `Landing.tsx`,
   confirmados preexistentes tal como reportó el implementer.
3. **Confinamiento de `ogl`/`Silk`/`ShapeGrid`:**
   `grep -rln "ogl\|Silk\|ShapeGrid" apps/client/src --include=*.tsx --include=*.ts` →
   únicamente `components/landing/ShapeGrid.tsx`, `components/landing/Silk.tsx`,
   `views/Landing.tsx`. Cero fuga a vistas autenticadas.
4. **Ausencia de `three`/`@react-three`/`gsap`:**
   `grep -rn "three\|@react-three\|gsap" apps/client/package.json apps/client/src` → cero matches
   en `package.json`; los 4 matches en `src` son comentarios de prosa dentro de `Silk.tsx`
   (líneas 5, 23, 150) explicando por qué la variante oficial de react-bits requería three.js, y
   un comentario preexistente de UX-45 en `Landing.tsx:99` sobre gsap. Ningún import ni entrada de
   dependencia real.
5. **`prefers-reduced-motion`:** ambos componentes reciben `prefersReducedMotion` como prop desde
   `Landing.tsx` (líneas 357 y 468, `!!prefersReducedMotion`), sin invocar `useReducedMotion()`
   internamente — mismo patrón que `HeroBlob`/`TiltCard`/`Magnetic`. Con la prop en `true`:
   - `Silk.tsx:139-143` — rama `if (prefersReducedMotion)` renderiza un único frame
     (`renderer.render`) sin asignar `rafId`; el loop de `requestAnimationFrame` solo se dispara en
     la rama `else`. Confirmado: no arranca RAF.
   - `ShapeGrid.tsx:148-152` — rama `if (prefersReducedMotion)` llama `drawGrid()` una sola vez;
     `requestAnimationFrame(updateAnimation)` solo en la rama `else`. Confirmado: no arranca RAF
     continuo. El único redibujo adicional con `prefersReducedMotion=true` es discreto, disparado
     por los handlers `mousemove`/`mouseleave` (líneas 130-134, 138-143) — no un loop persistente,
     coherente con "reducir drásticamente" (no eliminar) que exige `docs/design.md §13.1`.
6. **Dependencias nuevas:** `git diff HEAD -- apps/client/package.json` → único delta es la línea
   `+ "ogl": "1.0.11"`. `pnpm-lock.yaml` refleja exactamente esa misma alta (bloque `ogl@1.0.11`
   en `importers` y `packages`/`snapshots`). Ninguna otra dependencia nueva ni bump de versión de
   una dependencia existente en este diff.
7. **Higiene de depuración:** `grep -rn "console\.\|debugger\|TODO"` sobre `Silk.tsx`,
   `ShapeGrid.tsx` y `Landing.tsx` → sin matches.
8. **`dangerouslySetInnerHTML`:** sin matches en `components/landing/` ni `Landing.tsx`.
9. **Variables sensibles (gate transversal):**
   `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin matches
   (no aplica de todos modos, feature 100% frontend sin tocar `apps/server/`).

## Verificación de los 6 puntos de `z-10` explícito (digest del explorer §2.3, punto más fácil de
pasar por alto)

Confirmado en `Landing.tsx`, los 6 lugares llevan `z-10` explícito y ya no `bg-bg` opaco (excepto
footer, que pasó a `bg-surface/90`, patrón ya usado en `TrustMarquee`):

1. Wrapper hero+marquee (línea 335): `relative z-10 overflow-hidden bg-bg` ✓
2. Features (línea 473): `relative z-10 scroll-mt-20` (sin `bg-bg`) ✓
3. Stats (línea 539): `relative z-10 py-16 sm:py-24` (sin `bg-bg`) ✓
4. Cómo funciona (línea 583): `py-24 sm:py-32 relative z-10 scroll-mt-20` (sin `bg-bg`) ✓
5. CTA final (línea 678): `relative z-10 py-20 sm:py-28` (sin `bg-bg`) ✓
6. Footer (línea 760-761): `relative z-10 border-t border-border bg-surface/90` ✓

`ShapeGrid` se monta (línea 462) en `<div aria-hidden className="fixed inset-0 z-0">`, fuera del
wrapper hero+marquee (que cierra en línea 450) y antes de Features (línea 472) — confirmado que no
invade el hero ni `TrustMarquee`.

## Confirmación de los 2 ítems que el implementer dejó marcados para el reviewer

**(a) Contraste/legibilidad de `Silk` sobre el hero:** el wrapper que monta `Silk` (líneas
346-349) lleva `opacity-[0.14]` + `style={{ mixBlendMode: 'multiply' }}` sobre `bg-bg` (#FAF6F4),
dentro del rango 0.10-0.18 recomendado por el explorer §5.1 y coherente con el idiom ya aprobado
en `docs/design.md §13.1` (UX-39) para los blobs con blur+blend. Por lectura de código, el shader
sale con alfa completo (`col.a = 1.0`, `Silk.tsx:65`) pero la capa de opacidad+blend del contenedor
es la salvaguarda de contraste esperada. **Limitación explícita de este entorno de revisión:** no
dispongo de navegador real ni herramienta de captura para medir el contraste resultante
texto/fondo de forma empírica (ratio WCAG); esta es una limitación estructural del `reviewer` en
este arnés (ya documentada en rondas previas de Landing, ver `progress/history.md`), no una
omisión de auditoría. La verificación visual final queda como responsabilidad del usuario humano
en el primer build servido.

**(b) Cleanup de contexto WebGL (`ogl`) en `Silk.tsx`:** confirmados por lectura de código los 4
pasos exigidos en el `return` del `useEffect` (líneas 145-158):
1. `if (rafId !== null) cancelAnimationFrame(rafId);` — cancela el RAF.
2. `resizeObserver.disconnect();` — desconecta el `ResizeObserver`.
3. `gl.getExtension('WEBGL_lose_context')?.loseContext();` — libera el contexto WebGL.
4. `if (container.contains(gl.canvas)) container.removeChild(gl.canvas);` — remueve el canvas del
   DOM (con guard de pertenencia, evita `NotFoundError` si el nodo ya no está).

Los 4 pasos están completos y en el orden correcto (cancelación → desconexión de observers →
liberación de contexto → remoción del nodo). No se detecta fuga de contexto por lectura estática
del código. **Misma limitación que (a):** no puedo ejecutar una prueba de montaje/desmontaje
repetido en un navegador real (navegación Landing → Login → Landing) para verificar empíricamente
la ausencia de contextos WebGL huérfanos — queda como verificación manual pendiente para el
usuario, documentada como tal.

## `docs/design.md §13.1`

Párrafo nuevo (líneas 521-540) confirmado coherente: acota la excepción de `ogl` exclusivamente a
`components/landing/Silk.tsx`, reafirma explícitamente que `three`, `@react-three/fiber`,
`@react-three/drei`, `gsap` y `@gsap/react` siguen fuera del proyecto (no reabre UX-45), y — a
diferencia del borrador original del explorer (`explore_UX-46.md §8`, que decía "puramente
decorativos... sin ninguna interacción" para ambos) — corrige correctamente que `ShapeGrid` sí
tiene hover simple ("`ShapeGrid` es la única excepción con interacción real dentro de esta capa
decorativa"), mientras que `Silk` permanece puramente decorativo. Consistente con el código.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` al momento de la
      auditoría; `progress/current.md` describe únicamente UX-46 (UX-47 documentado como
      dependiente, en cola, sin explorer arrancado); sandbox hermético confirmado (`git status`
      solo toca `apps/client/`, `docs/design.md`, `feature_list.json`, `pnpm-lock.yaml`,
      `progress/`); evidencia en disco (`impl_UX-46.md`, este `review_UX-46.md`).
- [x] C3 (Fidelidad Arquitectónica) — Frontend: desacoplamiento N/A (componentes decorativos sin
      fetching de datos); 4 estados N/A (no aplica a fondos WebGL/canvas puramente visuales, sin
      contrapartida en `docs/patterns-frontend.md`); HTML semántico respetado (`<div>`/`<canvas>`
      decorativos con `aria-hidden`, sin simular controles interactivos — el hover de `ShapeGrid`
      es un efecto puramente visual sobre `mousemove`/`mouseleave` de canvas, no una acción de UI);
      `export default function` en ambos componentes nuevos; interfaz `Props` local en ambos.
      Multi-tenancy/paginación no aplican (feature 100% pública, sin datos de negocio).
- [x] C4 (Compilación Estática + Lint) — build exit 0, lint exit 0 (4 warnings preexistentes sin
      relación), verificado por el reviewer de forma independiente (no solo el reporte del
      implementer).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de completar por el leader tras este veredicto
      (entrada en `progress/history.md`, `progress/current.md` restaurado a plantilla, archivado de
      `impl_UX-46.md`/`explore_UX-46.md`). El `reviewer` ya aplicó su parte: `feature_list.json`
      actualizado a `"done"` y validado con `node -e`.
- [x] C6 (Capa de Datos) — N/A, sin cambios en `apps/server/`.
- [x] C7 (Security Gate) — N/A en su mayoría (feature frontend pública sin datos sensibles). SEC-G
      verificado (sin `dangerouslySetInnerHTML`). SEC-H verificado con el grep obligatorio sobre
      `apps/server/src/` (sin matches, feature no toca backend).
- [x] C8 (Estabilidad de API) — N/A, sin cambios de contrato de API.

## Hallazgos no bloqueantes

1. **Limitación de entorno (documentada, no defecto):** los 2 puntos marcados por el implementer
   (contraste visual de Silk, ausencia de fuga de contexto WebGL en montaje/desmontaje repetido)
   solo pudieron auditarse por lectura estática de código, no por ejecución real en navegador. El
   código cumple lo exigible por lectura; la confirmación visual/runtime queda a cargo del usuario
   humano en el primer despliegue.
2. **Sin duplicación de reveal ni régimen de animación en conflicto:** los 6 `HeroBlob` retirados
   del hero y el `HeroBlob` del CTA final permanecen intactos y correctamente aislados — confirmado
   por lectura íntegra de `Landing.tsx`, coincide con lo declarado en `impl_UX-46.md`.

## Acción tomada por el reviewer

`feature_list.json` → `UX-46.status` cambiado de `"in_progress"` a `"done"`. JSON validado con
`node -e "JSON.parse(...)"` → `VALID JSON`.

## Pendiente para el leader (cierre de sesión, fuera del alcance del reviewer)

- Entrada nueva en `progress/history.md` (append-only) resumiendo la sesión.
- Restaurar `progress/current.md` a su plantilla vacía.
- `git mv` de `progress/implements/impl_UX-46.md` y `progress/explores/explore_UX-46.md` a sus
  respectivas carpetas `_archive/`, extrayendo previamente cualquier patrón reutilizable genuino
  (ej. el idiom de puerto `three.js → ogl` para shaders fullscreen con `Triangle`, si se considera
  un patrón reutilizable a futuro para `docs/patterns-frontend.md`).
