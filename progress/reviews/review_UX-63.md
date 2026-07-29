# Reporte de Revisión Técnica — Feature UX-63

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-29

## Alcance auditado

- `apps/client/src/components/landing/svgExtrude.ts` (nuevo)
- `apps/client/src/components/landing/HeroLogo3D.tsx` (modificado)
- `apps/client/package.json` / `pnpm-lock.yaml` (nueva dependencia `earcut@3.2.3`)
- `docs/design.md` §13.1 (documentación de la dependencia)
- `progress/implements/impl_UX-63.md` (bitácora)

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — solo `UX-63` está `in_progress` en `feature_list.json`; `progress/current.md` describe únicamente esta feature; sandbox restringido a `apps/client/`.
- [x] C3 (Fidelidad Arquitectónica) — componente presentacional puro sin llamadas HTTP vía Axios/TanStack Query (correcto: es un asset decorativo WebGL, no un recurso de negocio paginable; no aplica el patrón de listados). `HeroLogo3D` sigue `export default function`. `svgExtrude.ts` es una utilidad pura sin dependencias de React/ogl, tal como se documenta.
- [x] C4 (Compilación Estática + Lint) — ver verificación empírica abajo.
- [x] C6 (Sin dependencias no autorizadas) — único paquete nuevo: `earcut@3.2.3` en `apps/client/package.json`/`pnpm-lock.yaml`. Confirmado por `git diff` que no se tocó `apps/server/`, ni `package.json` raíz, ni se introdujo three.js/@react-three/*/gsap/parser SVG externo.
- [x] C7 (Security Gate) — no aplica autenticación/multi-tenancy/IDOR (componente puramente de presentación en landing pública). Sin `dangerouslySetInnerHTML`. Sin variables de entorno sensibles tocadas.
- [x] C8 (Estabilidad de API) — no aplica, no hay endpoint ni contrato de API involucrado.

## Verificación Empírica

### C4 — Builds y lint

```
pnpm --filter @estetica/client build   → Exit Code 0 (verificado por el reviewer, no solo por dicho del implementer)
pnpm --filter @estetica/client lint    → Exit Code 0, 4 warnings preexistentes de React Compiler
                                          (ProfesionalModal.tsx:83, RegistroModal.tsx:126,
                                          Negocio.tsx:83, Turnos.tsx:208) — no relacionadas con
                                          los archivos de esta feature, no son warnings nuevos.
```

### Verificación directa del SVG fuente (contra la afirmación del implementer)

Se inspeccionó por script el `d` real del primer `<path fill="#e49eab">` de
`apps/client/public/media/shear-favicon.svg`: **solo contiene los comandos `M`, `C`, `Z`** (4 `M`,
4 `Z`, 370 `C`, sin `L`/`H`/`V`/`S`/`Q`). Esto confirma exactamente la afirmación de la bitácora —
la tokenización por regex `/[MLCZ][^MLCZ]*/g` en `parsePathToSubpaths` cubre todos los comandos
realmente presentes; el soporte de `L` es código muerto inofensivo para este SVG concreto pero no
introduce riesgo.

### Verificación empírica del winding de `earcut` (el punto de mayor incertidumbre señalado)

Dado que el entorno del reviewer sí cuenta con Node, se ejecutó `buildExtrudedLogoGeometry` de
forma aislada (transpilando el módulo con la API de TypeScript y ejecutándolo contra el path real
del SVG, con los mismos parámetros que usa `HeroLogo3D.tsx`: `depth=0.22`, `curveSegments=12`,
`targetSize=1.7`). Resultado:

- 17,752 triángulos generados, sin `NaN` en el buffer de posiciones.
- Bounding box resultante: X∈[-0.73, 0.75], Y∈[-0.78, 0.82], Z∈[-0.11, 0.11] — coherente con
  `targetSize=1.7` y `depth=0.22` tal como se documentó.
- De 4,432 triángulos de cara frontal (normal `(0,0,1)` explícita) verificados por área con signo
  en XY: **4,380 dan área positiva (CCW)** y solo 52 dan un valor negativo, todos de magnitud
  `~1e-10` (triángulos degenerados/colineales de precisión de punto flotante producidos por
  `earcut` en aristas casi rectas de la curva Bézier aplanada, no una inversión real de winding).

Esto **confirma empíricamente** — no solo analíticamente — la afirmación del comentario en
`buildIslandFaces`: el ear-clipping de `earcut` preserva el sentido antihorario del polígono de
entrada en el espacio Y-arriba de `allLocal`, y la cara frontal no necesita invertir el orden de
índices. El riesgo de "sombreado invertido" señalado como incertidumbre honesta en la bitácora
queda descartado con evidencia, no solo mitigado por `cullFace: false`.

### Firma de `earcut`

Confirmado contra `apps/client/node_modules/earcut/README.md`: la firma es
`earcut(vertices flatten, holeIndices?, dim?)`, exactamente como se invoca en
`buildIslandFaces` (`earcut(flat, holeIndices)`, `dim` por defecto 2). Correcto.

### Clasificación isla/hueco

`classifySubpaths` calcula, para cada subpath, área (shoelace) + centroide, y busca el subpath de
área mayor que contiene ese centroide (ray casting `pointInPolygon`) con menor área entre los
candidatos como contenedor inmediato; profundidad de anidamiento par → isla, impar → hueco. Esto
implementa razonablemente la paridad de `fill-rule="evenodd"` (confirmado que el `<path>` fuente
declara ese atributo). Es una heurística centroide-based (no un test de contención de polígono
completo), documentado explícitamente como tal por el propio implementer — aceptable para un
logo con 4 subpaths de geometría simple, sin evidencia de que el centroide de algún subpath caiga
fuera de su contenedor real dado el bbox razonable obtenido en la ejecución de prueba.

### `HeroLogo3D.tsx`

- `prefersReducedMotion` sigue respetado: frame estático (`renderer.render` sin RAF) cuando es
  `true`, sin regresión respecto a la versión previa.
- Cleanup de 4 pasos preservado (`cancelAnimationFrame` → `resizeObserver.disconnect()` →
  `loseContext()` → `removeChild`), más la guarda `cancelled` (paso previo, no uno de los 4)
  contra que el `fetch` del SVG resuelva y monte un `Mesh` en un canvas ya desmontado — correcto.
- Construcción asíncrona de la geometría (`fetch('/media/shear-favicon.svg')` → parseo con
  `DOMParser` → `buildExtrudedLogoGeometry` → `Geometry`/`Mesh`) sigue el mismo espíritu tolerante
  a carga diferida que ya tenía la textura, sin bloquear el loop de render.
- `cullFace: false` se mantiene, correcto dado el uso de normales explícitas por vértice en las
  paredes laterales (no derivadas del `cross product` de la triangulación).

### Documentación (`docs/design.md` §13.1)

Confirmado: documenta `earcut` como dependencia nueva, exclusiva de
`svgExtrude.ts`/`HeroLogo3D.tsx`, deja explícito que `three`/`@react-three/*`/`gsap` siguen sin
excepción, y documenta el color de pared lateral elegido.

## Hallazgos no bloqueantes (no requieren acción para aprobar)

1. **`apps/client/src/components/landing/HeroLogo3D.tsx:163` y `:193`** — dos `console.error(...)`
   nuevos (path de silueta no encontrado / fallo de `fetch`/construcción de geometría). No violan
   la regla de "no console.error al usuario" del arnés de frontend porque no hay ningún flujo de
   datos de negocio ni toast asociado a este componente decorativo (no es un `useQuery`/mutación
   de la capa de datos); son diagnóstico de un asset estático que en la práctica no debería fallar
   en producción. Se deja anotado por transparencia, sin bloquear el veredicto.
2. **Densidad de malla** (17,752 triángulos no indexados) y **profundidad `0.22`** — elecciones
   razonables dentro del rango sugerido, pero no calibradas visualmente (el implementer lo señaló
   honestamente). Queda pendiente de validación visual del usuario, ver abajo.
3. **Clasificación isla/hueco basada en centroide** — matemáticamente razonable y coherente con
   `evenodd`, pero es una heurística (no un test de contención exacta de polígono completo) que
   podría fallar en un SVG con subpaths cóncavos cuyo centroide cae fuera de su propio contorno.
   Para este logo concreto (4 subpaths) no se encontró evidencia de ese caso al ejecutar el
   pipeline real.

## Pendiente explícito (fuera del alcance de este reviewer)

**La validación visual final en navegador queda pendiente del usuario** — ni el implementer ni
este reviewer cuentan con un navegador en este entorno para confirmar que el resultado 3D se vea
correcto (dirección de huecos, legibilidad de la extrusión, color de pared). El build/lint pasan y
el pipeline de geometría fue verificado empíricamente (no solo analíticamente) contra el SVG real,
lo cual reduce sustancialmente el riesgo señalado en la incertidumbre honesta de la bitácora, pero
no reemplaza la revisión visual humana. Mismo patrón que otras features WebGL de esta sesión
(UX-46/UX-60).

## Cambios Requeridos

Ninguno. Sin violaciones bloqueantes.
