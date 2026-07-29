# impl_UX-64 — Landing pública: logo 3D — reducir profundidad Z y usar los 4 paths del SVG

Seguimiento de UX-63 (aprobada, `"done"`), sobre 2 bugs reportados por el usuario tras probarla en
navegador real.

## Archivos modificados

- `apps/client/src/components/landing/svgExtrude.ts` — se agrega `buildExtrudedLogoGeometryFromPaths(pathDs, options)` (exportada) y un helper interno `mergeExtrudedGeometry`. `buildExtrudedLogoGeometry` (single-path) queda **intacta**, sin cambios de firma — se reutiliza como building block.
- `apps/client/src/components/landing/HeroLogo3D.tsx` — `EXTRUDE_DEPTH` reducido de `0.22` a `0.08`; el punto de carga pasa de `doc.querySelector('path')` a `doc.querySelectorAll('path')` + `buildExtrudedLogoGeometryFromPaths`.

Sin dependencias nuevas — se sigue usando únicamente `ogl` + `earcut` (ya aprobados en UX-63).

## 1. Profundidad Z

`EXTRUDE_DEPTH: 0.22 → 0.08` (antes ~13% del tamaño del logo `TARGET_SIZE=1.7`, ahora ~4.7%, por
debajo de la mitad del rango que sugirió el usuario como ejemplo, `0.09–0.11`). Elegí un valor un
poco más chico que ese rango de ejemplo porque el reporte original describía la profundidad previa
como "muy profunda" — preferí quedarme claramente del lado sutil dado que no tengo forma de
verificar visualmente el resultado en este entorno (mismo disclaimer que en UX-63). Si al mirarlo
en navegador se ve demasiado plano, es un cambio de una sola constante.

## 2. Los 4 `<path>` del SVG (bug principal)

**Causa confirmada:** `shear-favicon.svg` tiene 4 `<path>` (`#e49eab`, `#979188`, `#1a1815`,
`#857270`), cada uno con su propia silueta. UX-63 solo extruía el primero (el de mayor área) —
partes del diseño de los otros 3 paths (mechones/detalles más finos, confirmé por conteo de
comandos que tienen 36, 5 y 53 subpaths respectivamente, bastante más fragmentados que el path
principal) se extienden por fuera de esa silueta, así que no tenían geometría 3D donde mostrarse
aunque sí estuvieran "pintados" en la textura PNG horneada — de ahí el "faltan partes" reportado.

**Fix:** `HeroLogo3D.tsx` ahora lee los 4 `d` con `querySelectorAll('path')` y los pasa a la nueva
`buildExtrudedLogoGeometryFromPaths`.

**Cómo resolví los solapamientos entre paths (criterio pedido explícitamente en la feature):**
cada uno de los 4 `d` se procesa con su **propia pasada completa e independiente** de
`buildExtrudedLogoGeometry` (parseo de subpaths → `classifySubpaths` (isla/hueco) → triangulación
con `earcut` → paredes laterales), exactamente el mismo pipeline que ya usaba UX-63 para un solo
path, sin tocarlo. Los 4 buffers resultantes (`position`/`normal`/`uv`) se concatenan al final con
`mergeExtrudedGeometry` (simple `Float32Array.set` con offsets acumulados — funciona sin
remapear ningún índice porque la geometría ya es no-indexada: cada triángulo lleva sus 3 vértices
explícitos, no hay índices compartidos entre paths que podrían quedar corridos).

Decidí **no** clasificar isla/hueco de forma global y cruzada entre los 4 paths a propósito: cada
path es una capa de color independiente del diseño original, no necesariamente anidada dentro de
las demás — una forma del path 2 podría caer geométricamente "dentro" del área del path 1 sin que
eso signifique que sea un hueco suyo (sería fusionar semánticas de capas distintas). Procesar cada
path por separado evita ese riesgo por construcción. Contrapartida aceptada explícitamete en el
enunciado de la feature: si dos paths se solapan visualmente en alguna zona, ambas geometrías van
a coexistir ahí (z-fighting puntual posible), preferible a que falte geometría por completo.

**UV/textura:** `buildExtrudedLogoGeometryFromPaths` le pasa las mismas `options` (mismo
`svgWidth`/`svgHeight` = viewBox completo 489×483) a las 4 llamadas internas de
`buildExtrudedLogoGeometry` — el mapeo `toUv` (`x/489, 1 - y/483`) es el mismo para las 4 partes
sin ningún ajuste por-path, así que la textura `/shear-favicon.png` (que ya representa el diseño
completo horneado, colores de los 4 paths incluidos) queda alineada consistentemente sobre toda la
geometría combinada — no hay reescalado ni recentrado independiente por path que pudiera
desalinearla.

## Se mantiene sin cambios

Rotación continua, sombreado difuso/especular, `prefersReducedMotion` (frame estático + guard
`cancelled` del `fetch`), cleanup de 4 pasos, `cullFace: false`, color sólido de paredes laterales
(`uWallColor`), y toda la lógica de clasificación/triangulación/paredes de `svgExtrude.ts` (sin
tocar `buildExtrudedLogoGeometry`, `classifySubpaths`, `outwardWallNormal`, etc.).

## Incertidumbre honesta

Sigo sin poder renderizar en navegador real desde este entorno. Lo que pude verificar
analíticamente: conteo de `<path>`/subpaths por color (vía script Node contando `M`/`C`/`Z`), que
la nueva función concatena buffers no-indexados sin corromper offsets, y que build+lint pasan sin
errores de tipos. Lo que **no** pude confirmar mirando el resultado real:

- Que la profundidad `0.08` efectivamente se perciba "sutil mas no plana" — es una elección basada
  puramente en el reporte cualitativo del usuario, no en una medición visual propia.
- Que los solapamientos entre paths (si los hay) no generen z-fighting perceptible/molesto en
  alguna zona puntual del logo — el enunciado ya acepta este riesgo explícitamente, pero no pude
  confirmar si ocurre ni cuán notorio sería.
- Que las 36+5+53 subpaths adicionales de los paths 2-4 (muchos parecen loops muy pequeños,
  posiblemente artefactos de vectorización de una imagen trazada) no introduzcan geometría
  extruida visualmente "ruidosa" (muchas islas microscópicas con su propia pared lateral) en vez
  de leerse como detalle fino intencional del diseño.

Si el usuario reporta un problema puntual de superposición o ruido visual en una zona específica,
el punto de entrada más directo es `buildExtrudedLogoGeometryFromPaths` en `svgExtrude.ts` (permite
aislar/loguear qué path aporta qué geometría) antes de tocar la lógica de clasificación compartida.

## Verificación

```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (mismos 4 warnings preexistentes de React
                                          Compiler en archivos no relacionados)
```

No se marca la feature como `"done"` en `feature_list.json` — queda a criterio del reviewer/leader.
