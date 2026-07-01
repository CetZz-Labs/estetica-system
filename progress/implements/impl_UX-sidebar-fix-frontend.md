# impl_UX-sidebar-fix-frontend — Sidebar fijo en AppLayout

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `apps/client/src/layouts/AppLayout.tsx` | Modificado — contenedor raiz y `<main>` para confinar el scroll al area de contenido |

## Resumen de cambios

### Bug
El contenedor raiz usaba `min-h-screen`, que crece sin limite con el contenido de `<Outlet />`. Cuando una vista era mas alta que la pantalla, el documento completo scrolleaba, arrastrando al `<aside>` (sidebar) — la card de usuario (`UserButton` + "Mi Cuenta", al pie del sidebar) quedaba fuera de vista.

### Fix
- Linea 44 — contenedor raiz: `min-h-screen` reemplazado por `h-screen overflow-hidden`. Classname resultante: `"flex flex-col md:flex-row h-screen overflow-hidden bg-maison-bg text-maison-text font-sans"`.
- Linea 135 — `<main>`: agregado `overflow-y-auto` a las clases existentes. Classname resultante: `"flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto"`.
- No se tocó el `<nav>` interno del aside (ya tenia `overflow-y-auto custom-scrollbar` correcto).
- No se tocó el header movil (`sticky top-0`) ni el aside fijo de movil (`fixed inset-y-0` con overlay) — al usar `position: fixed`, el aside movil no depende de la altura del contenedor padre, por lo que el layout mobile (hamburguesa + overlay + aside deslizante) sigue funcionando igual.

## Verificacion

- Build: `pnpm --filter @estetica/client build` → Exit code 0 (948ms, 697 modulos).
- Lint: `pnpm --filter @estetica/client lint` → Exit code 1, pero sin errores nuevos. El unico error (`ProductoModal.tsx:37` — `'stock' is assigned a value but never used`) es preexistente y no relacionado con este cambio. Los 4 warnings de "Compilation Skipped" (React Compiler + `watch()` de react-hook-form) tambien son preexistentes en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx`.
