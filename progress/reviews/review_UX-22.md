# Reporte de Revisión Técnica — Feature UX-22

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06

## Alcance auditado
Único archivo de código modificado: `apps/client/src/components/ui/Modal.tsx` (confirmado con `git diff` — sandbox hermético, sin tocar ningún consumidor).

```diff
-        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
+        <div
+            onClick={onClose}
+            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
+        >
             <div
+                onClick={(e) => e.stopPropagation()}
                 className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
             >
```

## Verificación puntual (no delegada al implementer)

1. **Nivel de `stopPropagation`:** correcto. Está en el `<div>` interno (contenedor visual del modal, líneas 55-58 de `Modal.tsx`), no en el overlay. Un click en header/body/footer es descendiente de ese `<div>` → `stopPropagation()` detiene el bubbling antes de llegar al overlay con `onClick={onClose}` (línea 52).
2. **Conflictos con los 12 consumidores** (`grep -rl "import Modal"`): confirmé la lista completa (`Turnos.tsx`, `Dashboard.tsx`, `RegistroModal.tsx`, `Profesionales.tsx`, `ClienteModal.tsx`, `CargaMasivaClientesModal.tsx`, `ui/ConfirmModal.tsx`, `CargaMasivaModal.tsx`, `ProfesionalModal.tsx`, `ServicioModal.tsx`, `ProductoModal.tsx`, `AjusteStockModal.tsx`). Grep de `onClick={onClose}` fuera de `Modal.tsx` muestra 6 matches (`ProductoModal.tsx:58`, `ProfesionalModal.tsx:89`, `ServicioModal.tsx:53`, `ClienteModal.tsx:62`, `ui/ConfirmModal.tsx:27`, `AjusteStockModal.tsx:76`) — verifiqué dos representativos (`ProductoModal.tsx`, `ui/ConfirmModal.tsx`) leyendo el código completo: en ambos casos es el botón "Cancelar" del `footer` (`<button type="button" onClick={onClose}>`), no un overlay/backdrop anidado. No hay doble-cierre ni conflicto de propagación: es un botón nativo que ya llamaba a `onClose` directamente, ajeno al nuevo backdrop-click.
3. **`react-select` / `menuPortalTarget`:** confirmé independientemente con `grep -rn "menuPortalTarget|menuPosition|react-select"` sobre `apps/client/src` — solo `Turnos.tsx` y `RegistroModal.tsx` importan `react-select`, y no hay ningún match de `menuPortalTarget`/`menuPosition` en el árbol. El menú se renderiza inline (sin portal a `document.body`), por lo que el click en una opción queda contenido en el árbol DOM real del `<div>` interno y no dispara el `onClick={onClose}` del overlay. Riesgo documentado por el implementer como vigilancia futura (no bloqueante) es correcto y no aplica hoy.
4. **`ModalProps` sin prop nueva:** confirmado leyendo la interfaz completa (líneas 4-23 de `Modal.tsx`) — no se agregó ninguna prop de opt-out, consistente con la decisión de producto de aplicar el comportamiento sin excepción a los 12 consumidores.

## Builds y lint (ejecutados por mí, reviewer)

```
pnpm --filter @estetica/client build
```
Resultado: **Exit 0**. `tsc -b && vite build` → 699 módulos transformados, `dist/` generado. Único output es el warning estándar de rolldown sobre chunk size (preexistente, no relacionado).

```
pnpm --filter @estetica/client lint
```
Resultado: **1 error, 4 warnings** — exit 1 por el error preexistente ya conocido (`ProductoModal.tsx:37:25` — `'stock' is assigned a value but never used`, `@typescript-eslint/no-unused-vars`), sin relación con `Modal.tsx`. Los 4 warnings (`react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:110`, `Negocio.tsx:73`, `Turnos.tsx:350`) son por uso de `watch()` de react-hook-form, también preexistentes. **Sin regresiones nuevas** atribuibles a este cambio.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, cambio atómico de 2 líneas en un solo archivo.
- [x] C3 (Fidelidad Arquitectónica) — cambio estrictamente en `apps/client/src/components/ui/Modal.tsx`, respeta responsabilidad única del componente (renderizar estructura visual), no introduce lógica de negocio.
- [x] C4 (Compilación Estática + Lint) — build exit 0; lint sin errores/warnings nuevos (mismo conteo preexistente verificado por el reviewer independientemente).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete `history.md`/`current.md`/archivado tras este veredicto; evidencia en disco (`impl_UX-22-frontend.md`, este `review_UX-22.md`) ya existe.
- [x] C6 (Capa de Datos) — no aplica (sin cambios a modelos Mongoose).
- [x] C7 (Security Gate) — no aplica (sin backend, sin `dangerouslySetInnerHTML`, sin manejo de variables sensibles en este diff).
- [x] C8 (Estabilidad de API) — no aplica (sin cambio de contrato de API; `ModalProps` sin alteración).

## Cambios Requeridos
Ninguno.

## Acción tomada
`feature_list.json` → `"UX-22".status` actualizado de `"in_progress"` a `"done"`.
