# Reporte de Exploración — UX-24

**Pregunta:** ¿Cómo se resuelve el recorte del `<Select>` de hora (react-select) contra el borde inferior del modal, replicando el patrón de portal de UX-18 (P11), sin romper el cierre por click-afuera (UX-22) ni el resto de los selects?

**Contexto:** UX-24 — bug visual reportado por el usuario, agregado en `progress/current.md` (2026-07-07). Continuación directa de UX-17 (selector de hora con slots) y precedente técnico UX-18 (P11).

**Timestamp:** 2026-07-08

## Hallazgos

1. `docs/patterns-frontend.md:463-482` (§ P11): patrón documentado exacto — la causa raíz es que la librería posiciona el flotante con `position: absolute` **inline en el árbol de React**, quedando sujeto al stacking context/`overflow` del contenedor padre. Fix textual dado como ejemplo ya para react-select:
   ```tsx
   <Select menuPortalTarget={document.body} styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }} />
   ```
   Gotcha explícito: el `z-index` alto es complemento, no sustituto, del portal.

2. `apps/client/src/components/ui/Modal.tsx:53` — overlay con `onClick={onClose}` y `z-50` (z-index 50). Línea 56-57: contenedor interno con `onClick={(e) => e.stopPropagation()}` y clase `overflow-hidden flex flex-col max-h-[90vh]` — este es el contenedor que recorta cualquier flotante `absolute` que se salga de sus bordes. Línea 85: el body interno agrega `overflow-y-auto` — segundo nivel de recorte si el menú desplegado excede el área visible del scroll.

3. `apps/client/src/views/Turnos.tsx` — 4 instancias de `<Select>` de react-select dentro del modal de turno (`isFormModalOpen`, `Modal` en línea 584-708, `maxWidth="max-w-lg"`), **ninguna** con `menuPortalTarget` ni `styles.menuPortal` actualmente:
   - Cliente: líneas 599-609 (con `Controller`).
   - Servicio: líneas 620-630.
   - Profesional: líneas 643-653.
   - **Hora** (el afectado por UX-24, agregado en UX-17): líneas 682-692, con `validate` en `rules` (líneas 672-681) que compara contra `originalStartTimeRef.current` (patrón P8).
   - `selectStyles` compartido: líneas 37-53 (un solo objeto `StylesConfig` reutilizado por los 4 Select de este archivo).

4. `apps/client/src/components/RegistroModal.tsx` — mismo patrón, modal más largo (`maxWidth="max-w-3xl"`, línea 264, `containerClassName="flex flex-col max-h-[90vh]"` redundante con el default de `Modal.tsx`). 5 instancias de `<Select>`, ninguna con portal:
   - Cliente: 271-286.
   - Servicio: 293-308.
   - Profesional: 315-330.
   - **Hora de retoque** (agregado en UX-17, el más expuesto al bug porque está a mitad del formulario largo, dentro del área con `overflow-y-auto`): líneas 356-378, con `validate` cruzado con `touchupDate` (líneas 359-366).
   - Insumo/producto (independiente del form, sin `Controller`): líneas 390-397.
   - `selectStyles` compartido: líneas 38-56.

5. Confirmado por `Grep` en `apps/client/src`: no existe **ningún** uso previo de `menuPortalTarget`/`menuPortal` en el codebase — UX-24 sería el primer precedente real de portal en react-select (UX-18 usó portal en `react-tooltip`, no en react-select). `package.json:28` → `react-select@^5.10.2` (soporta `menuPortalTarget` nativamente vía `ReactDOM.createPortal`).

6. `Turnos.tsx` (línea 6-7, 15-16) y `RegistroModal.tsx` (línea 6) confirman que **solo estas dos vistas** usan react-select; los matches en `Inventario.tsx`/`Dashboard.tsx` son falsos positivos (variables `selectedProduct`/`selectedAppointmentDetail`, no react-select).

7. **Riesgo de click-afuera (UX-22):** react-select v5, con `menuPortalTarget={document.body}`, renderiza el menú vía `ReactDOM.createPortal` **sin desmontar el `<Select>` del árbol de React** — solo cambia el nodo DOM destino. React documenta explícitamente que un evento disparado dentro de un portal se propaga a los ancestros del **árbol de React contenedor**, no del árbol DOM. Esto significa que un click en una opción del menú (aunque el `<div>` del menú viva como hijo directo de `document.body` en el DOM) sigue burbujeando, vía React, hasta el contenedor del modal con `onClick={(e) => e.stopPropagation()}` (`Modal.tsx:56`) **antes** de llegar al overlay con `onClick={onClose}` (`Modal.tsx:52`). No hay precedente de portal en react-select en el repo para verificar esto empíricamente en runtime (no hay entorno E2E disponible, ver limitación anotada en `progress/current.md:31`), pero es el comportamiento documentado de React Portals y es el mismo mecanismo por el cual UX-22 ya funciona hoy con los otros controles internos del modal (inputs, botones) sin necesitar `stopPropagation` individual en cada uno.

## Diagnóstico

La causa exacta coincide con la hipótesis de `progress/current.md`: el menú de los `<Select>` de hora en `Turnos.tsx:682-692` y `RegistroModal.tsx:356-378` se posiciona `absolute` dentro del árbol del modal, y queda recortado por `overflow-hidden` (contenedor, `Modal.tsx:57`) y/o `overflow-y-auto` (body, `Modal.tsx:85`). El fix es el patrón P11 ya documentado, sin necesidad de generalizarlo: agregar `menuPortalTarget={document.body}` + `styles.menuPortal` con `zIndex` ≥ 51 (mayor al `z-50` del overlay del `Modal.tsx:53`) a cada `<Select>` de hora. El riesgo de romper UX-22 es bajo por el comportamiento estándar de bubbling de React Portals (el click en el menú portaleado sigue bubbleando por el árbol de React, no el DOM, y es interceptado por el `stopPropagation` del contenedor del modal antes de llegar al overlay), pero no hay forma de verificarlo en runtime en este entorno — el reviewer debería marcarlo como punto de atención en el checklist manual/QA humano post-merge.

## Recomendación

Implementación mínima y acotada (alcance literal de los AC): en **ambos** archivos, a los `<Select>` de **hora** únicamente:
- `apps/client/src/views/Turnos.tsx:682-692` (Select de `time`).
- `apps/client/src/components/RegistroModal.tsx:356-378` (Select de `touchupTime`).

Agregar en cada uno:
```tsx
<Select
    options={timeOptions}
    ...
    menuPortalTarget={document.body}
    styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
/>
```
En vez de mutar el objeto `selectStyles` compartido (líneas 37-53 de `Turnos.tsx` y 38-56 de `RegistroModal.tsx`, usado también por Cliente/Servicio/Profesional/Producto), spread inline en el Select afectado para no tocar el estilo de los demás — así se cumple al pie de la letra el AC3 ("no debe romper... el resto de los selects existentes") sin efectos colaterales. `zIndex: 9999` replica el valor ya usado como ejemplo en P11 y es consistente con cualquier z-index de overlays existentes en la app (Modal usa z-50).

## Preguntas abiertas / decisiones de producto pendientes

1. **Alcance del fix — ¿solo Hora, o los 7 Select restantes también?** Cliente/Servicio/Profesional/Producto usan el mismo `selectStyles` sin portal y viven en el mismo contenedor con `overflow-hidden`/`overflow-y-auto`, por lo que en teoría comparten la misma causa raíz (ej. el Select de Profesional en `RegistroModal.tsx` podría recortarse igual si el usuario hace scroll y abre el menú cerca del borde inferior). El AC3 ("no debe romper... el resto de los selects existentes") sugiere alcance conservador — no tocarlos —, pero no aclara si deben recibir el mismo fix preventivo. Recomendación: acotar el diff de UX-24 solo a Hora (menor deuda de revisión, cumple AC1/AC2 al pie de la letra) y abrir una deuda técnica anotada en `progress/current.md` para evaluar generalizar el portal a los demás Select en una feature futura si se reporta el mismo síntoma.
2. **Verificación de UX-22 en runtime:** sin entorno E2E disponible (limitación ya anotada en `progress/current.md:31`), la garantía de que el portal no rompe el cierre por click-afuera es analítica (comportamiento documentado de React Portals), no verificada empíricamente. El reviewer debería dejarlo explícito como punto de riesgo aceptado o pedir verificación manual del usuario post-deploy.

## Alcance sugerido

**Complejidad: Trivial.** 1 `implementer` de frontend, 2 archivos (`Turnos.tsx` y `RegistroModal.tsx`), 1 `<Select>` por archivo (2 ediciones puntuales, ~4-6 líneas de diff cada una). No requiere `explorer` adicional ni fragmentación en PRs — single PR directo según la matriz de escalado de `CLAUDE.md`. Sí requiere `reviewer` estándar (build + lint) con nota explícita de verificar manualmente el comportamiento de click-afuera dado que no hay E2E en este entorno.
