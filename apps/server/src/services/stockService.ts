import { Types } from 'mongoose';
import { Product } from '../models/Product';
import { UNIT_POINTS, effectivePoints, fromPool, toPool } from '../utils/stockPool';

// UX-90: lógica de stock por pool de puntos, sin Request/Response, SIEMPRE tenant-scoped.
// La usan createServiceRecord, updateServiceRecord, deleteServiceRecord y completeAppointment.

export class StockError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export interface ConsumptionInput {
    product: string | Types.ObjectId;
    usedPercent?: number;
    quantity?: number;
}

export interface NormalizedConsumption {
    product: string;
    points: number;
}

export interface StoredConsumption {
    product: Types.ObjectId | string;
    quantity: number;
    usedPercent?: number;
    usedExistingUnit?: boolean;
}

interface Change {
    product: string;
    oldEff: number; // puntos que la versión previa de la visita ya había consumido
    newEff: number; // puntos que consumirá la versión nueva
}

export interface ProductOutcome {
    hadOpen: boolean;
    levelAfter: number; // 0 si no queda envase abierto
}

export type MissingPolicy = 'notFound' | 'invalid' | 'ignore';

interface Level {
    stock: number;
    level?: number;
}

const MAX_ATTEMPTS = 3;

// Valida el body: entero >= 1 por item, sin duplicados. Solo lectura.
export const normalizeConsumption = (items: ConsumptionInput[]): NormalizedConsumption[] => {
    const seen = new Set<string>();
    return items.map((item) => {
        const id = String(item.product);
        if (seen.has(id)) throw new StockError(400, 'Producto duplicado en la lista de insumos');
        seen.add(id);

        let points: number;
        if (item.usedPercent !== undefined && item.usedPercent !== null) {
            points = Number(item.usedPercent);
        } else if (item.quantity !== undefined && item.quantity !== null) {
            points = Math.round(Number(item.quantity) * UNIT_POINTS);
        } else {
            throw new StockError(400, 'Cada insumo requiere usedPercent o quantity');
        }
        if (!Number.isInteger(points) || points < 1) {
            throw new StockError(400, 'El consumo de cada insumo debe ser un entero mayor o igual a 1');
        }
        return { product: id, points };
    });
};

const fmtUnits = (points: number): string => `${Number((points / UNIT_POINTS).toFixed(2))} envases`;

// Núcleo: reconcilia el pool de cada producto (oldEff -> newEff).
// Validación pura primero (existencia + suficiencia), luego escritura condicionada por
// { _id, tenantId, stock, currentUnitLevel } leídos. Si otro request cambió el producto
// entre la lectura y la escritura, se revierte lo ya aplicado (mejor esfuerzo) y se reintenta.
const reconcile = async (
    tenantId: string | Types.ObjectId,
    changes: Change[],
    missing: MissingPolicy
): Promise<Map<string, ProductOutcome>> => {
    // Defensa anti fuga multi-tenant: un filtro con tenantId undefined podría ser descartado.
    if (!tenantId) throw new Error('stockService: tenantId es obligatorio');
    const outcomes = new Map<string, ProductOutcome>();
    if (changes.length === 0) return outcomes;
    const ids = changes.map((c) => c.product);

    const write = async (id: string, from: Level, to: Level) => {
        const res = await Product.updateOne(
            // currentUnitLevel: null matchea campo inexistente o null
            { _id: id, tenantId, stock: from.stock, currentUnitLevel: from.level ?? null },
            to.level === undefined
                ? { $set: { stock: to.stock }, $unset: { currentUnitLevel: '' } }
                : { $set: { stock: to.stock, currentUnitLevel: to.level } }
        );
        return res.matchedCount === 1;
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        outcomes.clear();
        // Sin filtrar isActive: un producto dado de baja sigue siendo válido para restaurar/ajustar.
        const products = await Product.find({ _id: { $in: ids }, tenantId });
        const byId = new Map(products.map((p) => [p._id.toString(), p]));

        const plan: { id: string; before: Level; after: Level }[] = [];
        for (const change of changes) {
            const product = byId.get(change.product);
            if (!product) {
                if (missing === 'notFound') throw new StockError(404, `Producto con ID ${change.product} no encontrado`);
                if (missing === 'invalid') throw new StockError(400, 'Uno o más insumos no son válidos para este negocio');
                continue; // 'ignore': producto huérfano (UX-72)
            }
            const poolBefore = toPool(product.stock, product.currentUnitLevel) + change.oldEff; // pool previo a esta visita
            const poolAfter = poolBefore - change.newEff;
            if (poolAfter < 0) {
                throw new StockError(400, `Stock insuficiente para ${product.name}. Disponible: ${fmtUnits(poolBefore)}, Requerido: ${fmtUnits(change.newEff)}`);
            }
            const after = fromPool(poolAfter);
            outcomes.set(change.product, { hadOpen: poolBefore % UNIT_POINTS !== 0, levelAfter: after.level ?? 0 });
            const level = product.currentUnitLevel ?? undefined;
            if (after.stock !== product.stock || after.level !== level) {
                plan.push({ id: change.product, before: { stock: product.stock, level }, after });
            }
        }

        const applied: typeof plan = [];
        let conflict = false;
        for (const step of plan) {
            if (await write(step.id, step.before, step.after)) {
                applied.push(step);
            } else {
                conflict = true;
                break;
            }
        }
        if (!conflict) return outcomes;

        // Rollback best-effort: no hay transacciones multi-documento sin replica set.
        for (const step of applied) await write(step.id, step.after, step.before);
    }
    throw new StockError(409, 'El stock cambió mientras se guardaba la visita. Volvé a intentarlo.');
};

// quantity / remainingLevel / usedExistingUnit son derivados: el server ignora lo que envíe el cliente.
const toStoredItems = (normalized: NormalizedConsumption[], outcomes: Map<string, ProductOutcome>) =>
    normalized.map((n) => ({
        product: n.product,
        quantity: Math.ceil(n.points / UNIT_POINTS),
        usedPercent: n.points,
        remainingLevel: outcomes.get(n.product)?.levelAfter ?? 0,
        usedExistingUnit: outcomes.get(n.product)?.hadOpen ?? false,
    }));

const sumEffective = (items: StoredConsumption[]): Map<string, number> => {
    const map = new Map<string, number>();
    for (const item of items) {
        const id = item.product.toString();
        map.set(id, (map.get(id) ?? 0) + effectivePoints(item));
    }
    return map;
};

// Create / complete: descuenta y devuelve los items a persistir (campos derivados por el server).
export const consumeProducts = async (tenantId: string | Types.ObjectId, items: ConsumptionInput[]) => {
    const normalized = normalizeConsumption(items);
    const outcomes = await reconcile(
        tenantId,
        normalized.map((n) => ({ product: n.product, oldEff: 0, newEff: n.points })),
        'notFound'
    );
    return toStoredItems(normalized, outcomes);
};

// Update: reconcilia contra los items previos del registro. Devuelve los items nuevos a persistir.
export const reconcileProducts = async (
    tenantId: string | Types.ObjectId,
    oldItems: StoredConsumption[],
    newItems: ConsumptionInput[]
) => {
    const normalized = normalizeConsumption(newItems);
    const oldEff = sumEffective(oldItems);
    const newEff = new Map(normalized.map((n) => [n.product, n.points]));
    const union = [...new Set([...oldEff.keys(), ...newEff.keys()])];
    const outcomes = await reconcile(
        tenantId,
        union.map((product) => ({ product, oldEff: oldEff.get(product) ?? 0, newEff: newEff.get(product) ?? 0 })),
        'invalid'
    );
    return toStoredItems(normalized, outcomes);
};

// Delete: devuelve al pool los puntos de cada item; productos huérfanos se ignoran (UX-72).
export const restoreProducts = async (tenantId: string | Types.ObjectId, oldItems: StoredConsumption[]): Promise<void> => {
    const changes = [...sumEffective(oldItems)]
        .filter(([, eff]) => eff > 0)
        .map(([product, eff]) => ({ product, oldEff: eff, newEff: 0 }));
    await reconcile(tenantId, changes, 'ignore');
};
