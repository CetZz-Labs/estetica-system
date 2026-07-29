# impl_UX-63 — Landing pública: extrusión 3D real del logo (ogl + earcut)

## Archivos modificados/creados

- `apps/client/src/components/landing/svgExtrude.ts` (nuevo) — utilidad pura (sin React/ogl):
  parser de `d` de SVG (M/L/C/Z, aplanado de curvas cúbicas), clasificación isla/hueco por
  paridad de anidamiento (centroide en polígono), triangulación con `earcut` por isla, y
  generación de paredes laterales (quads) para cada contorno (exterior + huecos). Exporta
  `buildExtrudedLogoGeometry(pathD, options): { position, normal, uv }` (Float32Array listos para
  `ogl.Geometry`).
- `apps/client/src/components/landing/HeroLogo3D.tsx` (modificado) — reemplaza el `Plane`
  rectangular por la geometría extruida: hace `fetch('/media/shear-favicon.svg')` en el mismo
  `useEffect` (asset de `public/`, no importable como módulo), parsea el primer `<path>` con
  `DOMParser`, construye la `Geometry` y monta el `Mesh` de forma asíncrona (mismo espíritu que la
  carga ya-asíncrona de la textura). Fragment shader extendido: `uv.x < 0.0` (marca de pared
  lateral) salta `texture2D` y usa un color sólido oscurecido del acento `--wine` (`#6B3444`) con
  el mismo término de difusa. Guard `cancelled` en el cleanup para no montar el `Mesh` si el
  componente se desmontó antes de que resuelva el `fetch`.
- `apps/client/package.json` / `pnpm-lock.yaml` — se agrega `earcut@3.2.3` (`pnpm add earcut
  --filter @estetica/client`), única dependencia nueva de la feature. Trae sus propios tipos
  (`src/earcut.d.ts`), no requirió `@types/earcut`.
- `docs/design.md` §13.1 — documenta la nueva dependencia `earcut`, su alcance exclusivo
  (`svgExtrude.ts`/`HeroLogo3D.tsx`) y el color de pared lateral elegido.

## Algoritmo

1. **Parser de path:** tokeniza `d` por comando (`[MLCZ][^MLCZ]*`). Confirmé por inspección
   directa del archivo (`node -e` contando ocurrencias de cada letra) que el path principal
   (`fill="#e49eab"`, el que se usa) solo contiene `M`/`C`/`Z` (4 de cada M/Z, 370 `C`) — sin
   `L`/`H`/`V`/`S`/`Q`. Igual soporté `L` por robustez mínima sin costo real. Cada `C` se aplana
   con la fórmula polinómica directa de Bézier cúbica, 12 segmentos por curva (extremo inferior
   del rango 12-16 sugerido, para acotar el conteo total de vértices dado que son 370 curvas).
2. **Clasificación hueco/isla:** para cada subpath calculo centroide (promedio de vértices) y área
   (shoelace). Para cada subpath `i`, busco el subpath `j` de área mayor que contiene su centroide
   (ray casting) con menor área entre los candidatos = contenedor inmediato. Profundidad de
   anidamiento par → isla (se triangula con `earcut`); impar → hueco de su contenedor inmediato.
   Esto replica exactamente la regla `fill-rule="evenodd"` que ya tiene el SVG fuente (confirmé
   que el path 0 la declara), así que la clasificación coincide con cómo el navegador ya renderiza
   el mismo path como imagen 2D — no es una heurística inventada aparte.
3. **Triangulación + extrusión:** por cada isla, arma el array plano de coordenadas (contorno +
   huecos concatenados) en el espacio LOCAL ya mapeado (ver más abajo, no en espacio SVG crudo) y
   llama `earcut(flat, holeIndices)`. Cara frontal (`Z=+depth/2`) usa el orden de índices tal cual
   devuelve `earcut`; cara trasera (`Z=-depth/2`) usa el orden invertido. Razonamiento de winding
   (documentado también como comentario en el código): la garantía de `earcut` es "salida siempre
   antihoraria en un sistema Y-arriba"; como mapeo los puntos a espacio local (Y-arriba, con el
   flip de Y ya aplicado) ANTES de triangular, el orden que devuelve ya es directamente utilizable
   para la cara frontal (normal +Z) sin necesitar ninguna inversión adicional.
4. **Paredes laterales:** por cada arista de cada contorno (exterior de la isla y de cada hueco)
   genero un quad (2 triángulos, sin indexar, vértices duplicados a propósito para lograr
   sombreado plano/faceted por segmento). La normal saliente de cada pared se calcula rotando la
   dirección de la arista ±90° según el sentido de giro del anillo (CW/CCW, vía área con signo) y
   se invierte para los huecos (la pared de un hueco mira hacia el vacío que encierra, lo opuesto
   de "hacia afuera" del propio anillo). El orden de índices de cada quad es arbitrario a
   propósito: la normal se asigna explícita por vértice (no se deriva del producto cruz de la
   triangulación) y el `Program` sigue con `cullFace: false`, así que el sentido de giro del quad
   no afecta qué cara se ve — solo importa el signo del vector normal, que sí validé
   analíticamente (ver comentario `outwardWallNormal` en el código).
5. **Mapeo de espacio y UV:** escala uniforme `TARGET_SIZE / max(489, 483)` para no distorsionar
   proporciones, centrado en el centro del viewBox completo (no en el bbox de la silueta, para que
   el mapeo UV seguido más abajo sea consistente con la textura completa). UV de caras
   frontal/trasera = `(x/489, 1 - y/483)` — el `1 - y/altura` replica el mismo sentido que ya tenía
   el `Plane` original (verifiqué la implementación de `Plane.buildPlane` de `ogl`: con
   `Texture.flipY` en `true` por defecto, la cara superior del plano en Y-arriba local debe llevar
   `v=1` para mostrar el tope real de la imagen — mismo resultado que reproduzco acá partiendo
   directo de coordenadas SVG). Paredes laterales: UV `(-1,-1)`, detectado en el fragment shader.

## Profundidad elegida

`EXTRUDE_DEPTH = 0.22` (mismas unidades que `TARGET_SIZE = 1.7`, ~13% del ancho/alto del logo) —
valor elegido a ojo dentro del rango sugerido (0.18-0.25) del enunciado, sin poder verificarlo
visualmente en este entorno (ver incertidumbre abajo).

## Incertidumbre honesta (pedido explícito del enunciado)

No tengo navegador para renderizar y mirar el resultado real. Verifiqué analíticamente cada parte
del pipeline (winding de `earcut`, convención de `flipY`/UV de `ogl.Plane`, signo de la normal de
pared por caso CCW/CW × isla/hueco) con cálculos escritos a mano línea por línea antes de escribir
el código, y el build+lint pasan sin errores de tipos ni de reglas — pero eso no garantiza que el
resultado visual sea correcto. Puntos concretos de riesgo que NO pude confirmar visualmente:

- **Clasificación isla/hueco real del logo:** el path principal tiene exactamente 4 subpaths
  (confirmado por conteo de `M`/`Z`). Asumí (sin poder verlo) que la clasificación centroide-en-
  polígono coincide con la intención visual del logo (ej. si alguno de esos 4 subpaths representa
  una "isla" separada — como una hebilla de tijera — en vez de un hueco, o viceversa). El algoritmo
  replica matemáticamente la regla `fill-rule="evenodd"` que el SVG ya declara, así que en teoría
  el resultado 3D coincide exactamente con lo que ya se ve en la textura PNG plana — pero no pude
  confirmarlo mirando el render real.
- **Densidad de la malla:** 12 segmentos por curva × 370 curvas × (frente+dorso+paredes) genera una
  malla no-indexada relativamente densa (miles de vértices). No crasheó el build ni hay ningún
  límite de buffer conocido de WebGL que debiera preocupar para una sola malla decorativa, pero no
  pude medir el framerate real en un navegador.
- **Escala/legibilidad de la extrusión:** `depth=0.22` es una elección visual sin referencia real
  — podría verse "fina" o "gruesa" de más una vez renderizado.
- **Color de pared (`uWallColor = vec3(0.3, 0.14, 0.19)`, ~70% de `--wine #6B3444`):** elegido por
  cálculo aritmético del hex, no calibrado visualmente contra el resto de la escena/iluminación.

Si al mirarlo el resultado se ve mal (huecos invertidos, paredes con normal opuesta pareciendo
"agujeros negros", proporción de profundidad rara), el punto de entrada más probable a revisar es
`classifySubpaths`/`outwardWallNormal` en `svgExtrude.ts` — la lógica está documentada paso a paso
en comentarios para facilitar el diagnóstico sin tener que re-derivarla desde cero.

## Verificación

```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (4 warnings preexistentes de React Compiler
                                          en otros archivos, no relacionadas con esta feature)
```

No se marca la feature como `"done"` en `feature_list.json` — queda a criterio del reviewer/leader.
