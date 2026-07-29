# Reporte de Revisión Técnica — Feature UX-54

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-29

## Contexto auditado

- Bitácora: `progress/implements/impl_UX-54.md`.
- Archivo modificado: `apps/client/src/components/landing/guide/GuideIndex.tsx` (línea 49):
  `<nav aria-label="Índice de módulos de la guía" className="lg:h-full">`.
- Contraste con `apps/client/src/views/Guia.tsx` (línea 100):
  `<div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">`
  con `<div className="order-1">` (línea 101, sin `self-start`/`h-fit` que anule el stretch)
  envolviendo `<GuideIndex>` y `<div className="order-2 min-w-0">` (línea 105) con el contenido
  de los 9 módulos.

## Razonamiento de la auditoría

Al no declarar `align-items` en el contenedor grid, aplica el valor por defecto `stretch`: el
grid extiende el margin-box de `div.order-1` (y por lo tanto le asigna una altura *definida*,
no `auto`) para igualar la altura de la fila, que queda determinada por el contenido más alto —
la columna de módulos (`order-2`). Esa altura definida en el grid item es justamente lo que
habilita que un hijo con `height: 100%` (`lg:h-full` de Tailwind) resuelva correctamente contra
ese porcentaje — a diferencia de un `height: auto` no estirado, donde `h-full` no tendría
ninguna referencia y colapsaría al contenido. Con el `<nav>` ahora heredando esa altura real, su
`<ul className="... lg:sticky lg:top-24">` (línea 51) tiene recorrido vertical real dentro del
containing block del `<nav>`, resolviendo el bug reportado.

Verifiqué que la clase se aplica únicamente con el prefijo `lg:` (no afecta el layout mobile) y
que la rama mobile (`<div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">`, línea 72, con
su propio `<ul className="flex w-max gap-2">` sin sticky) queda completamente intacta — no fue
tocada por el diff.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — cambio de 1 línea, acotado a
  `GuideIndex.tsx`, coherente con el diagnóstico documentado en la bitácora. (Nota no
  bloqueante: UX-54 y UX-55 coexistieron como `"in_progress"` simultáneamente en
  `feature_list.json` porque se auditan en la misma sesión por decisión explícita del
  orquestador — ambas tocan archivos disjuntos de la misma carpeta y se cierran juntas en esta
  revisión, sin superposición de diff.)
- [x] C3 (Fidelidad Arquitectónica) — componente de presentación puro, sin llamadas HTTP, sin
  estados de datos (no aplica loading/error/empty/data: `guideContent.ts` es contenido
  estático). HTML semántico intacto (`<nav>`, `<ul>`, `<a>`).
- [x] C4 (Compilación Estática + Lint) — verificado de forma independiente por este auditor:
  `pnpm --filter @estetica/client build` → exit code 0 (`tsc -b && vite build` sin errores).
  `pnpm --filter @estetica/client lint` → exit code 0, 4 warnings preexistentes de
  `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`,
  `Negocio.tsx`, `Turnos.tsx` — ninguno en los archivos tocados por esta feature.
- [x] C5 (Cierre de Sesión Append-Only) — evidencia en disco: `progress/implements/impl_UX-54.md`
  y este review. Actualización de `progress/history.md`/`progress/current.md` queda a cargo del
  leader al cerrar la sesión (fuera del alcance de este auditor según instrucción recibida).
- [x] C6 (Capa de Datos) — N/A, no hay modelos Mongoose involucrados en esta feature.
- [x] C7 (Security Gate) — N/A, no hay endpoints ni queries involucrados. Sin
  `dangerouslySetInnerHTML` introducido.
- [x] C8 (Estabilidad de API) — N/A, no hay cambio de contrato de API.

## Cambios Requeridos (Si aplica)
Ninguno.
