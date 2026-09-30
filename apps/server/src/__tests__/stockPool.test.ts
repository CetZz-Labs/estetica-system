import { describe, it, expect } from 'vitest';
import { effectivePoints, fromPool, toPool } from '../utils/stockPool';

// UX-90 (Opción A): casos con S = 5 envases CERRADOS; currentUnitLevel = % del envase abierto.
const consume = (stock: number, level: number | undefined, used: number) =>
    fromPool(toPool(stock, level) - used);

describe('UX-90 — stockPool', () => {
    it('sin abierto, 100%: baja 1 envase cerrado', () => {
        expect(consume(5, undefined, 100)).toEqual({ stock: 4 });
    });

    it('sin abierto, 30%: se abre uno (stock-1) y queda al 70', () => {
        expect(consume(5, undefined, 30)).toEqual({ stock: 4, level: 70 });
    });

    it('abierto parcial (L=70), usa 20: el stock no cambia', () => {
        expect(consume(5, 70, 20)).toEqual({ stock: 5, level: 50 });
    });

    it('abierto completo (L=70), usa 70: el stock NO cambia y no queda abierto', () => {
        expect(consume(5, 70, 70)).toEqual({ stock: 5 });
    });

    it('abierto completo + 30% de uno nuevo (L=70, U=100)', () => {
        expect(consume(5, 70, 100)).toEqual({ stock: 4, level: 70 });
    });

    it('sin abierto, quantity > 1 (U=250)', () => {
        expect(consume(5, undefined, 250)).toEqual({ stock: 2, level: 50 });
    });

    it('abierto L=70 + 2 envases enteros (U=270)', () => {
        expect(consume(5, 70, 270)).toEqual({ stock: 3 });
    });

    it('stock 0 con abierto es válido: P = L', () => {
        expect(toPool(0, 40)).toBe(40);
        expect(consume(0, 40, 15)).toEqual({ stock: 0, level: 25 });
        expect(consume(0, 40, 40)).toEqual({ stock: 0 });
    });

    it('round-trip toPool/fromPool', () => {
        for (const [stock, level] of [[5, undefined], [5, 70], [1, 1], [3, 99], [0, undefined], [0, 40]] as const) {
            const back = fromPool(toPool(stock, level));
            expect(back).toEqual(level === undefined ? { stock } : { stock, level });
        }
        expect(fromPool(0)).toEqual({ stock: 0 });
    });

    it('effectivePoints: usedPercent manda; legacy usa quantity*100 o 0 si reutilizó abierto', () => {
        expect(effectivePoints({ quantity: 1, usedPercent: 30 })).toBe(30);
        expect(effectivePoints({ quantity: 2 })).toBe(200);
        expect(effectivePoints({ quantity: 1, usedExistingUnit: true })).toBe(0);
    });
});
