import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

// Referencia mínima estructural (no importa el tipo exacto de React 19 `RefObject`/
// `MutableRefObject`, unificados) — solo necesitamos leer `.current` como HTMLElement|null.
interface ElementRef {
    current: HTMLElement | null;
}

function useResizeObserver(callback: () => void, elements: ElementRef[], dependencies: unknown[]): void {
    useEffect(() => {
        if (!window.ResizeObserver) {
            const handleResize = (): void => callback();
            window.addEventListener('resize', handleResize);
            callback();
            return () => window.removeEventListener('resize', handleResize);
        }
        const observers = elements.map((ref) => {
            if (!ref.current) {
                return null;
            }
            const observer = new ResizeObserver(callback);
            observer.observe(ref.current);
            return observer;
        });
        callback();
        return () => { observers.forEach((observer) => observer?.disconnect()); };
        // Réplica exacta del original de react-bits: `dependencies` viaja como un único elemento
        // del array de deps (no spreadeado) — un array nuevo en cada render de la vista llamante
        // (`[items, gap]`) dispara el efecto en cada render, comportamiento intencional del
        // componente original, no un bug de este puerto.
    }, [callback, elements, dependencies]);
}

function useAnimationLoop(
    trackRef: ElementRef,
    targetVelocity: number,
    seqWidth: number,
    isHovered: boolean,
    hoverSpeed: number | undefined,
    prefersReducedMotion: boolean,
): void {
    const rafRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const offsetRef = useRef<number>(0);
    const velocityRef = useRef<number>(0);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }
        const seqSize = seqWidth;

        if (seqSize > 0) {
            offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize;
            track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
        }

        // Guarda de `prefers-reduced-motion` (hallazgo del reviewer, UX-46-fix): a diferencia de
        // `targetVelocity` (que solo converge asintóticamente hacia 0 vía el easing exponencial de
        // `animate`, sin llegar nunca a ser exactamente 0), acá se corta el efecto ANTES de
        // encolar cualquier `requestAnimationFrame` — mismo patrón exacto que `Silk.tsx`/
        // `DotField.tsx` (docs/patterns-frontend.md §P15): con reduced-motion, nunca se vuelve a
        // llamar RAF. El track ya quedó en su posición estática (offset actual, típicamente 0)
        // por el `track.style.transform` de arriba, así que no hace falta ni un frame de dibujo.
        if (prefersReducedMotion) {
            return;
        }

        const animate = (timestamp: number): void => {
            if (lastTimestampRef.current === null) {
                lastTimestampRef.current = timestamp;
            }
            const deltaTime = Math.max(0, timestamp - lastTimestampRef.current) / 1000;
            lastTimestampRef.current = timestamp;

            const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;
            const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
            velocityRef.current += (target - velocityRef.current) * easingFactor;

            if (seqSize > 0) {
                let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
                nextOffset = ((nextOffset % seqSize) + seqSize) % seqSize;
                offsetRef.current = nextOffset;
                track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
            }
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            lastTimestampRef.current = null;
        };
    }, [targetVelocity, seqWidth, isHovered, hoverSpeed, trackRef, prefersReducedMotion]);
}

interface LogoLoopProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    speed?: number;
    direction?: 'left' | 'right';
    gap?: number;
    fadeOut?: boolean;
    /** Color sólido desde el que arranca el fade (fade-to-transparent de UN tono, no una
     * transición entre 2 colores — mismo idiom aceptado para blur/opacity en docs/design.md
     * §13.1, UX-39). Ver nota junto al punto de montaje en `TrustMarquee` (Landing.tsx). */
    fadeOutColor?: string;
    ariaLabel?: string;
    className?: string;
    prefersReducedMotion?: boolean;
}

function LogoLoopComponent<T>({
    items,
    renderItem,
    speed = 40,
    direction = 'left',
    gap = 32,
    fadeOut = false,
    fadeOutColor,
    ariaLabel = 'Contenido en loop',
    className,
    prefersReducedMotion = false,
}: LogoLoopProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const seqRef = useRef<HTMLUListElement>(null);
    const [seqWidth, setSeqWidth] = useState<number>(0);
    const [copyCount, setCopyCount] = useState<number>(ANIMATION_CONFIG.MIN_COPIES);
    const fadeId = useId().replace(/[^a-zA-Z0-9]/g, '');
    const fadeClass = `logoloop-fade-${fadeId}`;

    const targetVelocity = useMemo<number>(() => {
        const magnitude = prefersReducedMotion ? 0 : Math.abs(speed);
        const directionMultiplier = direction === 'left' ? 1 : -1;
        return magnitude * directionMultiplier;
    }, [speed, direction, prefersReducedMotion]);

    const updateDimensions = useCallback((): void => {
        const containerWidth = containerRef.current?.clientWidth ?? 0;
        const sequenceWidth = seqRef.current?.getBoundingClientRect().width ?? 0;
        if (sequenceWidth > 0) {
            setSeqWidth(Math.ceil(sequenceWidth));
            const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
            setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
        }
    }, []);

    useResizeObserver(updateDimensions, [containerRef, seqRef], [items, gap]);
    useAnimationLoop(trackRef, targetVelocity, seqWidth, false, undefined, prefersReducedMotion);

    const cssVariables = useMemo<CSSProperties>(() => {
        const vars: Record<string, string> = { '--logoloop-gap': `${gap}px` };
        if (fadeOutColor) {
            vars['--logoloop-fadeColor'] = fadeOutColor;
        }
        return vars as CSSProperties;
    }, [gap, fadeOutColor]);

    const rootClassName = ['relative', 'overflow-hidden', fadeOut && fadeClass, className].filter(Boolean).join(' ');

    const lists = useMemo(() => Array.from({ length: copyCount }, (_, copyIndex) => (
        <ul className="flex items-center" key={`copy-${copyIndex}`} role="list" aria-hidden={copyIndex > 0} ref={copyIndex === 0 ? seqRef : undefined}>
            {items.map((item, itemIndex) => (
                <li className="shrink-0" key={`${copyIndex}-${itemIndex}`} style={{ marginRight: gap }} role="listitem">
                    {renderItem(item, itemIndex)}
                </li>
            ))}
        </ul>
    )), [copyCount, items, renderItem, gap]);

    return (
        <div ref={containerRef} className={rootClassName} style={cssVariables} role="region" aria-label={ariaLabel}>
            {fadeOut && (
                <style>{`
                    .${fadeClass}::before, .${fadeClass}::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        width: 60px;
                        z-index: 1;
                        pointer-events: none;
                    }
                    .${fadeClass}::before {
                        left: 0;
                        background: linear-gradient(to right, var(--logoloop-fadeColor, ${fadeOutColor ?? '#fff'}) 0%, transparent 100%);
                    }
                    .${fadeClass}::after {
                        right: 0;
                        background: linear-gradient(to left, var(--logoloop-fadeColor, ${fadeOutColor ?? '#fff'}) 0%, transparent 100%);
                    }
                `}</style>
            )}
            <div className="flex w-max" ref={trackRef}>
                {lists}
            </div>
        </div>
    );
}

// Nota de puerto: el original de react-bits envuelve el componente en `memo()`. Acá se omite
// deliberadamente — `memo()` sobre un componente genérico (`<T>`) le hace perder los genéricos de
// TS a menos que se recaste el resultado con un `as typeof LogoLoopComponent`, superficie de bug
// innecesaria para un componente que se monta una sola vez en toda la Landing (`TrustMarquee`,
// lista de 6 ítems fija) — no hay re-renders frecuentes del padre que justifiquen el memo.
const LogoLoop = LogoLoopComponent;

export default LogoLoop;
