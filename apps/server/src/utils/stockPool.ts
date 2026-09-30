// UX-90: modelo de "pool de puntos" del inventario. 1 envase = 100 puntos (100%).
// Funciones puras (sin Express/Mongoose), todo en enteros: nunca se usa punto flotante.
//
// El stock INCLUYE el envase abierto (Opción B). El estado (stock S, currentUnitLevel L)
// es función 1:1 del pool P:
//   con abierto (L en 1..99): P = L + 100 * (S - 1)
//   sin abierto:              P = 100 * S
// Inversa: S' = ceil(P / 100); r = P mod 100; L' = r si r en 1..99, sin nivel si r == 0.

export const UNIT_POINTS = 100;

export interface StockState {
    stock: number;
    level?: number; // currentUnitLevel; undefined = no hay envase abierto
}

const hasOpenUnit = (level?: number | null): level is number =>
    level !== undefined && level !== null && level > 0 && level < UNIT_POINTS;

// Un nivel 0 (envase agotado) o 100 (abierto intacto) se canoniza a "sin abierto".
// Un estado inválido (nivel con stock 0, legacy pre-migración) se acota a 0 puntos.
export const toPool = (stock: number, level?: number | null): number => {
    if (!hasOpenUnit(level)) return UNIT_POINTS * stock;
    return Math.max(0, level + UNIT_POINTS * (stock - 1));
};

export const fromPool = (pool: number): StockState => {
    const stock = Math.ceil(pool / UNIT_POINTS);
    const remainder = pool % UNIT_POINTS;
    return remainder === 0 ? { stock } : { stock, level: remainder };
};

// Puntos efectivos que un item guardado de productsUsed consumió del pool.
// Registros legacy / clientes viejos (sin usedPercent): quantity envases enteros,
// salvo que el item reutilizara un envase ya abierto (no descontó nada).
export const effectivePoints = (item: { quantity: number; usedPercent?: number | null; usedExistingUnit?: boolean }): number => {
    if (item.usedPercent !== undefined && item.usedPercent !== null) return item.usedPercent;
    return item.usedExistingUnit === true ? 0 : Math.round(item.quantity * UNIT_POINTS);
};
