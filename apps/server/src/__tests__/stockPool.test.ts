import { describe, it, expect } from 'vitest';
import { effectivePoints, fromPool, toPool } from '../utils/stockPool';

// UX-90: casos del digest con stock S = 5 (el stock INCLUYE el envase abierto).
const consume = (stock: number, level: number | undefined, used: number) =>
    fromPool(toPool(stock, level) - used);

describe('UX-90 — stockPool', () => {
    it('nuevo 100% (sin abierto)', () => {
        expect(consume(5, undefined, 100)).toEqual({ stock: 4 });
    });

    it('nuevo 30%: queda abierto al 70 y el stock lo incluye', () => {
        expect(consume(5, undefined, 30)).toEqual({ stock: 5, level: 70 });
    });

    it('abierto parcial (L=70), usa 20', () => {
        expect(consume(5, 70, 20)).toEqual({ stock: 5, level: 50 });
    });

    it('abierto completo (L=70), usa 70: recién ahí se descuenta 1', () => {
        expect(consume(5, 70, 70)).toEqual({ stock: 4 });
    });

    it('abierto completo + 30% de uno nuevo (L=70, U=100)', () => {
        expect(consume(5, 70, 100)).toEqual({ stock: 4, level: 70 });
    });

    it('sin abierto, quantity > 1 (U=250)', () => {
        expect(consume(5, undefined, 250)).toEqual({ stock: 3, level: 50 });
    });

    it('abierto L=70 + 2 envases enteros (U=270)', () => {
        expect(consume(5, 70, 270)).toEqual({ stock: 2 });
    });

    it('round-trip toPool/fromPool', () => {
        for (const [stock, level] of [[5, undefined], [5, 70], [1, 1], [3, 99], [0, undefined]] as const) {
            expect(toPool(fromPool(toPool(stock, level)).stock, fromPool(toPool(stock, level)).level)).toBe(toPool(stock, level));
        }
        expect(fromPool(0)).toEqual({ stock: 0 });
    });

    it('niveles 0 y 100 se canonizan a "sin abierto"; estado inválido se acota a 0', () => {
        expect(toPool(3, 0)).toBe(300);
        expect(toPool(3, 100)).toBe(300);
        expect(toPool(0, 40)).toBe(0);
    });

    it('effectivePoints: usedPercent manda; legacy usa quantity*100 o 0 si reutilizó abierto', () => {
        expect(effectivePoints({ quantity: 1, usedPercent: 30 })).toBe(30);
        expect(effectivePoints({ quantity: 2 })).toBe(200);
        expect(effectivePoints({ quantity: 1, usedExistingUnit: true })).toBe(0);
    });
});
