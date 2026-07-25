import type { IconType } from 'react-icons';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Wrapper de animación perpetua para íconos de `react-icons` (UX-45-fix2, punto 1): reemplaza
 * los 5 SVG dibujados a mano de la ronda anterior (ver historial en git) por íconos YA HECHOS
 * de un set establecido — se eligió `react-icons/pi` (Phosphor), variante `Duotone`, que rellena
 * el ícono con dos capas de opacidad (trazo sólido + relleno tenue) en vez de solo líneas finas
 * como Feather (`react-icons/fi`, usado en el resto de la app) — más "peso"/impacto visual,
 * pedido explícito del usuario tras probar los SVG a medida en navegador, sin salirse de la
 * calidez/minimalismo Shear (siguen siendo monocromáticos vía `currentColor`, mismo esquema de
 * tinte `sectionTints` que ya usaba cada card).
 *
 * Alcance sin cambios respecto a la ronda anterior: solo `heroStatCards` y Stats/"Impacto" de
 * `views/Landing.tsx`. Funcionalidades sigue con `react-icons/fi`, fuera de este pedido.
 *
 * El ícono se inyecta por prop (`icon`, cualquier `IconType` de `react-icons`) — el wrapper solo
 * aporta el loop de animación perpetua (no solo hover) + el respeto de `prefers-reduced-motion`
 * (congela el ícono en su frame de reposo sin transición), quedando reutilizable para cualquier
 * ícono futuro sin duplicar la lógica de `motion`.
 */
export type StatIconAnimation = 'rotate' | 'pulse' | 'float';

interface AnimatedStatIconProps {
    icon: IconType;
    /** Tipo de loop: `rotate` (oscilación de ángulo, temas de tiempo/reloj), `pulse` (escala,
     * temas de crecimiento/personas) o `float` (desplazamiento vertical sutil, temas de
     * datos/disponibilidad). Elegido por card según qué mejor calce temáticamente. */
    animation?: StatIconAnimation;
    size?: number;
    className?: string;
    duration?: number;
    delay?: number;
}

const animationKeyframes: Record<StatIconAnimation, Record<string, number[]>> = {
    rotate: { rotate: [-7, 7, -7] },
    pulse: { scale: [1, 1.12, 1] },
    float: { y: [0, -5, 0] },
};

export default function AnimatedStatIcon({
    icon: Icon,
    animation = 'pulse',
    size = 32,
    className = '',
    duration = 2.6,
    delay = 0,
}: AnimatedStatIconProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <motion.div
            className="inline-flex"
            style={{ transformOrigin: 'center' }}
            animate={prefersReducedMotion ? undefined : animationKeyframes[animation]}
            transition={prefersReducedMotion ? undefined : {
                duration, delay, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut',
            }}
        >
            <Icon size={size} className={className} aria-hidden="true" />
        </motion.div>
    );
}
