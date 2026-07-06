# impl_UX-22-frontend.md

## Feature: UX-22 — Cerrar modal al clickear afuera (backdrop)

## Archivo modificado
`apps/client/src/components/ui/Modal.tsx`

## Cambio (antes/después)

### Antes
```tsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
    <div
        className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
    >
```

### Después
```tsx
<div
    onClick={onClose}
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
>
    <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
    >
```

No se agregó ninguna prop nueva a `ModalProps`. No se tocó ningún consumidor de `<Modal>`.

## Verificación

### Build
```
pnpm --filter @estetica/client build
```
Resultado: **Exit 0**. `tsc -b && vite build` completó sin errores (699 módulos transformados, bundle generado en `dist/`). Único output es el warning estándar de rolldown/vite sobre chunk size (preexistente, no relacionado).

### Lint
```
pnpm --filter @estetica/client lint
```
Resultado: **1 error, 4 warnings** (mismo conteo que preexistente, ninguno originado por este cambio):
- Error: `ProductoModal.tsx:37:25` — `'stock' is assigned a value but never used` (`@typescript-eslint/no-unused-vars`). Confirmado que es el error preexistente ya documentado en el prompt de la tarea, no bloqueante.
- 4 warnings: `react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:110`, `Negocio.tsx:73`, `Turnos.tsx:350` — todos por uso de `watch()` de react-hook-form, no relacionados con `Modal.tsx`.

## Revisión de conflictos con dropdowns/portales (riesgo para el reviewer)

Se auditaron los 12 consumidores de `<Modal>`:
`RegistroModal.tsx`, `Turnos.tsx`, `Dashboard.tsx`, `Profesionales.tsx`, `ClienteModal.tsx`, `CargaMasivaClientesModal.tsx`, `ui/ConfirmModal.tsx`, `CargaMasivaModal.tsx`, `ProfesionalModal.tsx`, `ServicioModal.tsx`, `ProductoModal.tsx`, `AjusteStockModal.tsx`.

- Solo `RegistroModal.tsx` y `Turnos.tsx` usan `react-select` (`import Select ... from "react-select"`).
- Se verificó que **ninguno** de los dos configura `menuPortalTarget` (grep de `menuPortalTarget|menuPosition` en `RegistroModal.tsx` sin resultados relevantes de portal). El menú de `react-select` se renderiza **inline** dentro del árbol DOM del modal (no vía `createPortal` a `document.body`), por lo tanto:
  - Un click en una opción del dropdown es un descendiente real del `<div>` interno del modal → queda capturado por el nuevo `stopPropagation` sin necesidad de tratamiento especial.
  - Aunque usaran `menuPortalTarget`, React bubblea eventos sintéticos según el árbol de fibras (React tree), no el árbol DOM real, por lo que un portal anidado lógicamente dentro del `<Select>` (hijo del contenedor interno del modal) seguiría siendo detenido por el `stopPropagation` del contenedor.
- No se detectó ningún `<div>`/elemento interno de un modal existente que ya tuviera su propio `onClick` en el contenedor raíz que pudiera entrar en conflicto con el nuevo `stopPropagation`.
- **Riesgo documentado para el reviewer:** si en el futuro se agrega `menuPortalTarget={document.body}` a algún `<Select>` dentro de un modal (patrón común para evitar recortes por `overflow-hidden`), verificar que el evento de click en el menú portaleado siga bubbleando por el árbol React (debería, por diseño de React) y no dispare el cierre del modal. Bajo el comportamiento actual de React (eventos sintéticos), no hay riesgo real, pero es el único vector a vigilar si cambia la implementación de `react-select` en esos dos archivos.

## Estado
Build OK, lint sin regresiones nuevas. Feature lista para review (no se cambió `status` en `feature_list.json`, queda en `"in_progress"` para que el reviewer la cierre).
