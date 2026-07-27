import { useEffect, useId, useRef } from 'react';

const TWO_PI = Math.PI * 2;

interface Dot {
    ax: number;
    ay: number;
    sx: number;
    sy: number;
    vx: number;
    vy: number;
    x: number;
    y: number;
}

interface MouseState {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    speed: number;
}

interface SizeState {
    w: number;
    h: number;
}

// Subconjunto de props que el bucle de dibujo lee vía ref (no closure) para no tener que incluir
// cada prop individual en las dependencias del efecto — mismo motivo/idiom que `propsRef` de
// `Silk.tsx` (P15), adaptado acá al patrón original de react-bits `DotField-JS-CSS`.
interface DynamicProps {
    dotRadius: number;
    dotSpacing: number;
    cursorRadius: number;
    cursorForce: number;
    bulgeOnly: boolean;
    bulgeStrength: number;
    sparkle: boolean;
    waveAmplitude: number;
    gradientFrom: string;
    gradientTo: string;
}

interface Props {
    dotRadius?: number;
    dotSpacing?: number;
    cursorRadius?: number;
    cursorForce?: number;
    bulgeOnly?: boolean;
    bulgeStrength?: number;
    glowRadius?: number;
    sparkle?: boolean;
    waveAmplitude?: number;
    /** Color sólido del relleno de los puntos (rgba). UX-46-fix: en Maison se usa el MISMO valor
     * en `gradientFrom`/`gradientTo` — ver nota junto al punto de montaje en `Landing.tsx` sobre
     * por qué el `linear-gradient` de 2 tonos del componente original no se porta tal cual. */
    gradientFrom?: string;
    gradientTo?: string;
    /** Color sólido del glow radial que sigue al cursor (fade de UN tono hacia transparente). */
    glowColor?: string;
    /** Recibido como prop desde `Landing.tsx` (ya calculado con `useReducedMotion()`) — DotField
     * no invoca el hook internamente, mismo patrón que `Silk`/`ShapeGrid`. Con reduced-motion se
     * crea igual el canvas y se dibuja un único frame estático, sin loop de `requestAnimationFrame`
     * (mismo idiom que `Silk.tsx`, P15 del catálogo de patrones). */
    prefersReducedMotion?: boolean;
}

/**
 * Fondo de grilla de puntos con bulge/glow que sigue al cursor (UX-46-fix): reemplaza a
 * `ShapeGrid` como fondo compartido del resto de la Landing (Funcionalidades, Stats, "Cómo
 * funciona", CTA final, footer). Puerto a TypeScript de la variante Canvas 2D `DotField-JS-CSS`
 * de react-bits — cero dependencias externas, sin cambios de lógica de física/dibujo respecto al
 * original (solo tipado explícito + la guarda de `prefersReducedMotion` agregada por el leader).
 */
export default function DotField({
    dotRadius = 1.5,
    dotSpacing = 14,
    cursorRadius = 500,
    cursorForce = 0.1,
    bulgeOnly = true,
    bulgeStrength = 67,
    glowRadius = 160,
    sparkle = false,
    waveAmplitude = 0,
    // Defaults en tokens Shear (hallazgo no bloqueante del reviewer, UX-46-fix): el único punto
    // de montaje (Landing.tsx) siempre pasa estos 3 valores explícitos, pero los defaults de la
    // demo original de react-bits (morado/oscuro) quedaban como trampa latente para cualquier
    // reutilización futura del componente sin props explícitas. Mismos valores que
    // DOTFIELD_DOT_COLOR/DOTFIELD_GLOW_COLOR en Landing.tsx — gradientFrom/gradientTo iguales
    // entre sí (ver Cambio 2 de progress/implements/impl_UX-46-fix.md: un `linear-gradient` real
    // de 2 tonos está prohibido por docs/design.md §1.3).
    gradientFrom = 'rgba(107, 52, 68, 0.10)',
    gradientTo = 'rgba(107, 52, 68, 0.10)',
    glowColor = '#6B3444',
    prefersReducedMotion = false,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glowRef = useRef<SVGCircleElement>(null);
    const dotsRef = useRef<Dot[]>([]);
    const mouseRef = useRef<MouseState>({ x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 });
    const rafRef = useRef<number | null>(null);
    const sizeRef = useRef<SizeState>({ w: 0, h: 0 });
    const glowOpacity = useRef<number>(0);
    const engagement = useRef<number>(0);
    const propsRef = useRef<DynamicProps>({
        dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, gradientFrom, gradientTo,
    });
    // Sincroniza el ref en un efecto (no durante el render) — leer/escribir `.current` en el
    // cuerpo del componente viola la regla de pureza de render de React (flaggeada por el
    // compiler de React vía eslint-plugin-react-hooks). Sin deps: corre después de cada render,
    // siempre antes que el efecto de setup de más abajo (declarado después en el árbol).
    useEffect(() => {
        propsRef.current = {
            dotRadius, dotSpacing, cursorRadius, cursorForce, bulgeOnly, bulgeStrength, sparkle, waveAmplitude, gradientFrom, gradientTo,
        };
    });
    // `useId()` en vez de `Math.random()` (impuro, prohibido durante el render por la misma regla
    // de pureza) para el id único del `radialGradient` — estable entre renders, sin necesidad de
    // guardarlo en un ref.
    const rawGlowId = useId();
    const glowId = `dot-field-glow-${rawGlowId.replace(/[^a-zA-Z0-9]/g, '')}`;

    useEffect(() => {
        const canvas = canvasRef.current;
        const glowEl = glowRef.current;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            return;
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let resizeTimer: number | undefined;

        const buildDots = (w: number, h: number): void => {
            const p = propsRef.current;
            const step = p.dotRadius + p.dotSpacing;
            const cols = Math.floor(w / step);
            const rows = Math.floor(h / step);
            const padX = (w % step) / 2;
            const padY = (h % step) / 2;
            const dots: Dot[] = new Array(rows * cols);
            let idx = 0;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const ax = padX + col * step + step / 2;
                    const ay = padY + row * step + step / 2;
                    dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
                }
            }
            dotsRef.current = dots;
        };

        const doResize = (): void => {
            const parent = canvas.parentElement;
            if (!parent) {
                return;
            }
            const rect = parent.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            sizeRef.current = { w, h };

            buildDots(w, h);
        };

        const resize = (): void => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(doResize, 100);
        };

        // UX-46-fix2: el wrapper de montaje (Landing.tsx) es `fixed inset-0` — siempre
        // viewport-relativo, sin importar el scroll de la página. `e.clientX`/`e.clientY` ya son
        // coordenadas relativas al viewport, así que no hace falta (ni es correcto) restar ningún
        // offset de scroll. El cálculo anterior (`e.pageX/pageY - offsetX/offsetY`, con el offset
        // recalculado solo en mount/resize, nunca en scroll) desplazaba el cursor virtual hacia
        // abajo por la distancia scrolleada desde el mount — el glow/bulge terminaba dibujándose
        // debajo del cursor real a medida que el usuario scrolleaba.
        const onMouseMove = (e: MouseEvent): void => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        const updateMouseSpeed = (): void => {
            const m = mouseRef.current;
            const dx = m.prevX - m.x;
            const dy = m.prevY - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            m.speed += (dist - m.speed) * 0.5;
            if (m.speed < 0.001) {
                m.speed = 0;
            }
            m.prevX = m.x;
            m.prevY = m.y;
        };

        const speedInterval = window.setInterval(updateMouseSpeed, 20);
        let frameCount = 0;

        const tick = (): void => {
            frameCount++;
            const dots = dotsRef.current;
            const m = mouseRef.current;
            const { w, h } = sizeRef.current;
            const p = propsRef.current;
            const len = dots.length;
            const t = frameCount * 0.02;

            const targetEngagement = Math.min(m.speed / 5, 1);
            engagement.current += (targetEngagement - engagement.current) * 0.06;
            if (engagement.current < 0.001) {
                engagement.current = 0;
            }
            const eng = engagement.current;

            glowOpacity.current += (eng - glowOpacity.current) * 0.08;

            if (glowEl) {
                glowEl.setAttribute('cx', String(m.x));
                glowEl.setAttribute('cy', String(m.y));
                glowEl.style.opacity = String(glowOpacity.current);
            }

            ctx.clearRect(0, 0, w, h);

            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, p.gradientFrom);
            grad.addColorStop(1, p.gradientTo);
            ctx.fillStyle = grad;

            const cr = p.cursorRadius;
            const crSq = cr * cr;
            const rad = p.dotRadius / 2;
            const isBulge = p.bulgeOnly;

            ctx.beginPath();

            for (let i = 0; i < len; i++) {
                const d = dots[i];
                const dx = m.x - d.ax;
                const dy = m.y - d.ay;
                const distSq = dx * dx + dy * dy;

                if (distSq < crSq && eng > 0.01) {
                    const dist = Math.sqrt(distSq);
                    if (isBulge) {
                        const tt = 1 - dist / cr;
                        const push = tt * tt * p.bulgeStrength * eng;
                        const angle = Math.atan2(dy, dx);
                        d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
                        d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
                    } else {
                        const angle = Math.atan2(dy, dx);
                        const move = (500 / dist) * (m.speed * p.cursorForce);
                        d.vx += Math.cos(angle) * -move;
                        d.vy += Math.sin(angle) * -move;
                    }
                } else if (isBulge) {
                    d.sx += (d.ax - d.sx) * 0.1;
                    d.sy += (d.ay - d.sy) * 0.1;
                }

                if (!isBulge) {
                    d.vx *= 0.9;
                    d.vy *= 0.9;
                    d.x = d.ax + d.vx;
                    d.y = d.ay + d.vy;
                    d.sx += (d.x - d.sx) * 0.1;
                    d.sy += (d.y - d.sy) * 0.1;
                }

                let drawX = d.sx;
                let drawY = d.sy;
                if (p.waveAmplitude > 0) {
                    drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
                    drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
                }

                if (p.sparkle) {
                    const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
                    if ((hash % 100) < 3) {
                        ctx.moveTo(drawX + rad * 1.8, drawY);
                        ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
                    } else {
                        ctx.moveTo(drawX + rad, drawY);
                        ctx.arc(drawX, drawY, rad, 0, TWO_PI);
                    }
                } else {
                    ctx.moveTo(drawX + rad, drawY);
                    ctx.arc(drawX, drawY, rad, 0, TWO_PI);
                }
            }

            ctx.fill();

            // Guarda de `prefers-reduced-motion` (agregada por el leader, ausente en el original
            // de react-bits): con reduced-motion no se vuelve a encolar `requestAnimationFrame` —
            // `tick()` se llama una única vez más abajo, produciendo un solo frame estático.
            if (!prefersReducedMotion) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        doResize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove, { passive: true });
        if (!prefersReducedMotion) {
            rafRef.current = requestAnimationFrame(tick);
        } else {
            tick(); // un solo frame estático, sin volver a encolar RAF (ver guarda arriba)
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            window.clearInterval(speedInterval);
            window.clearTimeout(resizeTimer);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [prefersReducedMotion]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                    <radialGradient id={glowId}>
                        <stop offset="0%" stopColor={glowColor} />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
                <circle ref={glowRef} cx={-9999} cy={-9999} r={glowRadius} fill={`url(#${glowId})`} style={{ opacity: 0, willChange: 'opacity' }} />
            </svg>
        </div>
    );
}
