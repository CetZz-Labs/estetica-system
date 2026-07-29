# impl_UX-62 — Landing pública: fix botón "Iniciar sesión" desalineado en CTA final

## Feature
- id: `UX-62`
- name: Landing pública — CTA final: fix del botón 'Iniciar sesión' desalineado (falta display:flex en un `<a>`)
- status en `feature_list.json`: `in_progress` (sin cambios de mi parte — el reviewer decide el pase a `done`)

## Causa raíz (confirmada)
En la sección CTA final de `apps/client/src/views/Landing.tsx` (bloque `wine` sólido), el `<Link to="/login">` no tenía `display: flex` explícito. Al ser un `<a>` renderizado como `inline` por defecto, el `py-3.5` (padding vertical) se pintaba fuera de la caja de línea en vez de expandir la altura real del botón, desalineándolo verticalmente respecto a su hermano `<Link to="/registro">` (que sí tenía `flex items-center justify-center gap-2`).

## Cambio realizado
Archivo: `apps/client/src/views/Landing.tsx` (única línea tocada, línea ~768).

```diff
- className="border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-ctrl text-sm font-semibold transition-colors no-underline"
+ className="border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center transition-colors no-underline"
```

Se agregó únicamente `flex items-center justify-center`. No se tocó ningún otro valor de la clase (colores, borde, padding, texto) ni ninguna otra sección del archivo. No se agregó `gap-2` porque este botón no tiene ícono, solo texto (según el encargo).

## Archivos modificados
- `apps/client/src/views/Landing.tsx` (1 línea)

## Verificación

```
pnpm --filter @estetica/client build
```
Resultado: exit code 0 — `tsc -b && vite build` compiló sin errores (783 módulos transformados, build en 1.25s). Warning preexistente de chunk >500kB, no relacionado a este cambio.

```
pnpm --filter @estetica/client lint
```
Resultado: exit code 0 — `eslint .` reportó 4 warnings preexistentes de "Compilation Skipped: incompatible library" (React Compiler + `watch()` de react-hook-form) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx` — ninguno relacionado a `Landing.tsx` ni introducido por este cambio. 0 errores.

## Nota sobre el diff observado
Al correr `git diff -- apps/client/src/views/Landing.tsx` aparecen adicionalmente cambios de las features `UX-60`/`UX-61` (ya implementadas en esta misma sesión por otros implementers, aún sin commitear). Esos cambios son preexistentes al inicio de mi tarea y no fueron tocados por mí — mi contribución se limita exclusivamente a la línea documentada arriba.
