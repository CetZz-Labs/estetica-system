# impl_UX-52 — CTA final: alinear altura de botones

## Feature
`UX-52` — Landing pública — CTA final: alinear la altura de los botones "Crear cuenta gratis" e
"Iniciar sesión".

## Cambios
Archivo modificado: `apps/client/src/views/Landing.tsx` (CTA final, botón `<Link to="/registro">`
"Crear cuenta gratis").

- `className` del botón: se agregó `border border-transparent` al final de la lista de clases.
  Antes: `"bg-white hover:opacity-90 text-wine px-8 py-3.5 rounded-ctrl text-sm font-semibold flex
  items-center justify-center gap-2 transition-opacity no-underline"`.
  Después: se agrega `border border-transparent` (misma clase que ya usa el botón "Iniciar
  sesión" salvo el color del borde, que en ese caso es `border-white/30`).

No se tocó ningún otro estilo, tamaño ni copy de ese botón, ni el botón "Iniciar sesión" (ya tenía
su propio borde visible, sin cambios). No se modificó ninguna otra sección de `Landing.tsx` como
parte de esta feature.

## Decisiones técnicas
- `border-transparent` agrega el mismo 1px de borde (arriba/abajo) que ya sumaba
  `border-white/30` al otro botón, igualando la altura renderizada de ambos sin alterar la
  apariencia visual: un borde transparente sobre fondo blanco (`bg-white`) no genera ningún
  contraste perceptible.

## Verificación
```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (4 warnings preexistentes, no relacionadas)
```

`git --no-pager diff --ignore-all-space --stat -- apps/client/src/views/Landing.tsx` confirmado
sin reindentación espuria fuera de las líneas tocadas por las tres features del pase.

## Estado
Implementación terminada. NO se cambió `feature_list.json` (sigue en `"in_progress"`, tarea
exclusiva del reviewer).
