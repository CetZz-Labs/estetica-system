# impl_UX-54 — El índice de módulos no queda sticky

## Diagnóstico (ya confirmado por el orquestador)

En `views/Guia.tsx`, el grid `grid-cols-[240px_minmax(0,1fr)]` con `align-items: stretch`
(default de CSS Grid) estira el `<div className="order-1">` para igualar la altura de la
columna de módulos (`order-2`), pero esa altura no se propaga automáticamente al `<nav>`
interno de `GuideIndex.tsx`, que sin altura explícita solo ocupa el alto de su propio
contenido. Al ser el `<nav>` el containing block del `<ul>` con `lg:sticky lg:top-24`, y ser
corto, el sticky no tenía recorrido vertical.

Se verificó además que `<div className="order-1">` en `Guia.tsx` no tiene ninguna clase que
impida el estirado (`self-start`, `h-fit`, etc.) — no requirió cambios.

## Fix aplicado

Archivo modificado: `apps/client/src/components/landing/guide/GuideIndex.tsx`.

Se agregó la clase `lg:h-full` al `<nav>` raíz del componente, para que herede la altura ya
estirada del grid y el `<ul>` sticky tenga recorrido vertical real en desktop:

```tsx
<nav aria-label="Índice de módulos de la guía" className="lg:h-full">
```

No se tocó el comportamiento mobile (`lg:hidden`, barra horizontal scrolleable sin sticky).

## Verificación

- `pnpm --filter @estetica/client build` → exit code 0.
  - `tsc -b && vite build` completó sin errores. Bundle: `dist/assets/index-CsitUsIS.js` 1,719.63 kB (gzip 520.43 kB).
- `pnpm --filter @estetica/client lint` → exit code 0 (4 warnings preexistentes de
  `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`,
  `Negocio.tsx`, `Turnos.tsx` — no relacionados con esta feature, no introducidos por este cambio).
- Scope check: la carpeta `apps/client/src/components/landing/guide/` está sin trackear en
  git (`git status --short` → `??`), por lo que `git diff --stat` no aplica como evidencia.
  Se verificó por timestamp de archivo (`ls -la`) que solo `GuideIndex.tsx` y `ModuleMedia.tsx`
  (esta última por UX-55) fueron modificados en esta sesión; `guideContent.ts` quedó intacto.

## Archivos modificados

- `apps/client/src/components/landing/guide/GuideIndex.tsx` (1 línea cambiada: clase `className="lg:h-full"` agregada al `<nav>`).

Sin cambios en `views/Guia.tsx` (no fue necesario, ya cumplía las condiciones).
