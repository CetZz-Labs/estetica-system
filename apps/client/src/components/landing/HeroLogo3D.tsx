import { useEffect, useRef } from 'react';
import { Camera, Geometry, Mesh, Program, Renderer, Texture, Transform } from 'ogl';
import { buildExtrudedLogoGeometryFromPaths } from './svgExtrude';

// Render 3D real del logo de Shear en el hero de la Landing (UX-60 -> UX-63): a diferencia del
// shader fullscreen de `Silk.tsx` (docs/patterns-frontend.md § P15, sin geometría 3D ni cámara),
// acá el objeto rota en espacio 3D real, así que el vertex shader SÍ necesita las matrices
// estándar que `Mesh.draw({ camera })` inyecta automáticamente como uniforms (`modelViewMatrix`/
// `projectionMatrix`/`normalMatrix`, ver `ogl/src/core/Mesh.js`). UX-63 reemplaza el `Plane`
// original (aproximación rectangular) por una extrusión real que sigue la silueta exacta del SVG
// del logo (`svgExtrude.ts`), triangulada con `earcut`.
const VERTEX_SRC = `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Textura del logo + sombreado simple (difusa direccional fija en espacio de cámara + highlight
// especular tipo Blinn-Phong) para que se perciba volumen real mientras gira. Las paredes
// laterales de la extrusión (UX-63) llegan con `uv.x < 0.0` (marca de `svgExtrude.ts`) y saltean
// `texture2D` a favor de un tono sólido oscurecido del acento wine de marca (`--wine: #6B3444`,
// ver `docs/index.css`), para leerse como el "canto" del objeto en vez de repetir la textura.
const FRAGMENT_SRC = `
precision highp float;

uniform sampler2D tMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

const vec3 uLightDir = vec3(0.4, 0.6, 1.0);
const vec3 uWallColor = vec3(0.3, 0.14, 0.19);

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDir);
  vec3 viewDir = normalize(vViewPosition);

  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), 26.0);

  vec3 baseColor;
  float alpha;
  if (vUv.x < 0.0) {
    baseColor = uWallColor;
    alpha = 1.0;
  } else {
    vec4 tex = texture2D(tMap, vUv);
    baseColor = tex.rgb;
    alpha = tex.a;
  }

  vec3 color = baseColor * (0.55 + 0.55 * diffuse) + vec3(1.0) * specular * 0.35;
  gl_FragColor = vec4(color, alpha);
}
`;

interface Props {
    /** Recibido como prop desde `Landing.tsx` (ya calculado con `useReducedMotion()`) —
     * `HeroLogo3D` no invoca el hook internamente, mismo patrón que `Silk`/`DotField`. */
    prefersReducedMotion: boolean;
}

// Dimensiones del viewBox de `public/media/shear-favicon.svg` (fuente de la silueta exacta).
const SVG_WIDTH = 489;
const SVG_HEIGHT = 483;
// Mismo tamaño que ocupaba el `Plane` original (UX-60) para no alterar el encuadre del hero.
const TARGET_SIZE = 1.7;
// Profundidad total de la extrusión. UX-63 la dejó en 0.22 sin poder verificarla en navegador —
// el usuario la probó y la reportó "muy profunda" (UX-64); se reduce a menos de la mitad
// (~4.7% del tamaño del logo, contra el ~13% anterior) para que se perciba como un grosor sutil
// de "canto" en vez de un bloque grueso.
const EXTRUDE_DEPTH = 0.08;
// Dentro del rango recomendado (12-16) para la feature — 12 acota el conteo de vértices dado que
// el path principal tiene ~370 curvas cúbicas en sus 4 subpaths.
const CURVE_SEGMENTS = 12;
const STATIC_ANGLE = { x: 0.32, y: 0.55 };

/**
 * Render 3D real (perspectiva de cámara real, no un tilt CSS) del logo de Shear
 * (`/shear-favicon.png`) en la columna derecha del hero de la Landing (UX-60) — reemplaza las 3
 * tarjetas de estadística que ocupaban antes ese espacio. Setup `ogl`: `Camera` de perspectiva +
 * `Transform` (raíz de escena) + `Mesh` (geometría extruida de `svgExtrude.ts` + `Program` con
 * `Texture` del favicon), con rotación continua y sutil en loop. Con `prefersReducedMotion`, un
 * único frame estático (ángulo fijo) sin `requestAnimationFrame`. UX-63: la geometría ya no es un
 * `Plane` rectangular — sigue la silueta exacta del SVG del logo (extrusión real con paredes
 * laterales), construida de forma asíncrona (`fetch` del SVG en `public/`) antes de montar el
 * `Mesh` en la escena.
 */
export default function HeroLogo3D({ prefersReducedMotion }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
        const gl = renderer.gl;
        container.appendChild(gl.canvas);

        const camera = new Camera(gl, { fov: 32, near: 0.1, far: 100 });
        camera.position.set(0, 0, 3.4);

        const scene = new Transform();

        // Carga asíncrona de la textura (patrón estándar de `ogl`): el `Mesh` ya queda armado y
        // el loop de render arranca sin esperar la imagen — mientras carga, `Texture` sube un
        // pixel vacío para no producir errores de WebGL (ver `ogl/src/core/Texture.js`).
        const texture = new Texture(gl);
        const image = new Image();
        image.onload = () => {
            texture.image = image;
        };
        image.src = '/shear-favicon.png';

        const program = new Program(gl, {
            vertex: VERTEX_SRC,
            fragment: FRAGMENT_SRC,
            uniforms: { tMap: { value: texture } },
            transparent: true,
            // Sin cull de caras: la rotación continua en Y muestra ambos lados del plano — con
            // el cull por defecto de `ogl` (back-face), el logo desaparecería al pasar los 90°.
            cullFace: false,
        });

        let mesh: Mesh | null = null;
        let cancelled = false;

        // La silueta vive en `public/` (asset estático, no un módulo importable) — se carga por
        // `fetch` en vez de un import de build, mismo espíritu asíncrono que ya tenía la carga de
        // la textura de abajo. Hasta que resuelva, la escena queda vacía (sin `Mesh`) y el loop de
        // render sigue andando igual — mismo patrón tolerante a carga diferida que la textura.
        fetch('/media/shear-favicon.svg')
            .then((response) => response.text())
            .then((svgText) => {
                if (cancelled) {
                    return;
                }
                const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
                // Los 4 `<path>` del SVG son capas de color independientes del mismo diseño —
                // partes del ícono (ej. los mechones más finos) se extienden por fuera de la
                // silueta del primero (`#e49eab`), así que usar solo ese path (UX-63) dejaba
                // geometría faltante aunque la textura ya las pintara (UX-64). Se toman los 4.
                const pathDs = Array.from(doc.querySelectorAll('path')).map(
                    (el) => el.getAttribute('d') ?? '',
                );
                if (pathDs.every((d) => d.length === 0)) {
                    console.error('HeroLogo3D: no se encontró ningún path de silueta en shear-favicon.svg');
                    return;
                }

                const { position, normal, uv } = buildExtrudedLogoGeometryFromPaths(pathDs, {
                    svgWidth: SVG_WIDTH,
                    svgHeight: SVG_HEIGHT,
                    targetSize: TARGET_SIZE,
                    depth: EXTRUDE_DEPTH,
                    curveSegments: CURVE_SEGMENTS,
                });

                const geometry = new Geometry(gl, {
                    position: { size: 3, data: position },
                    normal: { size: 3, data: normal },
                    uv: { size: 2, data: uv },
                });

                mesh = new Mesh(gl, { geometry, program });
                mesh.setParent(scene);

                // Ángulo fijo para el frame estático de `prefersReducedMotion` — mismo espíritu de
                // inclinación que tendría a mitad del loop, sin animar nada.
                if (prefersReducedMotion) {
                    mesh.rotation.x = STATIC_ANGLE.x;
                    mesh.rotation.y = STATIC_ANGLE.y;
                    renderer.render({ scene, camera });
                }
            })
            .catch((error: unknown) => {
                console.error('HeroLogo3D: error al construir la extrusión 3D del logo:', error);
            });

        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width === 0 || height === 0) {
                return;
            }
            renderer.setSize(width, height);
            camera.perspective({ aspect: width / height });
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let rafId: number | null = null;

        const loop = (now: number) => {
            if (!prefersReducedMotion) {
                const t = now * 0.001;
                if (mesh) {
                    mesh.rotation.y = t * 0.45;
                    mesh.rotation.x = Math.sin(t * 0.6) * 0.18;
                }
                rafId = requestAnimationFrame(loop);
            }
            renderer.render({ scene, camera });
        };

        if (prefersReducedMotion) {
            renderer.render({ scene, camera });
        } else {
            rafId = requestAnimationFrame(loop);
        }

        return () => {
            // Evita que el `fetch` de la silueta resuelva después de desmontar y agregue un
            // `Mesh` a una escena/canvas que ya no existen (no es uno de los 4 pasos del cleanup
            // de `ogl` en sí, es una guarda previa contra esa carrera async).
            cancelled = true;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            resizeObserver.disconnect();
            // `ogl` no expone un `dispose()` de alto nivel como three.js — mismo checklist de 4
            // pasos que `Silk.tsx` (docs/patterns-frontend.md § P15).
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            if (container.contains(gl.canvas)) {
                container.removeChild(gl.canvas);
            }
        };
    }, [prefersReducedMotion]);

    return <div ref={containerRef} className="w-full h-full" />;
}
