# Implementación — UX-24 (Frontend)

**Feature:** UX-24 — Bug visual: el selector de hora (react-select) se tapa con el borde inferior del modal de turno
**Sandbox:** `apps/client/` (frontend únicamente, sin tocar `apps/server/`)

## Archivos modificados

1. `apps/client/src/views/Turnos.tsx` (líneas ~682-693, Select de `time` dentro del `Controller` del formulario de turno)
2. `apps/client/src/components/RegistroModal.tsx` (líneas ~368-378, Select de `touchupTime` dentro del `Controller` del formulario de retoque)

## Diff conceptual (ambos archivos, mismo patrón)

En el `<Select>` de Hora / Hora de retoque se reemplazó:

```tsx
styles={selectStyles}
```

por:

```tsx
styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
menuPortalTarget={document.body}
```

- El objeto compartido `selectStyles` (líneas 37-53 de `Turnos.tsx`, 38-56 de `RegistroModal.tsx`) **no se mutó** — se hizo spread inline solo en el Select de hora de cada archivo. El resto de los Select del formulario (Cliente, Servicio, Profesional, Producto/Insumo) siguen usando `styles={selectStyles}` sin ningún cambio.
- Se replica exactamente el patrón documentado en `docs/patterns-frontend.md` § P11 (portal + `menuPortal` con `zIndex` alto), aplicando `zIndex: 9999` como en el ejemplo del catálogo.
- No se tocó la lógica de `rules.validate` (comparación contra `originalStartTimeRef` en Turnos.tsx, cruce con `watchedTouchupDate` en RegistroModal.tsx), ni las opciones filtradas por disponibilidad (`timeOptions`/`touchupTimeOptions`, UX-17), ni ningún otro Select, componente o archivo.

## Verificación de entorno

1. `pnpm --filter @estetica/client build`
   - `tsc -b && vite build` → **Exit Code 0**. Build completo sin errores de tipos (react-select acepta `menuPortalTarget`/`menuPortal` nativamente en v5, sin necesidad de casts). Único output es el warning preexistente de chunk > 500kB, no relacionado con este cambio.

2. `pnpm --filter @estetica/client lint`
   - **Exit Code 1**, pero con la deuda técnica preexistente ya conocida y documentada en la tarea, sin ningún error/warning NUEVO introducido por este cambio:
     - `ProductoModal.tsx:37` — `'stock' is assigned a value but never used` (preexistente, no tocado en esta feature).
     - 4 warnings `react-hooks/incompatible-library` (Compilation Skipped por uso de `watch()` de react-hook-form) en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:125`, `Negocio.tsx:73`, `Turnos.tsx:214` — preexistentes, ninguno en las líneas modificadas por UX-24.
   - Confirmado: ningún warning/error nuevo asociado a las líneas del Select de hora modificadas.

## Hallazgos / verificación del riesgo anotado por el explorer

- Riesgo de romper el cierre por click-afuera (UX-22) al portalear el menú a `document.body`: **no encontré nada en el código que lo contradiga**. El `stopPropagation` del contenedor del modal (`Modal.tsx:56`) sigue intacto y no requirió ningún ajuste — el comportamiento estándar de bubbling de React Portals (documentado por el explorer) se mantiene como única garantía; no hay entorno E2E en este sandbox para verificarlo en runtime. Se deja como punto de atención para QA manual post-merge, tal como señaló el explorer.
- No se detectaron efectos colaterales en los demás Select (Cliente/Servicio/Profesional/Producto) de ninguno de los dos archivos: siguen referenciando `selectStyles` sin `menuPortalTarget`, comportamiento visual sin cambios.

## Deuda técnica anotada (no resuelta en esta feature, por decisión de producto ya confirmada)

El explorer identificó que los demás 7 Select (Cliente/Servicio/Profesional/Producto en ambos archivos) comparten la misma causa raíz (mismo contenedor con `overflow-hidden`/`overflow-y-auto`) y podrían recortarse igual en escenarios de scroll cerca del borde inferior. Por decisión de producto ya confirmada con el usuario, el alcance de UX-24 se acotó únicamente al Select de Hora en ambos archivos. Pendiente: evaluar en una feature futura generalizar `menuPortalTarget`/`styles.menuPortal` al resto de los Select si se reporta el mismo síntoma (ver `progress/explores/explore_UX-24.md`, sección "Preguntas abiertas / decisiones de producto pendientes", punto 1).

## Estado

Feature lista para revisión (`reviewer`). **No se cambió el `status` en `feature_list.json`** — queda en `"in_progress"`, a la espera del veredicto del reviewer.
