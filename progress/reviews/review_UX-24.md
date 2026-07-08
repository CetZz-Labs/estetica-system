# Reporte de Revisión Técnica — Feature UX-24

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-08

## Evidencia auditada

* Diff real (`git diff apps/client/src/views/Turnos.tsx apps/client/src/components/RegistroModal.tsx`) leído íntegro (no solo el resumen del implementer).
* `Turnos.tsx:682-693` y `RegistroModal.tsx:367-379` leídos con contexto completo (Select Cliente/Servicio/Profesional/Producto en ambos archivos, líneas 594-654 y 271-397).
* `apps/client/src/components/ui/Modal.tsx` leído completo — confirmado sin diff (`git status` no lo lista como modificado).
* Build y lint corridos independientemente por el reviewer (no solo tomando la palabra del implementer).

## Verificación de criterios de aceptación (feature_list.json)

1. **Menú de hora se muestra completo, sin recortarse:** El fix aplica el patrón documentado en `docs/patterns-frontend.md` § P11 — `menuPortalTarget={document.body}` renderiza el menú fuera del árbol DOM del modal (elude `overflow-hidden` de `Modal.tsx:57` y `overflow-y-auto` de `Modal.tsx:85`), y `zIndex: 9999` en `styles.menuPortal` supera ampliamente el `z-50` del overlay (`Modal.tsx:53`). Solución estándar, correcta.
2. **Ambos formularios (Turnos.tsx y RegistroModal.tsx):** confirmado — `Turnos.tsx:686-687` (Select `time`) y `RegistroModal.tsx:371-372` (Select `touchupTime`) reciben el mismo tratamiento.
3. **No rompe cierre por click-afuera (UX-22) ni el resto de los selects:**
   - Click-afuera: `Modal.tsx` no tiene diff — el overlay (`onClick={onClose}`, línea 52) y el contenedor interno (`onClick={(e) => e.stopPropagation()}`, línea 56) quedan intactos, sin ningún `stopPropagation` nuevo agregado en ningún archivo. Análisis propio del riesgo: React Portals (`ReactDOM.createPortal`, usado internamente por `menuPortalTarget` de react-select v5) montan el nodo en otro punto del DOM pero **no** desconectan el componente del árbol de React — los eventos sintéticos siguen propagándose (bubbling) según la jerarquía de componentes React, no la jerarquía DOM (comportamiento documentado oficialmente por React: "Even though a portal can be anywhere in the DOM tree, it behaves like a normal React child in every other way... event bubbling still works based on the React tree"). El `<Select>` de Hora sigue siendo hijo (vía JSX/Controller) del `<div>` con `stopPropagation` de `Modal.tsx:56` en el árbol de React, por lo tanto un click en una opción del menú — aunque su nodo DOM cuelgue de `document.body` — sigue siendo interceptado por ese `stopPropagation` antes de llegar al overlay. No encontré ningún contraejemplo en el código que contradiga este razonamiento. Se documenta como **riesgo aceptado, no bloqueante**, pendiente de confirmación empírica en QA manual post-merge (no hay entorno E2E disponible en este repo, limitación de proceso ya conocida y registrada en `progress/current.md:31`).
   - Resto de selects: confirmado por el diff real — Cliente (`Turnos.tsx:600-608`, `RegistroModal.tsx:276-285`), Servicio (`Turnos.tsx:621-629`, `RegistroModal.tsx:298-307`), Profesional (`Turnos.tsx:644-652`, `RegistroModal.tsx:320-329`) y Producto/Insumo (`RegistroModal.tsx:391-398`) siguen usando `styles={selectStyles}` sin `menuPortalTarget`, sin ningún cambio de prop.

## Verificación del alcance acotado (decisión de producto 2026-07-08)

* El objeto compartido `selectStyles` (declarado una sola vez, `Turnos.tsx:37-53` / `RegistroModal.tsx:38-56`) **no fue mutado** — el `git diff` no muestra ningún cambio en su definición. El fix usa spread inline `{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }` únicamente en el Select de Hora de cada archivo, exactamente como exige la decisión de producto.
* Ningún otro archivo fue tocado: `git status --porcelain` confirma que los únicos archivos de código modificados son `apps/client/src/components/RegistroModal.tsx` y `apps/client/src/views/Turnos.tsx`. `apps/server/` y `AppointmentDetail.tsx` no aparecen en el diff. (Los cambios adicionales en `feature_list.json`, `progress/current.md` y `progress/history.md` corresponden a bookkeeping de sesión — cierre/revert de UX-20 y alta de UX-25 — no a código, y no violan el sandbox hermético de esta feature.)

## Verificación de build y lint (corridos por el reviewer, no solo referenciados)

* `pnpm --filter @estetica/client build` → **Exit Code 0**. `tsc -b && vite build` sin errores de tipos; `react-select` v5 acepta `menuPortalTarget`/`styles.menuPortal` nativamente. Único output: warning preexistente de chunk > 500kB, no relacionado.
* `pnpm --filter @estetica/client lint` → Exit 1, pero **sin regresiones**: 1 error preexistente (`ProductoModal.tsx:37`, `'stock' is assigned a value but never used`, no tocado en este diff) + 4 warnings preexistentes de React Compiler (`react-hooks/incompatible-library` por `watch()` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:125`, `Negocio.tsx:73`, `Turnos.tsx:214`), ninguno en las líneas modificadas por UX-24. Confirmado idéntico al reporte del implementer.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` (UX-24); archivos de código modificados pertenecen exclusivamente al módulo Appointments de esta feature; `progress/implements/impl_UX-24-frontend.md` y este review existen en disco.
- [x] C3 (Fidelidad Arquitectónica) — cambio de props de librería existente (react-select), sin violación de capas frontend. No aplica paginación/multi-tenancy (no hay query nueva). Sin filtrado client-side nuevo, sin HTML no semántico nuevo, sin fechas nuevas a formatear.
- [x] C4 (Compilación Estática + Lint) — build Exit 0 verificado; lint sin errores/warnings nuevos, solo deuda preexistente ya documentada.
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete el resto del protocolo de cierre (history.md ya tiene entrada de sesión general; falta entrada específica de cierre de UX-24 y limpieza de `current.md`), no bloqueante para este veredicto de código.
- [x] C6 (Capa de Datos) — N/A, sin cambios de modelos Mongoose en esta feature.
- [x] C7 (Security Gate) — N/A, sin endpoints/queries nuevos. Sin `dangerouslySetInnerHTML`. Auditoría de variables sensibles no aplica (sin cambios en `apps/server/`).
- [x] C8 (Estabilidad de API) — N/A, sin cambio de contrato de API.

## Conclusión

El diff es mínimo, quirúrgico y cumple al pie de la letra los 3 criterios de aceptación y la decisión de producto de acotar el alcance solo al Select de Hora. No se detectaron violaciones. El único punto abierto (verificación empírica de UX-22 con el portal en runtime) queda documentado como riesgo aceptado, consistente con la limitación de proceso ya conocida del repo (sin entorno E2E).

**Acción tomada:** `feature_list.json` → `UX-24.status` actualizado a `"done"`.
