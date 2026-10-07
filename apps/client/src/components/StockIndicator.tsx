import { FiDroplet } from 'react-icons/fi';

import type { Product } from '../types';

/**
 * Tono Trifecta para el indicador "en vivo" de `currentUnitLevel` (UX-81): informativo,
 * no participa del control de stock. Umbrales alineados a los tokens de estado
 * (sage = buen nivel, gold = medio, alert = crítico).
 */
const getUnitLevelTone = (level: number): { badgeText: string; barFill: string } => {
    if (level > 50) return { badgeText: 'text-sage-text', barFill: 'bg-sage' };
    if (level >= 20) return { badgeText: 'text-gold-text', barFill: 'bg-gold' };
    return { badgeText: 'text-alert-text', barFill: 'bg-alert-text' };
};

interface Props {
    product: Pick<Product, 'currentUnitLevel'>;
    className?: string;
}

/** Badge + barra del envase abierto. No renderiza nada si el producto no tiene nivel. */
export default function StockIndicator({ product, className = '' }: Props) {
    const level = product.currentUnitLevel;
    if (typeof level !== 'number') return null;
    const tone = getUnitLevelTone(level);

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${tone.badgeText}`}>
                <FiDroplet aria-hidden size={11} className="shrink-0" />
                <span className="break-words">Envase abierto: {level}%</span>
            </span>
            <div
                className="w-full max-w-[160px] sm:w-16 h-1 rounded-pill bg-dotted overflow-hidden"
                role="progressbar"
                aria-valuenow={level}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Nivel del envase abierto: ${level}%`}
            >
                <div className={`h-full rounded-pill ${tone.barFill}`} style={{ width: `${level}%` }} />
            </div>
        </div>
    );
}
