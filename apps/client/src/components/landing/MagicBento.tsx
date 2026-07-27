import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { motion, animate } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';

// Puerto de la variante `MagicBento-JS-CSS` de react-bits (UX-47): spotlight global que sigue al
// mouse, glow de borde por card ligado a la proximidad del cursor, partículas al hover y ripple
// al click. La forma original depende de `gsap` — purgado del proyecto en UX-45 junto con three.js
// (docs/design.md §13.1) — así que cada `gsap.to`/`gsap.fromTo` se traduce a `animate()` de
// `motion` (ya instalado, ver `progress/implements/impl_UX-47.md` para el detalle de cada
// traducción) o a CSS puro cuando no hace falta ninguna librería (spotlight, glow de borde).
// `enableTilt`/`enableMagnetism` del componente original NO se portan (pedido explícito del
// usuario): no hay rotación 3D ni desplazamiento magnético acá.

const DEFAULT_SPOTLIGHT_RADIUS = 300;
const SPOTLIGHT_DIV_SIZE = 800;
const PARTICLE_SPAWN_STAGGER_MS = 100;

function calculateSpotlightValues(radius: number): { proximity: number; fadeDistance: number } {
    return { proximity: radius * 0.5, fadeDistance: radius * 0.75 };
}

function updateCardGlowProperties(card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number): void {
    const rect = card.getBoundingClientRect();
    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;
    card.style.setProperty('--glow-x', `${relativeX}%`);
    card.style.setProperty('--glow-y', `${relativeY}%`);
    card.style.setProperty('--glow-intensity', glow.toString());
    card.style.setProperty('--glow-radius', `${radius}px`);
}

function createParticleElement(x: number, y: number, color: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'magic-bento-particle';
    el.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: rgba(${color}, 1);
        box-shadow: 0 0 6px rgba(${color}, 0.6);
    `;
    return el;
}

// Hoja de estilos del efecto (CSS puro, sin animación): glow de borde vía `::after` enmascarado
// (mismo idiom que el original de react-bits) + partículas/ripple posicionados absolutamente +
// truncado de texto (`textAutoHide`, pedido explícito del usuario) vía `-webkit-line-clamp`, para
// que una descripción más larga que la actual nunca desborde la altura fija de una card chica.
function magicBentoStyles(glowColor: string): string {
    return `
.magic-bento-card {
    position: relative;
    --glow-color: ${glowColor};
    --glow-x: 50%;
    --glow-y: 50%;
    --glow-intensity: 0;
    --glow-radius: 200px;
}
.magic-bento-card::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 2px;
    background: radial-gradient(
        var(--glow-radius, 200px) circle at var(--glow-x, 50%) var(--glow-y, 50%),
        rgba(var(--glow-color), calc(var(--glow-intensity, 0) * 0.8)) 0%,
        rgba(var(--glow-color), calc(var(--glow-intensity, 0) * 0.4)) 30%,
        transparent 60%
    );
    border-radius: inherit;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
    transition: opacity 0.2s ease-out;
}
.magic-bento-particle {
    position: absolute;
    pointer-events: none;
    z-index: 100;
    border-radius: 50%;
}
.magic-bento-ripple {
    position: absolute;
    pointer-events: none;
    z-index: 0;
    border-radius: 50%;
    transform: scale(0);
}
.magic-bento-clamp-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;
}
`;
}

interface BentoSpotlightProps {
    sectionRef: RefObject<HTMLElement | null>;
    spotlightRadius?: number;
    glowColor: string;
    prefersReducedMotion: boolean;
}

/**
 * Spotlight global (UX-47): UN solo div `position: fixed` agregado a `document.body` (no por
 * card, mismo idiom que el original de react-bits), que sigue al mouse mientras esté dentro de la
 * sección de Funcionalidades. TRADUCCIÓN gsap→CSS: el `gsap.to(..., { duration: 0.1-0.5, ease:
 * 'power2.out' })` que suavizaba posición/opacidad se reemplaza por una `transition` CSS nativa
 * inline en el propio div — el navegador interpola `left`/`top`/`opacity` sin necesidad de
 * ninguna librería de animación (el `mousemove` ya dispara con la frecuencia nativa del
 * navegador, no hace falta ni `motion` acá). También actualiza `--glow-x`/`--glow-y`/
 * `--glow-intensity`/`--glow-radius` de cada `.magic-bento-card` dentro de la sección (asignación
 * directa vía `style.setProperty`, sin animar — el original tampoco animaba esta parte).
 */
export function BentoSpotlight({
    sectionRef, spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS, glowColor, prefersReducedMotion,
}: BentoSpotlightProps) {
    useEffect(() => {
        const section = sectionRef.current;
        if (!section || prefersReducedMotion) {
            return;
        }

        const spotlight = document.createElement('div');
        spotlight.setAttribute('aria-hidden', 'true');
        spotlight.style.cssText = `
            position: fixed;
            width: ${SPOTLIGHT_DIV_SIZE}px;
            height: ${SPOTLIGHT_DIV_SIZE}px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 200;
            mix-blend-mode: screen;
            background: radial-gradient(circle, rgba(${glowColor}, 0.15) 0%, rgba(${glowColor}, 0.08) 30%, transparent 70%);
            opacity: 0;
            left: 0px;
            top: 0px;
            transition: left 0.1s ease-out, top 0.1s ease-out, opacity 0.3s ease-out;
        `;
        document.body.appendChild(spotlight);

        const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
        const half = SPOTLIGHT_DIV_SIZE / 2;

        const handleMouseMove = (event: MouseEvent): void => {
            const rect = section.getBoundingClientRect();
            const isInside = event.clientX >= rect.left && event.clientX <= rect.right
                && event.clientY >= rect.top && event.clientY <= rect.bottom;

            const cards = section.querySelectorAll<HTMLElement>('.magic-bento-card');

            if (!isInside) {
                spotlight.style.opacity = '0';
                cards.forEach((card) => card.style.setProperty('--glow-intensity', '0'));
                return;
            }

            spotlight.style.left = `${event.clientX - half}px`;
            spotlight.style.top = `${event.clientY - half}px`;
            spotlight.style.opacity = '1';

            cards.forEach((card) => {
                const cardRect = card.getBoundingClientRect();
                const centerX = cardRect.left + cardRect.width / 2;
                const centerY = cardRect.top + cardRect.height / 2;
                const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY)
                    - Math.max(cardRect.width, cardRect.height) / 2;

                let glowIntensity = 0;
                if (distance <= proximity) {
                    glowIntensity = 1;
                } else if (distance <= fadeDistance) {
                    glowIntensity = (fadeDistance - distance) / (fadeDistance - proximity);
                }
                updateCardGlowProperties(card, event.clientX, event.clientY, glowIntensity, spotlightRadius);
            });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            spotlight.remove();
        };
    }, [sectionRef, spotlightRadius, glowColor, prefersReducedMotion]);

    // Con `prefersReducedMotion` el efecto de arriba nunca corre (spotlight/glow desactivados),
    // pero la hoja de estilos se monta igual: `--glow-intensity` queda en su default (0), así que
    // el `::after` de cada card no pinta nada — "estático/desactivado", nunca un error de CSS
    // variable indefinida.
    return <style>{magicBentoStyles(glowColor)}</style>;
}

interface UseMagicBentoCardOptions {
    prefersReducedMotion: boolean;
    glowColor: string;
    particleCount?: number;
    clickEffect?: boolean;
}

/**
 * Hook de partículas + ripple por card (UX-47). TRADUCCIÓN gsap→`motion` (versión instalada
 * 12.42.2, `animate()` reexportado desde `motion-dom` vía `motion/react`, soporta animar nodos
 * DOM directos igual que gsap):
 * - Spawn (`gsap.fromTo(scale 0→1, opacity 0→1, duration 0.3, ease 'back.out(1.7)')`) →
 *   `animate(el, { scale: [0, 1], opacity: [0, 1] }, { duration: 0.3, ease: 'backOut' })`.
 *   `motion-utils` expone `backOut`/`backIn` como claves de easing con overshoot ya calibrado
 *   (`cubicBezier(0.33, 1.53, 0.69, 0.99)`), equivalente directo de `'back.out(1.7)'` — no hizo
 *   falta armar un array de bezier a mano.
 * - Deriva infinita (`gsap.to(x/y aleatorios ±50, rotation, duration 2-4s, repeat:-1,
 *   yoyo:true)`) → `animate(el, { x: [0, driftX], y: [0, driftY], rotate: [0, rotation] }, {
 *   duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' })`. `repeatType:
 *   'mirror'` es el equivalente exacto de `yoyo:true` de gsap.
 * - Pulso de opacidad (`gsap.to(opacity 0.3, duration 1.5s, repeat:-1, yoyo:true)`) → mismo
 *   idiom: `animate(el, { opacity: [1, 0.3] }, { duration: 1.5, repeat: Infinity, repeatType:
 *   'mirror' })`.
 * - Salida al `mouseleave` (`gsap.to(scale:0/opacity:0, duration 0.3, ease 'back.in(1.7)',
 *   onComplete: remove)`) → `animate(el, { scale: 0, opacity: 0 }, { duration: 0.3, ease:
 *   'backIn' }).then(() => el.remove())` — `AnimationPlaybackControlsWithThen` (motion-dom)
 *   expone `.then()`, reemplazo directo del callback `onComplete` de gsap.
 * - Ripple de click (`gsap.fromTo(scale 0→1, opacity 1→0, duration 0.8, ease 'power2.out')`) →
 *   `animate(el, { scale: [0, 1], opacity: [1, 0] }, { duration: 0.8, ease: 'easeOut' })` —
 *   `'power2.out'` de gsap no tiene nombre propio en `motion`, pero `'easeOut'`
 *   (`cubicBezier(0, 0, 0.58, 1)`) es la curva estándar de desaceleración de la librería y
 *   produce un resultado visualmente equivalente sin necesitar un array de bezier a medida.
 */
function useMagicBentoCard(cardRef: RefObject<HTMLDivElement | null>, options: UseMagicBentoCardOptions): void {
    const { prefersReducedMotion, glowColor, particleCount = 12, clickEffect = true } = options;

    useEffect(() => {
        const card = cardRef.current;
        if (!card || prefersReducedMotion) {
            return;
        }

        let particles: HTMLDivElement[] = [];
        let timeouts: number[] = [];

        const spawnParticle = (): void => {
            const rect = card.getBoundingClientRect();
            const x = Math.random() * rect.width;
            const y = Math.random() * rect.height;
            const el = createParticleElement(x, y, glowColor);
            card.appendChild(el);
            particles.push(el);

            animate(el, { scale: [0, 1], opacity: [0, 1] }, { duration: 0.3, ease: 'backOut' });

            const driftX = (Math.random() - 0.5) * 100;
            const driftY = (Math.random() - 0.5) * 100;
            const rotation = Math.random() * 360;
            animate(el, { x: [0, driftX], y: [0, driftY], rotate: [0, rotation] }, {
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
            });
            animate(el, { opacity: [1, 0.3] }, {
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
            });
        };

        const clearParticles = (): void => {
            timeouts.forEach((t) => window.clearTimeout(t));
            timeouts = [];
            const toRemove = particles;
            particles = [];
            toRemove.forEach((el) => {
                animate(el, { scale: 0, opacity: 0 }, { duration: 0.3, ease: 'backIn' }).then(() => el.remove());
            });
        };

        const handleMouseEnter = (): void => {
            for (let i = 0; i < particleCount; i++) {
                timeouts.push(window.setTimeout(spawnParticle, i * PARTICLE_SPAWN_STAGGER_MS));
            }
        };

        const handleMouseLeave = (): void => {
            clearParticles();
        };

        const handleClick = (event: MouseEvent): void => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const corners: [number, number][] = [[0, 0], [rect.width, 0], [0, rect.height], [rect.width, rect.height]];
            const maxDist = Math.max(...corners.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));

            const ripple = document.createElement('div');
            ripple.className = 'magic-bento-ripple';
            ripple.style.cssText = `
                left: ${x - maxDist}px;
                top: ${y - maxDist}px;
                width: ${maxDist * 2}px;
                height: ${maxDist * 2}px;
                background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
            `;
            card.appendChild(ripple);
            animate(ripple, { scale: [0, 1], opacity: [1, 0] }, { duration: 0.8, ease: 'easeOut' }).then(() => ripple.remove());
        };

        card.addEventListener('mouseenter', handleMouseEnter);
        card.addEventListener('mouseleave', handleMouseLeave);
        if (clickEffect) {
            card.addEventListener('click', handleClick);
        }

        return () => {
            card.removeEventListener('mouseenter', handleMouseEnter);
            card.removeEventListener('mouseleave', handleMouseLeave);
            if (clickEffect) {
                card.removeEventListener('click', handleClick);
            }
            // Cleanup de desmontaje: no hace falta reproducir la animación de salida (el propio
            // nodo `card` está por desaparecer con el resto del árbol de React) — solo cancelar
            // timeouts pendientes y remover del DOM lo que ya se haya alcanzado a crear.
            timeouts.forEach((t) => window.clearTimeout(t));
            particles.forEach((el) => el.remove());
            particles = [];
        };
    }, [cardRef, prefersReducedMotion, glowColor, particleCount, clickEffect]);
}

interface MagicBentoCardProps extends HTMLMotionProps<'div'> {
    glowColor: string;
    particleCount?: number;
    clickEffect?: boolean;
    prefersReducedMotion: boolean;
}

/**
 * Wrapper de card (UX-47): envuelve el `motion.div` YA existente en el bento grid de
 * Funcionalidades sin reemplazar su contenido — agrega el `ref` interno que necesitan el glow de
 * borde (clase `magic-bento-card`, leída por `BentoSpotlight` vía `querySelectorAll`) y el
 * hover/click de partículas y ripple. Todas las props de `motion.div` que ya tenía la card
 * (`initial`/`whileInView`/`viewport`/`transition`/`whileHover` — el `whileHover` de scale+shadow
 * ya aprobado en `docs/design.md §13.1` incluido) se reenvían intactas vía spread: este
 * componente no las conoce ni las modifica, solo agrega el `ref` y la clase.
 */
export function MagicBentoCard({
    glowColor, particleCount = 12, clickEffect = true, prefersReducedMotion, className = '', ...motionProps
}: MagicBentoCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    useMagicBentoCard(cardRef, { prefersReducedMotion, glowColor, particleCount, clickEffect });

    return (
        <motion.div
            ref={cardRef}
            className={`magic-bento-card ${className}`}
            {...motionProps}
        />
    );
}
