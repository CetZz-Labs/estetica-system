// UX-90: modelo de "pool de puntos" del inventario. 1 envase = 100 puntos (100%).
// Funciones puras (sin Express/Mongoose), todo en enteros: nunca se usa punto flotante.
//
// `stock` cuenta SOLO envases cerrados (se descuenta 1 al abrir uno). `currentUnitLevel` (L, 1..99)
// es el % que queda del único envase abierto; ausente = no hay abierto (L = 0).
//   Pool: P = L + 100 * S.
// Inversa: S' = floor(P / 100); L' = P mod 100 (0 => sin abierto).
// Un producto con stock 0 y envase abierto es un estado válido (P = L).

export const UNIT_POINTS = 100;

export interface StockState {
    stock: number;
    level?: number; // currentUnitLevel; undefined = no hay envase abierto
}

export const toPool = (stock: number, level?: number | null): number =>
    UNIT_POINTS * stock + (level ?? 0);

export const fromPool = (pool: number): StockState => {
    const stock = Math.floor(pool / UNIT_POINTS);
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
