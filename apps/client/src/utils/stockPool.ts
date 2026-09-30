// UX-90: modelo de "pool de puntos" del inventario (1 envase = 100 puntos = 100%), enteros siempre.
// IMPORTANTE: mantener en sync con `apps/server/src/utils/stockPool.ts` (no hay código compartido entre apps).
//
// Opción A: `stock` cuenta SOLO envases cerrados (se descuenta 1 al abrir uno). `level`
// (Product.currentUnitLevel, 1..99) es el % del único envase abierto; ausente = no hay abierto.
//   Pool: P = 100 * stock + (level ?? 0).   Inversa: stock' = floor(P / 100); level' = P mod 100 (0 => sin abierto).
// Un producto con stock 0 y envase abierto es un estado válido y utilizable (P = level).

export const UNIT_POINTS = 100;

export interface StockState {
    stock: number;
    level?: number;
}

/** Nivel del envase abierto si es válido (1..99); undefined si no hay envase abierto. */
export const openLevelOf = (level?: number | null): number | undefined =>
    typeof level === 'number' && level > 0 && level < UNIT_POINTS ? level : undefined;

/** Pool disponible (puntos): cerrados * 100 + nivel del abierto (misma fórmula literal que el server). */
export const poolOf = (stock: number, level?: number | null): number => UNIT_POINTS * stock + (level ?? 0);

/** Inversa de `poolOf`: estado (cerrados, nivel del abierto) resultante de un pool dado. */
export const fromPool = (pool: number): StockState => {
    const stock = Math.floor(pool / UNIT_POINTS);
    const remainder = pool % UNIT_POINTS;
    return remainder === 0 ? { stock } : { stock, level: remainder };
};

/**
 * Tope de la barra de consumo: abierto (si hay) + `maxNewUnits` (k) envases NUEVOS (cerrados) a consumir,
 * nunca mayor al pool. `k` no numérico se trata como 1; negativo como 0 (sin abierto y k=0 => tope 0).
 */
export const maxUsable = (stock: number, level: number | null | undefined, maxNewUnits: number): number => {
    const k = Number.isFinite(maxNewUnits) ? Math.max(0, Math.floor(maxNewUnits)) : 1;
    return Math.min(poolOf(stock, level), (openLevelOf(level) ?? 0) + UNIT_POINTS * k);
};

/** Valor por defecto de la barra: terminar el abierto (L) o un envase entero (100). */
export const defaultUsed = (level?: number | null): number => openLevelOf(level) ?? UNIT_POINTS;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "N cerrados" + " + 1 abierto al X%" (si hay). Para selectores, listas y previews. */
export const formatStock = (stock: number, level?: number | null): string => {
    const open = openLevelOf(level);
    return `${plural(stock, 'cerrado', 'cerrados')}${open !== undefined ? ` + 1 abierto al ${open}%` : ''}`;
};

/** Texto explicativo del consumo `used` (puntos) sobre el envase abierto `level`. Sin floats. */
export const describeConsumption = (level: number | null | undefined, used: number): string => {
    const open = openLevelOf(level);
    const units = (n: number) => plural(n, 'envase completo', 'envases completos');
    if (open !== undefined) {
        if (used < open) return `Queda el envase abierto al ${open - used}%`;
        if (used === open) return 'Termina el envase abierto';
        const rest = used - open;
        const full = Math.floor(rest / UNIT_POINTS);
        const part = rest % UNIT_POINTS;
        const mid = full > 0 ? ` y consume ${units(full)}` : '';
        return `Termina el envase abierto${mid}${part > 0 ? ` y abre uno nuevo (queda ${UNIT_POINTS - part}%)` : ''}`;
    }
    if (used < UNIT_POINTS) return `Abre un envase nuevo (queda ${UNIT_POINTS - used}% en el abierto)`;
    const full = Math.floor(used / UNIT_POINTS);
    const part = used % UNIT_POINTS;
    return `Consume ${units(full)}${part > 0 ? ` y abre uno nuevo (queda ${UNIT_POINTS - part}%)` : ''}`;
};

/** Consumo corto de un item guardado: "N%" si tiene usedPercent; legacy: "xN" (quantity). */
export const formatUsedShort = (item: { usedPercent?: number | null; quantity?: number | null }): string =>
    typeof item.usedPercent === 'number' ? `${item.usedPercent}%` : `x${item.quantity ?? 0}`;

/** Puntos efectivos de un item guardado (mismo criterio que `effectivePoints` del server). */
export const effectiveUsed = (item: { usedPercent?: number | null; quantity?: number | null; usedExistingUnit?: boolean }): number =>
    typeof item.usedPercent === 'number'
        ? item.usedPercent
        : item.usedExistingUnit === true ? 0 : Math.round((item.quantity ?? 0) * UNIT_POINTS);
