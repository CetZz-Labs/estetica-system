import { useEffect, useRef } from 'react';
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';

// Fondo animado "Silk" del hero (UX-46): puerto a `ogl` (WebGL ligero) de la variante oficial
// Silk-JS-CSS de react-bits, cuya forma original requiere three.js + @react-three/fiber
// (purgados del proyecto en UX-45, ver docs/design.md §13.1). `Triangle` es el idiom estándar de
// `ogl` para shaders fullscreen: un único triángulo sobredimensionado que cubre exactamente el
// viewport tras el recorte, evitando el seam central de un plano de 2 triángulos — sus atributos
// `position`/`uv` ya llegan en espacio de clip, por lo que el vertex shader no necesita
// `projectionMatrix`/`modelViewMatrix`.
const VERTEX_SRC = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Fragment shader GLSL puro, reutilizado literal del componente original de react-bits — no
// depende de la API de three.js/R3F, se copia sin cambios funcionales.
const FRAGMENT_SRC = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

interface Props {
    /** Color hex del patrón de olas (uColor), ej. `#D98BA4`. */
    color: string;
    speed?: number;
    scale?: number;
    noiseIntensity?: number;
    rotation?: number;
    /** Recibido como prop desde `Landing.tsx` (ya calculado con `useReducedMotion()`) — Silk no
     * invoca el hook internamente, mismo patrón que `HeroBlob`/`TiltCard`/`Magnetic`. */
    prefersReducedMotion: boolean;
}

/**
 * Fondo animado de olas de tela, confinado al `section` del hero (UX-46). Con
 * `prefersReducedMotion`, se crea igual el contexto WebGL y se renderiza un único frame estático
 * (`uTime` congelado en 0), sin loop de `requestAnimationFrame` — el patrón de olas congelado en
 * su posición inicial, en vez de desmontar el canvas por completo.
 */
export default function Silk({
    color, speed = 2.2, scale = 1, noiseIntensity = 1.1, rotation = 0, prefersReducedMotion,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
        const gl = renderer.gl;
        container.appendChild(gl.canvas);

        const program = new Program(gl, {
            vertex: VERTEX_SRC,
            fragment: FRAGMENT_SRC,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new Color(color) },
                uSpeed: { value: speed },
                uScale: { value: scale },
                uRotation: { value: rotation },
                uNoiseIntensity: { value: noiseIntensity },
            },
        });
        const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            renderer.setSize(width, height);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let rafId: number | null = null;
        let lastTime = performance.now();

        const loop = (now: number) => {
            if (!prefersReducedMotion) {
                const delta = (now - lastTime) / 1000;
                lastTime = now;
                program.uniforms.uTime.value += delta * 0.1;
                rafId = requestAnimationFrame(loop);
            }
            renderer.render({ scene: mesh });
        };

        if (prefersReducedMotion) {
            renderer.render({ scene: mesh });
        } else {
            rafId = requestAnimationFrame(loop);
        }

        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            resizeObserver.disconnect();
            // `ogl` no expone un `dispose()` de alto nivel como three.js — el cleanup de
            // contexto WebGL depende de la extensión `WEBGL_lose_context` más la remoción manual
            // del canvas del DOM (crítico dado el historial de fugas de contexto de la pila
            // WebGL anterior, UX-44/UX-45).
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            if (container.contains(gl.canvas)) {
                container.removeChild(gl.canvas);
            }
        };
    }, [color, speed, scale, noiseIntensity, rotation, prefersReducedMotion]);

    return <div ref={containerRef} className="w-full h-full" />;
}
