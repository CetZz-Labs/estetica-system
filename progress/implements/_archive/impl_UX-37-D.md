# impl_UX-37-D — Rediseño Shear Fase 2 (Landing pública), sub-lote D (limpieza final)

## Alcance

Sub-lote D (final) de `UX-37`: borrado completo de `apps/client/src/components/react-bits/` y
remoción de las 4 dependencias de animación (`motion`, `gsap`, `@gsap/react`, `ogl`) de
`apps/client/package.json`, con verificación de cierre (grep + build + lint).

No se tocó `apps/client/src/views/Landing.tsx` (ya migrado íntegramente por los sub-lotes A/B/C,
confirmado por lectura completa del archivo antes de borrar nada — sin ningún import residual de
`react-bits/`, `motion`, `gsap` ni `ogl`) ni `apps/client/src/views/AceptarInvitacion.tsx` (fuera
de alcance de `UX-37`, según `explore_UX-37.md` § Riesgos punto 2).

## Verificación previa (paso 1, antes de borrar nada)

Grep de `"react-bits"` en `apps/client/src` (`*.tsx`/`*.ts`): **0 resultados** — ningún archivo de
`views/` u otro `components/` importa nada de `react-bits/`.

Grep de `from ['"](motion|motion/react|gsap|gsap/[a-zA-Z]+|@gsap/react|ogl)['"]` en
`apps/client/src`: 8 coincidencias, **todas dentro de `components/react-bits/` mismo**
(los propios componentes a borrar):
- `react-bits/Aurora/Aurora.tsx` → `from 'ogl'`
- `react-bits/CountUp/CountUp.tsx` → `from 'motion/react'`
- `react-bits/SplitText/SplitText.tsx` → `from 'gsap'`, `from 'gsap/ScrollTrigger'`, `from '@gsap/react'`
- `react-bits/TextType/TextType.tsx` → `from 'gsap'`
- `react-bits/GradientText/GradientText.tsx` → `from 'motion/react'`
- `react-bits/ShinyText/ShinyText.tsx` → `from 'motion/react'`

**Resultado:** ningún consumidor inesperado fuera de `components/react-bits/`. No se encontró
ningún import residual en `Landing.tsx` ni en ningún otro archivo — no hubo hallazgos que
documentar como regresión de los sub-lotes A/B/C. Se procedió con el borrado según lo planeado.

## Archivos/carpetas eliminados

`apps/client/src/components/react-bits/` completo, vía `git rm -r` (19 archivos, 11 carpetas):

- `Aurora/Aurora.css`, `Aurora/Aurora.tsx`
- `ClickSpark/ClickSpark.tsx`
- `CountUp/CountUp.tsx`
- `GlareHover/GlareHover.css`, `GlareHover/GlareHover.tsx` (huérfano)
- `GlassIcons/GlassIcons.css`, `GlassIcons/GlassIcons.tsx` (huérfano)
- `GradientText/GradientText.css`, `GradientText/GradientText.tsx`
- `ShinyText/ShinyText.css`, `ShinyText/ShinyText.tsx`
- `SplitText/SplitText.tsx` (huérfano)
- `SpotlightCard/SpotlightCard.css`, `SpotlightCard/SpotlightCard.tsx`
- `StarBorder/StarBorder.css`, `StarBorder/StarBorder.tsx`
- `TextType/TextType.css`, `TextType/TextType.tsx`

## Dependencias removidas

Desde `apps/client/` con `pnpm remove motion gsap @gsap/react ogl`:

- `motion` 12.40.0
- `gsap` 3.15.0
- `@gsap/react` 2.1.2
- `ogl` 1.0.11

Confirmado en `apps/client/package.json` (sección `dependencies`): las 4 líneas ya no están
presentes. `pnpm-lock.yaml` (raíz del monorepo) también quedó actualizado (`git status --short`
lo marca como modificado).

## Verificación

Grep de cierre:
- `grep -r "react-bits" apps/client/src` → **0 resultados**.
- `grep -rE "from ['\"](motion|gsap|@gsap/react|ogl)['\"]" apps/client/src` → **0 resultados**.

```
pnpm --filter @estetica/client build
```
→ `tsc -b && vite build` exit 0. Bundle generado sin errores de tipo (304 módulos
transformados, `dist/index.html` + `dist/assets/index-*.css` + `dist/assets/index-*.js`; único
warning es el aviso estándar de Vite sobre tamaño de chunk > 500kB, no relacionado con esta
feature).

```
pnpm --filter @estetica/client lint
```
→ **Exit 0** (confirmado explícitamente con `echo $?`). 0 errores, 4 warnings — los mismos 4
warnings pre-existentes de `react-hooks/incompatible-library` (uso de `watch()` de
react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) ya
documentados como ajenos a `UX-37` en `impl_UX-37-C.md`. **Los 4 errores previos de
`react-bits/Aurora|SplitText|TextType`** (reportados como pre-existentes por los sub-lotes A/B/C)
**desaparecieron por completo**, ya que esos archivos fueron eliminados en este sub-lote.

## Archivos modificados

- `apps/client/package.json` — remoción de 4 dependencias.
- `pnpm-lock.yaml` (raíz) — actualizado por `pnpm remove`.
- `apps/client/src/components/react-bits/` — carpeta completa eliminada (19 archivos, vía `git rm -r`).

No se modificó ningún otro archivo (`Landing.tsx`, `AceptarInvitacion.tsx` u otros quedaron
intactos, confirmado por `git status --short` antes y después de esta sesión).
