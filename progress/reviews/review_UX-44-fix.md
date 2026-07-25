# Reporte de Revisión Técnica — Feature UX-44 (fix, ronda 2)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-22

## Limitación conocida (explícita, igual que la ronda 1)

Sin navegador real disponible en este entorno. Esta aprobación es sobre la **corrección lógica
del código** (que el efecto `useGSAP` ahora se re-dispara contra el DOM real del hero), no sobre
haber observado la animación funcionando en pantalla. Se recomienda que el usuario confirme
visualmente antes de dar el ciclo por cerrado.

## Auditoría del fix (`apps/client/src/views/Landing.tsx`)

- **Cantidad de `return` tempranos antes del JSX del hero:** confirmado por lectura completa del
  componente — son exactamente 2: `if (!isLoaded)` (línea 174, spinner de Clerk) y `if (userId)`
  (línea 185, `<Navigate to="/dashboard" />`). No hay un tercer camino donde el hero no se monte.
  `dependencies: [prefersReducedMotion, isLoaded, userId]` (línea 172) cubre ambos casos: el efecto
  se re-ejecuta tanto cuando `isLoaded` pasa de `false`→`true` como si `userId` cambiara. Correcto
  y completo.
- **Guarda `if (!heroRef.current) return;`** (líneas 155-157): colocada al inicio del callback,
  antes de leer `prefersReducedMotion` o tocar cualquier target GSAP. No interfiere con la rama
  `prefersReducedMotion` (que sigue evaluándose normalmente cuando el scope sí existe). Correcta.
- **Orden de ejecución / condición de carrera:** `useGSAP` (`@gsap/react`) usa
  `useIsomorphicLayoutEffect` → `useLayoutEffect` en cliente (confirmado en
  `apps/client/node_modules/@gsap/react/src/index.js:14,40`), que corre sincrónicamente
  post-commit, después de que React asigna los refs al DOM real y antes del paint. En el render
  donde `isLoaded` pasa a `true` y `userId` es falsy, `<section ref={heroRef}>` ya está en el DOM
  cuando el layout effect corre. No queda condición de carrera residual.
- **Secuencia verificada:** render 1 (`isLoaded=false`) → efecto corre, guarda corta silenciosamente
  (sin warning); render 2 (`isLoaded=true`, `userId` falsy) → dependencia cambió, efecto se
  re-ejecuta, `heroRef.current` ya asignado, timeline corre contra el DOM real; caso alternativo
  (`userId` truthy) → dependencia cambió igual, guarda corta sin warning (no hay hero, hay redirect).
  Razonamiento sólido y sin huecos.

## Alcance del diff (anti scope-creep)

`git diff` de `Landing.tsx` respecto a la versión aprobada en ronda 1 (`impl_UX-44-frontend.md`,
archivado) muestra únicamente: (a) `isLoaded, userId` agregados a `dependencies`, (b) la guarda
`if (!heroRef.current) return;` agregada al inicio del callback, (c) el comentario explicativo del
fix. Nada más fue tocado — ni el resto del bloque `useGSAP`, ni `Hero3DScene.tsx`, ni ninguna otra
sección de la Landing. Confirmado contra la bitácora original que el `dependencies` previo era
`[prefersReducedMotion]` y no existía la guarda.

## Verificación de builds (re-ejecutados de forma independiente)

- `pnpm --filter @estetica/client build` → **exit 0**. Confirma code-splitting intacto:
  `dist/assets/Hero3DScene-D_1RPKEs.js 884.68 kB` como chunk separado de
  `dist/assets/index-BbeVam_v.js 1,695.22 kB`.
- `pnpm --filter @estetica/client lint` → **exit 0**, 0 errores. Los mismos 4 warnings
  preexistentes (`react-hooks/incompatible-library` por `watch()` de react-hook-form en
  `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — ninguno de esos
  archivos fue tocado en esta ronda ni en la anterior.

## `THREE.Clock` deprecation warning

Razonable no perseguirlo en este ciclo: es un warning interno de `@react-three/fiber@9.6.1` (no
hay llamada directa a `THREE.Clock` en `Hero3DScene.tsx`), no está relacionado con la causa raíz
del bug reportado (el problema era el scope de GSAP, no el Canvas 3D), y resolverlo requeriría
actualizar una dependencia — fuera del mandato del implementer sin aprobación explícita del
usuario. No bloqueante.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico): único archivo tocado en esta ronda,
  `Landing.tsx`, cambio quirúrgico y acotado al bug reportado.
- [x] C3 (Fidelidad Arquitectónica): sin scope creep, sin nuevas dependencias, sin tocar
  `Hero3DScene.tsx` ni otras secciones de la Landing.
- [x] C4 (Compilación Estática + Lint): build y lint exit 0, re-verificados de forma
  independiente, sin regresiones nuevas.
- N/A C5 (Cierre de Sesión): corresponde al leader tras este veredicto.
- N/A C6 (Capa de Datos): feature 100% frontend.
- N/A C7 (Security Gate): sin backend tocado.
- [x] C8 (Estabilidad de API): sin cambio de contrato.

## Cambios Requeridos

Ninguno.

## Estado en `feature_list.json`

`UX-44` actualizado de `"in_progress"` a `"done"`. Campo `reopen_note` removido (bug ya
resuelto y auditado; el historial completo del reopen queda preservado en
`progress/history.md` y en este archivo de review).
