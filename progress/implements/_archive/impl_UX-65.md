# impl_UX-65 — Landing pública: cambiar tono del wash de Silk (accent-rose → sage)

## Feature
UX-65 — "Landing pública — hero: cambiar el tono del wash de Silk (accent-rose puede competir con el logo/texto)"

## Cambio realizado

Archivo: `apps/client/src/views/Landing.tsx`

- Constante `SILK_COLOR`: `'#D98BA4'` (accent-rose) → `'#8C9178'` (sage, `docs/design.md` §2.3).
- Comentario que documenta la constante actualizado para reflejar el nuevo valor y el motivo:
  el tono accent-rose original podía competir visualmente con el logo 3D del hero (`HeroLogo3D`,
  paleta rosa/negro/marrón) y con el texto; sage es una familia de color distinta, ya usada como
  token de marca en otras partes de la Landing (rotación de íconos/chips de `marqueeIconColors`),
  que da más contraste/separación al logo sin salirse de la paleta del sistema de diseño.

## Restricciones respetadas

- Única línea de código modificada: la asignación de `SILK_COLOR` + su comentario.
- No se tocó ningún otro prop de `<Silk />` (`scale`, `noiseIntensity`, `rotation`, `speed`).
- No se tocó `opacity-[0.34]` ni `mixBlendMode: 'multiply'` del wrapper.
- No se tocó `--bg`/`bg-bg` ni ningún otro token de color.
- No se tocó ninguna otra sección de `Landing.tsx`.
- Verificado con `git diff apps/client/src/views/Landing.tsx`: el único cambio de mi autoría es
  el bloque `SILK_COLOR` (comentario + valor). El diff completo del archivo muestra también otros
  hunks (`HeroLogo3D`, ajuste `overflow-x-hidden` de "Cómo funciona", etc.) que corresponden a
  cambios preexistentes sin commitear de features previas (UX-60/UX-61), no introducidos en esta
  tarea.

## Verificación

```
pnpm --filter @estetica/client build
```
Exit code 0. Output: `tsc -b && vite build` completó sin errores (`dist/` generado correctamente).

```
pnpm --filter @estetica/client lint
```
Exit code 0. `eslint .` reportó 4 warnings preexistentes (React Compiler "incompatible library"
por uso de `watch()` de react-hook-form) en `ProfesionalModal.tsx`, `RegistroModal.tsx`,
`Negocio.tsx` y `Turnos.tsx` — ninguno de esos archivos fue tocado en esta tarea. 0 errores.

## Archivos modificados

- `apps/client/src/views/Landing.tsx`

## Estado

Implementación completa. No se cambió `feature_list.json` — queda a criterio del reviewer marcar
`UX-65` como `"done"`.
