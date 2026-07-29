import earcut from 'earcut';

// Utilidad pura (sin dependencias de React/ogl) que convierte el atributo `d` de un `<path>` de
// SVG en un buffer de geometría 3D extruida siguiendo la silueta exacta del path — reemplaza la
// aproximación de plano simple de `HeroLogo3D` (UX-60) por una extrusión real (UX-63).

interface Point2D {
    x: number;
    y: number;
}

export interface ExtrudedGeometryData {
    position: Float32Array;
    normal: Float32Array;
    uv: Float32Array;
}

export interface ExtrudeOptions {
    /** Ancho/alto del viewBox original del SVG fuente (`shear-favicon.svg`: 489x483). */
    svgWidth: number;
    svgHeight: number;
    /** Tamaño objetivo (mismas unidades que el `Plane` que reemplaza, ej. 1.7). */
    targetSize: number;
    /** Profundidad total de la extrusión en Z. */
    depth: number;
    /** Segmentos de subdivisión por curva cúbica Bézier (rango recomendado 12-16). */
    curveSegments: number;
}

/** Marca de UV para las paredes laterales — el fragment shader usa `uv.x < 0.0` para saltear
 * `texture2D` y pintar un color sólido en vez de la textura real (ver `HeroLogo3D.tsx`). */
const WALL_UV: readonly [number, number] = [-1, -1];

function cubicBezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
}

/**
 * Parsea un atributo `d` de SVG en subpaths (polilíneas ya aplanadas). Solo soporta M/L/C/Z —
 * únicos comandos presentes en `shear-favicon.svg` (verificado por inspección directa: el path
 * principal usa exclusivamente M/C/Z, sin H/V/S/Q). `L` se soporta igual por robustez mínima
 * ante un SVG futuro con líneas rectas, sin costo adicional real.
 */
function parsePathToSubpaths(d: string, curveSegments: number): Point2D[][] {
    const tokens = d.match(/[MLCZ][^MLCZ]*/g) ?? [];
    const subpaths: Point2D[][] = [];
    let current: Point2D[] = [];
    let currentPoint: Point2D = { x: 0, y: 0 };
    let subpathStart: Point2D = { x: 0, y: 0 };

    for (const token of tokens) {
        const cmd = token[0];
        const nums = token
            .slice(1)
            .trim()
            .split(/[\s,]+/)
            .filter((s) => s.length > 0)
            .map(Number);

        if (cmd === 'M') {
            if (current.length > 0) {
                subpaths.push(current);
            }
            current = [];
            currentPoint = { x: nums[0], y: nums[1] };
            subpathStart = currentPoint;
            current.push(currentPoint);
            // Coordenadas extra tras el M inicial son implícitamente `L` (polyline) — no aparece
            // en este SVG, pero es el comportamiento estándar de la spec de path data.
            for (let i = 2; i + 1 < nums.length; i += 2) {
                currentPoint = { x: nums[i], y: nums[i + 1] };
                current.push(currentPoint);
            }
        } else if (cmd === 'L') {
            for (let i = 0; i + 1 < nums.length; i += 2) {
                currentPoint = { x: nums[i], y: nums[i + 1] };
                current.push(currentPoint);
            }
        } else if (cmd === 'C') {
            for (let i = 0; i + 5 < nums.length; i += 6) {
                const p0 = currentPoint;
                const p1 = { x: nums[i], y: nums[i + 1] };
                const p2 = { x: nums[i + 2], y: nums[i + 3] };
                const p3 = { x: nums[i + 4], y: nums[i + 5] };
                for (let s = 1; s <= curveSegments; s++) {
                    current.push(cubicBezierPoint(p0, p1, p2, p3, s / curveSegments));
                }
                currentPoint = p3;
            }
        } else if (cmd === 'Z') {
            currentPoint = subpathStart;
            if (current.length > 0) {
                subpaths.push(current);
                current = [];
            }
        }
    }
    if (current.length > 0) {
        subpaths.push(current);
    }
    return subpaths;
}

function polygonArea(points: readonly Point2D[]): number {
    let sum = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        sum += points[j].x * points[i].y - points[i].x * points[j].y;
    }
    return Math.abs(sum) / 2;
}

// Área con signo (positiva = sentido antihorario en un sistema matemático estándar Y-arriba).
// Se usa para elegir el sentido de la normal saliente de cada pared lateral (`outwardWallNormal`).
function signedArea(points: readonly Point2D[]): number {
    let sum = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        sum += points[j].x * points[i].y - points[i].x * points[j].y;
    }
    return sum / 2;
}

function centroidOf(points: readonly Point2D[]): Point2D {
    let sx = 0;
    let sy = 0;
    for (const p of points) {
        sx += p.x;
        sy += p.y;
    }
    return { x: sx / points.length, y: sy / points.length };
}

function pointInPolygon(point: Point2D, polygon: readonly Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i];
        const pj = polygon[j];
        const intersects =
            pi.y > point.y !== pj.y > point.y &&
            point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

interface ClassifiedSubpaths {
    islandIndices: number[];
    holesByIsland: Map<number, number[]>;
}

/**
 * Clasifica cada subpath como isla (contorno sólido) o hueco de otro subpath, replicando la
 * regla `fill-rule="evenodd"` del propio SVG fuente vía paridad de anidamiento: el centroide de
 * un subpath contenido en otro de área mayor lo marca candidato a hueco de ese contenedor (el de
 * área menor entre los que lo contienen = el contenedor inmediato); la profundidad de anidamiento
 * par = isla, impar = hueco de su contenedor inmediato — así una isla anidada dentro de un hueco
 * (profundidad par de nuevo) se triangula como una isla independiente, no como hueco de un hueco.
 */
function classifySubpaths(subpaths: readonly Point2D[][]): ClassifiedSubpaths {
    const areas = subpaths.map((sp) => polygonArea(sp));
    const centroids = subpaths.map((sp) => centroidOf(sp));

    const immediateParent: (number | null)[] = subpaths.map(() => null);
    for (let i = 0; i < subpaths.length; i++) {
        let bestParent: number | null = null;
        let bestArea = Infinity;
        for (let j = 0; j < subpaths.length; j++) {
            if (i === j || areas[j] <= areas[i]) {
                continue;
            }
            if (areas[j] < bestArea && pointInPolygon(centroids[i], subpaths[j])) {
                bestParent = j;
                bestArea = areas[j];
            }
        }
        immediateParent[i] = bestParent;
    }

    const depthOf = (index: number, guard: Set<number> = new Set()): number => {
        const parent = immediateParent[index];
        if (parent === null || guard.has(index)) {
            return 0;
        }
        guard.add(index);
        return 1 + depthOf(parent, guard);
    };

    const islandIndices: number[] = [];
    const holesByIsland = new Map<number, number[]>();
    for (let i = 0; i < subpaths.length; i++) {
        if (depthOf(i) % 2 === 0) {
            islandIndices.push(i);
            holesByIsland.set(i, []);
        }
    }
    for (let i = 0; i < subpaths.length; i++) {
        if (depthOf(i) % 2 === 1 && immediateParent[i] !== null) {
            holesByIsland.get(immediateParent[i] as number)?.push(i);
        }
    }

    return { islandIndices, holesByIsland };
}

// Mapea un punto en espacio SVG (0..svgWidth, 0..svgHeight, Y hacia abajo) al espacio local del
// mesh: escala uniforme para que quepa en `targetSize`, centrado en el origen, con flip de Y
// (SVG Y-abajo -> 3D Y-arriba).
function toLocal(p: Point2D, svgWidth: number, svgHeight: number, scale: number): Point2D {
    const cx = svgWidth / 2;
    const cy = svgHeight / 2;
    return {
        x: (p.x - cx) * scale,
        y: -(p.y - cy) * scale,
    };
}

// UV lineal directo desde el espacio SVG completo (viewBox), con flip de Y: `ogl` sube las
// texturas con `flipY: true` (convención "v=1 arriba de la imagen"), que es exactamente lo que
// ya usaba el `Plane` anterior — replicarlo acá para que el mapeo de textura no cambie.
function toUv(p: Point2D, svgWidth: number, svgHeight: number): Point2D {
    return { x: p.x / svgWidth, y: 1 - p.y / svgHeight };
}

function outwardWallNormal(
    p1: Point2D,
    p2: Point2D,
    ringIsCCW: boolean,
    isHole: boolean,
): [number, number, number] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    // Normal saliente para un anillo CCW visto como sólido: rotar la dirección de la arista -90°.
    const baseX = dy / len;
    const baseY = -dx / len;
    // Un hueco expone su pared hacia el vacío que encierra (lo opuesto de "hacia afuera del
    // anillo"), así que invierte el signo respecto del caso isla.
    const sign = (ringIsCCW ? 1 : -1) * (isHole ? -1 : 1);
    return [baseX * sign, baseY * sign, 0];
}

function pushWallQuad(
    positions: number[],
    normals: number[],
    uvs: number[],
    p1Local: Point2D,
    p2Local: Point2D,
    depth: number,
    normal: readonly [number, number, number],
): void {
    const half = depth / 2;
    const front1: readonly [number, number, number] = [p1Local.x, p1Local.y, half];
    const front2: readonly [number, number, number] = [p2Local.x, p2Local.y, half];
    const back1: readonly [number, number, number] = [p1Local.x, p1Local.y, -half];
    const back2: readonly [number, number, number] = [p2Local.x, p2Local.y, -half];

    // El orden de los índices del quad es arbitrario acá: la normal se asigna explícita por
    // vértice (no se deriva del producto cruz de la triangulación) y el `Program` renderiza con
    // `cullFace: false`, así que el sentido de giro no determina qué cara se ve.
    const quadVerts: (readonly [number, number, number])[] = [front1, front2, back2, front1, back2, back1];
    for (const v of quadVerts) {
        positions.push(v[0], v[1], v[2]);
        normals.push(normal[0], normal[1], normal[2]);
        uvs.push(WALL_UV[0], WALL_UV[1]);
    }
}

function buildRingWalls(
    positions: number[],
    normals: number[],
    uvs: number[],
    ringLocal: readonly Point2D[],
    depth: number,
    isHole: boolean,
): void {
    const ringIsCCW = signedArea(ringLocal) > 0;
    for (let i = 0; i < ringLocal.length; i++) {
        const p1 = ringLocal[i];
        const p2 = ringLocal[(i + 1) % ringLocal.length];
        const normal = outwardWallNormal(p1, p2, ringIsCCW, isHole);
        pushWallQuad(positions, normals, uvs, p1, p2, depth, normal);
    }
}

function buildIslandFaces(
    positions: number[],
    normals: number[],
    uvs: number[],
    outerSvg: readonly Point2D[],
    holesSvg: readonly Point2D[][],
    svgWidth: number,
    svgHeight: number,
    scale: number,
    depth: number,
): void {
    const allSvg: Point2D[] = [...outerSvg, ...holesSvg.flat()];
    const allLocal = allSvg.map((p) => toLocal(p, svgWidth, svgHeight, scale));
    const allUv = allSvg.map((p) => toUv(p, svgWidth, svgHeight));

    const flat: number[] = [];
    for (const p of allLocal) {
        flat.push(p.x, p.y);
    }
    const holeIndices: number[] = [];
    let running = outerSvg.length;
    for (const hole of holesSvg) {
        holeIndices.push(running);
        running += hole.length;
    }

    const triangles = earcut(flat, holeIndices);

    const half = depth / 2;
    for (let t = 0; t < triangles.length; t += 3) {
        const ia = triangles[t];
        const ib = triangles[t + 1];
        const ic = triangles[t + 2];

        // Frente (+Z): earcut garantiza índices en sentido antihorario en un sistema Y-arriba —
        // `allLocal` ya está mapeado a ese espacio, así que el orden (ia,ib,ic) produce la normal
        // +Z directamente, sin invertir nada.
        for (const idx of [ia, ib, ic]) {
            positions.push(allLocal[idx].x, allLocal[idx].y, half);
            normals.push(0, 0, 1);
            uvs.push(allUv[idx].x, allUv[idx].y);
        }
        // Trasera (-Z): orden de índices invertido para que la normal mire hacia -Z.
        for (const idx of [ia, ic, ib]) {
            positions.push(allLocal[idx].x, allLocal[idx].y, -half);
            normals.push(0, 0, -1);
            uvs.push(allUv[idx].x, allUv[idx].y);
        }
    }
}

/**
 * Construye el buffer de geometría (position/normal/uv, no indexado) de la extrusión 3D de un
 * path de SVG, siguiendo su silueta exacta (islas + huecos triangulados con `earcut`) más las
 * paredes laterales de cada contorno (exterior y de cada hueco).
 */
export function buildExtrudedLogoGeometry(pathD: string, options: ExtrudeOptions): ExtrudedGeometryData {
    const { svgWidth, svgHeight, targetSize, depth, curveSegments } = options;
    const scale = targetSize / Math.max(svgWidth, svgHeight);

    const subpathsSvg = parsePathToSubpaths(pathD, curveSegments);
    const { islandIndices, holesByIsland } = classifySubpaths(subpathsSvg);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    for (const islandIdx of islandIndices) {
        const outerSvg = subpathsSvg[islandIdx];
        const holeIdxList = holesByIsland.get(islandIdx) ?? [];
        const holesSvg = holeIdxList.map((idx) => subpathsSvg[idx]);

        buildIslandFaces(positions, normals, uvs, outerSvg, holesSvg, svgWidth, svgHeight, scale, depth);

        const outerLocal = outerSvg.map((p) => toLocal(p, svgWidth, svgHeight, scale));
        buildRingWalls(positions, normals, uvs, outerLocal, depth, false);

        for (const hole of holesSvg) {
            const holeLocal = hole.map((p) => toLocal(p, svgWidth, svgHeight, scale));
            buildRingWalls(positions, normals, uvs, holeLocal, depth, true);
        }
    }

    return {
        position: new Float32Array(positions),
        normal: new Float32Array(normals),
        uv: new Float32Array(uvs),
    };
}

// Concatena varios buffers de geometría no-indexada en uno solo — cada triángulo ya lleva sus 3
// vértices explícitos (`buildIslandFaces`/`pushWallQuad` no comparten índices entre sí), así que
// una simple concatenación de arrays alcanza, sin necesidad de remapear ningún índice.
function mergeExtrudedGeometry(chunks: readonly ExtrudedGeometryData[]): ExtrudedGeometryData {
    const positionLength = chunks.reduce((sum, c) => sum + c.position.length, 0);
    const normalLength = chunks.reduce((sum, c) => sum + c.normal.length, 0);
    const uvLength = chunks.reduce((sum, c) => sum + c.uv.length, 0);

    const position = new Float32Array(positionLength);
    const normal = new Float32Array(normalLength);
    const uv = new Float32Array(uvLength);

    let positionOffset = 0;
    let normalOffset = 0;
    let uvOffset = 0;
    for (const chunk of chunks) {
        position.set(chunk.position, positionOffset);
        normal.set(chunk.normal, normalOffset);
        uv.set(chunk.uv, uvOffset);
        positionOffset += chunk.position.length;
        normalOffset += chunk.normal.length;
        uvOffset += chunk.uv.length;
    }

    return { position, normal, uv };
}

/**
 * Variante multi-path de `buildExtrudedLogoGeometry` (UX-64): `shear-favicon.svg` tiene 4
 * `<path>` de distinto color, cada uno con su propia silueta — NO anidada dentro de las de los
 * otros paths (son capas de color independientes del diseño original, pueden solaparse entre sí
 * en algunas zonas). Clasificar isla/hueco de forma global y cruzada entre los 4 paths sería
 * semánticamente incorrecto (una forma de un path podría "caer dentro" de una forma de OTRO path
 * sin que eso signifique que es un hueco suyo). Por eso cada `d` se procesa con su propia pasada
 * completa e independiente de `buildExtrudedLogoGeometry` (parseo -> clasificación isla/hueco
 * propia -> triangulación -> paredes) y los 4 buffers resultantes se concatenan al final. Si dos
 * paths se solapan visualmente en alguna zona, ambas geometrías coexisten ahí (riesgo aceptado de
 * z-fighting puntual) — preferible a que falte geometría por completo, que era el bug reportado.
 */
export function buildExtrudedLogoGeometryFromPaths(
    pathDs: readonly string[],
    options: ExtrudeOptions,
): ExtrudedGeometryData {
    const chunks = pathDs
        .filter((d) => d.trim().length > 0)
        .map((d) => buildExtrudedLogoGeometry(d, options));
    return mergeExtrudedGeometry(chunks);
}
