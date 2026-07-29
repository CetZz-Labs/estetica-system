# impl_UX-59 — Landing pública: CTA final, quitar blob blanco y puntos de fondo (legibilidad), botones siempre en fila

## Resumen de cambios

Único archivo tocado: `apps/client/src/views/Landing.tsx`, acotado a la card wine del CTA final
("¿Listo para simplificar tu gestión?") y a la limpieza de código muerto que esa eliminación dejó
en el resto del archivo.

### 1. Blob blanco eliminado
Se retiró el mount `<HeroBlob positionClassName="..." colorClassName="bg-white" blendMode="soft-light" ... />`
(y su comentario explicativo) de dentro de la card wine, que aclaraba el centro con `mix-blend-mode: soft-light`
y le restaba contraste al texto blanco.

Corrida `grep -n "HeroBlob" apps/client/src/views/Landing.tsx` post-eliminación: el único `<HeroBlob`
de consumo en todo el archivo era ese (confirmado también con la lectura previa del archivo completo
antes de tocar nada). **Se eliminó por completo el código muerto**: la interfaz `HeroBlobProps` y la
función `HeroBlob(...)` (antes en las líneas ~1011-1068, ahora retiradas). No quedan más `<HeroBlob`
de mount en el archivo — solo quedan 4 menciones en comentarios/JSDoc de otras secciones (hero,
`AnimatedStat`) que documentan la historia del componente ya retirado; se actualizaron las 2 que
afirmaban (ahora incorrectamente) que `HeroBlob` "sigue existiendo/usándose en el CTA final" para
que reflejen que se eliminó por completo en UX-59. La tercera mención (comentario de `AnimatedStat`,
sección Stats, fuera del alcance de esta tarea) es solo una analogía de patrón y no afirma nada
incorrecto sobre el estado actual — se dejó intacta para no tocar otra sección del archivo.

### 2. Textura de puntos eliminada
Se retiró el `<div>` decorativo con `style={{ backgroundImage: ctaDotPatternUrl, backgroundSize: '24px 24px' }}`
(y su comentario) de dentro de la misma card.

`ctaDotPatternUrl` quedó sin ningún otro uso en el archivo tras esa eliminación → se eliminó también
la constante junto con su comentario explicativo (evita el warning de variable no usada que hubiera
roto el lint).

### 3. Botones siempre en fila
- Contenedor de los botones: `flex flex-col sm:flex-row gap-3 justify-center mt-8` →
  `flex flex-row flex-wrap gap-3 justify-center mt-8` (fila horizontal en todos los tamaños, con
  `flex-wrap` para no romper el layout si en un viewport muy angosto no entran ambos botones en
  una sola línea).
- Ambos wrappers `<Magnetic className="block sm:inline-block w-full sm:w-auto">` →
  `<Magnetic className="inline-block w-auto">` (ya no fuerzan ancho completo en mobile; se ajustan
  a su propio contenido en todos los tamaños).

### Restricciones respetadas
- `GradualBlur` (UX-53), montado después del contenido de la card, **no se tocó**.
- No se modificó ninguna otra sección de `Landing.tsx` (Hero, Features, Stats, Cómo funciona,
  footer, `TrustMarquee`) más allá de las 2 correcciones puntuales de comentarios obsoletos sobre
  `HeroBlob` mencionadas arriba (necesarias para que la documentación inline no afirme algo falso
  sobre un componente que este mismo cambio elimina).
- No se instalaron dependencias.

## Verificación

```
pnpm --filter @estetica/client build
```
`tsc -b && vite build` → **exit code 0**. Bundle: `dist/assets/index-DStudfyT.js` 1,719.09 kB
(warning preexistente de chunk grande > 500kB, no relacionado a esta feature; el tamaño bajó
levemente respecto a builds anteriores por el código muerto retirado).

```
pnpm --filter @estetica/client lint
```
`eslint .` → **exit code 0**. 4 warnings preexistentes (`react-hooks/incompatible-library` por
`watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`,
`Turnos.tsx`) — ninguno nuevo, ninguno relacionado a `Landing.tsx`. Sin errores. Confirma que
`ctaDotPatternUrl`/`HeroBlob`/`HeroBlobProps` no quedaron declarados sin uso.

## Archivo tocado
- `apps/client/src/views/Landing.tsx`

No se marcó la feature como `"done"` en `feature_list.json` — queda a criterio del reviewer.
