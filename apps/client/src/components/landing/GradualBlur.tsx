import type { CSSProperties } from 'react';

export type GradualBlurPosition = 'top' | 'bottom' | 'left' | 'right';
export type GradualBlurCurve = 'linear' | 'bezier';

interface Props {
    /** Única variante soportada por ahora (contenedor posicionado `relative` más cercano) — se
     * mantiene la prop por paridad de API con el componente original de react-bits. */
    target?: 'parent';
    position?: GradualBlurPosition;
    /** Grosor de la banda de blur (CSS length, ej. `'6rem'`). */
    height?: string;
    /** Multiplicador del blur máximo alcanzado en la capa más cercana al borde. */
    strength?: number;
    divCount?: number;
    curve?: GradualBlurCurve;
    /** Si es `true`, el crecimiento del blur entre capas usa una curva `easeInExpo` (lento al
     * inicio, muy rápido cerca del borde) en vez de la curva `smoothstep` de `curve="bezier"`. */
    exponential?: boolean;
    /** Opacidad global del efecto completo. */
    opacity?: number;
    className?: string;
}

const BLUR_UNIT_PX = 12;

function easeProgress(t: number, curve: GradualBlurCurve, exponential: boolean): number {
    if (exponential) {
        // easeInExpo clásico — sin librería de easing: crecimiento casi nulo hasta acercarse al
        // final de la curva, donde se dispara. Aproxima "curve=bezier + exponential" del pedido
        // original (react-bits): la intensidad de blur entre capas no es lineal, crece mucho más
        // rápido cerca del borde objetivo.
        return t <= 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }
    if (curve === 'bezier') {
        // Aproximación de una curva de Bézier cúbica ease-in-out (smoothstep) sin resolver una
        // Bézier real — suficiente para un efecto puramente decorativo y estático.
        return t * t * (3 - 2 * t);
    }
    return t;
}

const gradientDirectionByPosition: Record<GradualBlurPosition, string> = {
    top: 'to top',
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right',
};

function getContainerStyle(position: GradualBlurPosition, height: string): CSSProperties {
    switch (position) {
        case 'top':
            return { top: 0, left: 0, right: 0, height };
        case 'left':
            return { top: 0, bottom: 0, left: 0, width: height };
        case 'right':
            return { top: 0, bottom: 0, right: 0, width: height };
        case 'bottom':
        default:
            return { bottom: 0, left: 0, right: 0, height };
    }
}

/**
 * GradualBlur (UX-53): puerto local del componente homónimo de react-bits — mismo criterio ya
 * usado en el proyecto para Silk/DotField/MagicBento (reimplementación propia, cero dependencia
 * nueva instalada). Apila `divCount` capas `absolute` sobre uno de los bordes del contenedor
 * padre más cercano (acá se usa `position="bottom"`, único caso real de la Landing). Cada capa:
 * - Aplica `backdrop-filter: blur()` con un radio creciente según `easeProgress` (curva
 *   `bezier`/`exponential` configurable): la capa más cercana al borde objetivo concentra el
 *   blur máximo, las capas más alejadas casi no aportan blur.
 * - Limita su visibilidad a una banda propia vía `mask-image: linear-gradient(...)` con bordes
 *   SUAVES (`transparent` → `black`, nunca un corte duro de opacidad). Importante: este
 *   gradiente vive ÚNICAMENTE en `mask-image`/`-webkit-mask-image` — nunca en `background`/
 *   `backgroundImage` — por lo que no produce ninguna transición de color visible, solo controla
 *   cuánta blur se percibe en cada banda (ver docs/design.md §13.1, excepción puntual UX-53).
 *
 * Las bandas de capas sucesivas se solapan a propósito (cada banda cubre `[t - 1/divCount,
 * t + 1/divCount]` de la banda total) para que, cerca del borde objetivo, todas las capas queden
 * opacas y sus blurs se acumulen (blur total máximo), mientras que lejos del borde solo las capas
 * de menor índice (blur casi nulo) están activas — el blur total percibido crece de forma
 * gradual en vez de saltar en escalones perceptibles.
 *
 * Es un efecto puramente estático (no depende de scroll, mouse ni tiempo): no requiere ninguna
 * guarda de `prefers-reduced-motion`, porque no hay ninguna animación que desactivar.
 */
export default function GradualBlur({
    target = 'parent',
    position = 'bottom',
    height = '6rem',
    strength = 1,
    divCount = 5,
    curve = 'bezier',
    exponential = false,
    opacity = 1,
    className = '',
}: Props) {
    void target;

    const gradientDirection = gradientDirectionByPosition[position];
    const containerStyle = getContainerStyle(position, height);

    return (
        <div
            aria-hidden="true"
            className={`absolute pointer-events-none ${className}`}
            style={{ ...containerStyle, opacity }}
        >
            {Array.from({ length: divCount }, (_, i) => {
                const t = divCount === 1 ? 1 : i / (divCount - 1);
                const eased = easeProgress(t, curve, exponential);
                const blurPx = eased * strength * BLUR_UNIT_PX;
                const bandStart = Math.max(0, (t - 1 / divCount) * 100);
                const bandEnd = Math.min(100, (t + 1 / divCount) * 100);
                const maskImage = `linear-gradient(${gradientDirection}, transparent ${bandStart}%, black ${bandEnd}%)`;

                return (
                    <div
                        key={i}
                        className="absolute inset-0"
                        style={{
                            backdropFilter: `blur(${blurPx.toFixed(2)}px)`,
                            WebkitBackdropFilter: `blur(${blurPx.toFixed(2)}px)`,
                            maskImage,
                            WebkitMaskImage: maskImage,
                        }}
                    />
                );
            })}
        </div>
    );
}
