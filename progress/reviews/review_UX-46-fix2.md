# Reporte de Revisión Técnica — Feature UX-46 (ronda de fix2)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-27

## Resumen de lo auditado

Ronda quirúrgica de fix2 sobre el `reopen_note` de `UX-46`: bug de coordenadas del cursor en
`DotField.tsx` (el fondo animado del resto de la Landing) reportado por el usuario en navegador
real ("no se ven los puntos, se ve un círculo que sigue al cursor, pero debajo del mismo"). Dos
cambios:

1. `apps/client/src/components/landing/DotField.tsx` — `onMouseMove` pasa de
   `e.pageX/pageY - offsetX/offsetY` (offset calculado solo en mount/resize, nunca en scroll) a
   `e.clientX`/`e.clientY` directo. `offsetX`/`offsetY` eliminados de `SizeState`, `sizeRef` y
   `doResize()` como código muerto.
2. `apps/client/src/views/Landing.tsx` (punto de montaje de `<DotField />`) — hallazgo secundario:
   `DOTFIELD_DOT_COLOR` `rgba(107, 52, 68, 0.10)` → `rgba(107, 52, 68, 0.18)`; prop `dotRadius` del
   mount `1` → `1.5`, para que la grilla estática sea perceptible en reposo.

## Verificación matemática del fix (no solo "compila")

Confirmado por lectura directa de código, no por lo que afirma la bitácora:

- El wrapper de montaje real de `DotField` en `Landing.tsx:489` es
  `<div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">`. `position: fixed`
  posiciona el elemento respecto al **viewport**, no al documento — `inset-0` fija sus 4 bordes en
  `0` respecto al viewport, **independientemente del scroll**.
- `DotField.tsx:157-175` (`doResize`) calcula `rect = canvas.parentElement.getBoundingClientRect()`.
  `canvas.parentElement` es el `<div style={{position:'relative', width:'100%', height:'100%'}}>`
  interno (línea 335) — único hijo del wrapper `fixed inset-0`, sin `top`/`left` propios (permanece
  en flujo normal), por lo que ocupa exactamente la caja de contenido del padre `fixed`. Consecuencia:
  `rect.top === 0` y `rect.left === 0` **siempre**, para cualquier posición de scroll de la página.
- Dado `rect.left = rect.top = 0` de forma constante, `e.clientX - rect.left === e.clientX` y
  `e.clientY - rect.top === e.clientY` — es decir, usar `clientX`/`clientY` sin resta es
  matemáticamente idéntico a restar `rect.left`/`rect.top` en este caso particular (contenedor
  `fixed inset-0`). El cálculo previo (`pageX/Y - offset`, con `offset = rect.left/top +
  scrollX/scrollY` recalculado solo en mount/resize) introducía un término `scrollX/scrollY`
  congelado en el momento del mount que nunca debía estar ahí para un contenedor `fixed` — de ahí el
  desplazamiento hacia abajo proporcional al scroll acumulado desde el mount, coincidente con el
  síntoma reportado. El fix es correcto.
- `grep -n "offsetX\|offsetY" DotField.tsx` → único match es el comentario explicativo del propio
  fix (línea 185, texto histórico "el cálculo anterior..."), no queda ninguna variable, campo de
  tipo ni asignación viva. `SizeState` (líneas 24-27) solo tiene `w`/`h`; `sizeRef` inicial (línea
  103) y la asignación en `doResize` (línea 172) son `{ w, h }` sin más campos.
- Resto de `doResize()` (`rect.width/height`, `canvas.width/height`, `ctx.setTransform`,
  `buildDots(w, h)`) intacto — no dependía de `offsetX`/`offsetY`.
- Cleanup de listeners/RAF (`cancelAnimationFrame`, `clearInterval`, `clearTimeout`,
  `removeEventListener` ×2, líneas 323-331) y la guarda de `prefers-reduced-motion`
  (`if (!prefersReducedMotion) { rafRef.current = requestAnimationFrame(tick); } else { tick(); }`,
  líneas 309-321) sin cambios respecto a la ronda `UX-46-fix` ya auditada y aprobada.
- `Landing.tsx:90` (`DOTFIELD_DOT_COLOR`) y `Landing.tsx:491` (prop `dotRadius={1.5}` del mount)
  confirmados con los valores exactos que declara la bitácora.

## Corridas propias (reviewer)

- `pnpm --filter @estetica/client build` → **exit 0**. Único warning preexistente de
  `chunk size > 500kB`, no introducido en esta ronda.
- `pnpm --filter @estetica/client lint` → **exit 0**, 4 warnings (`react-hooks/incompatible-library`
  por `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`,
  `Turnos.tsx`) — todos preexistentes, ninguno en `DotField.tsx`/`Landing.tsx`.
- `git diff --stat HEAD -- apps/client/package.json pnpm-lock.yaml` → único delta:
  `"ogl": "1.0.11"` (agregado en una ronda ANTERIOR de UX-46 para `Silk.tsx`, ya aprobado en
  `review_UX-46-fix.md`). Sin dependencias nuevas en esta ronda.
- `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin resultados
  (Gate de variables sensibles, N/A de todos modos: esta ronda no toca `apps/server`).
- Sandbox hermético: `apps/client` de forma exclusiva. `DotField.tsx` (mtime `17:10:46`) y
  `Landing.tsx` (mtime `17:10:55`) son los dos únicos archivos con timestamp reciente de esta ronda;
  `LogoLoop.tsx` (`16:28`), `MagicBento.tsx` (`16:47`) y `Silk.tsx` (`15:47`) quedaron sin tocar —
  consistente con lo declarado en la bitácora ("Archivos modificados: DotField.tsx, Landing.tsx").
  No hay commit de checkpoint previo para diffear estos archivos untracked directamente, de ahí el
  uso de mtime como evidencia corroborante adicional a la lectura de código.
- Sin `console.log`/`debugger`/`// TODO` sin ticket en los dos archivos tocados.
- `feature_list.json`: una sola feature en `"in_progress"` (`UX-46`), confirmado con grep. Solo esa
  feature figura activa en `progress/current.md`, sin mezclar con backlog de otras features.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, sandbox
  hermético (`apps/client`), bitácora en disco (`impl_UX-46-fix2.md`), `progress/current.md`
  enfocado exclusivamente en esta ronda.
- [x] C3 (Fidelidad Arquitectónica) — sin cambios de backend/DB; feature 100% visual/frontend. El
  fix respeta el patrón ya establecido (`docs/patterns-frontend.md § P15` para reduced-motion, sin
  tocarlo). Paginación/multi-tenancy no aplica.
- [x] C4 (Compilación Estática + Lint) — build y lint exit 0, re-ejecutados por el reviewer, sin
  errores ni warnings nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — se cierra esta ronda con `"done"` en `feature_list.json`
  (aplicado a continuación de este reporte).
- [x] C6 (Capa de Datos) — no aplica, sin cambios de modelos/DB.
- [x] C7 (Security Gate) — no aplica backend; sin secretos hardcodeados; sin
  `dangerouslySetInnerHTML` introducido.
- [x] C8 (Estabilidad de API) — no aplica, sin cambios de contrato de API.

## Limitaciones de este entorno (sin navegador real)

Este reviewer no puede confirmar visualmente que el glow/bulge de `DotField` ahora sigue al cursor
sin desfasaje al scrollear — el entorno de auditoría no dispone de navegador real ni de mouse
físico para reproducir la interacción. La aprobación se basa en:
(a) verificación matemática por lectura de código de que `getBoundingClientRect()` del contenedor
`fixed inset-0` siempre devuelve `{top:0, left:0}` independientemente del scroll, haciendo que
`clientX`/`clientY` sin compensación sea la coordenada correcta; y
(b) ausencia de cualquier resto de la lógica de offset previa (código muerto verificado eliminado).
Se recomienda al usuario confirmar en su navegador real: (1) que el glow/círculo ahora coincide
exactamente con la posición del cursor real al scrollear por Funcionalidades/Stats/Cómo
funciona/CTA/footer; (2) que la grilla estática de puntos ahora se percibe en reposo con los nuevos
valores de opacidad/radio.
