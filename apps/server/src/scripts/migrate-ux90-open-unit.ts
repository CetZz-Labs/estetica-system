/**
 * Migración UX-90 — stock con envase abierto como pool de puntos (idempotente, dry-run por defecto).
 *
 * Bajo el modelo viejo el stock EXCLUÍA el envase abierto (se descontaba al abrir).
 * Bajo el nuevo (pool) el stock lo INCLUYE. Por cada producto con `currentUnitLevel` numérico:
 *   - nivel 1..99 : stock += 1, el nivel se mantiene.
 *   - nivel 100   : stock += 1 y $unset currentUnitLevel (abierto intacto == envase entero).
 *   - nivel 0     : $unset currentUnitLevel, sin sumar (envase agotado, ya descontado).
 *   - sin nivel   : no se toca.
 *
 * Idempotencia: cada producto migrado recibe el marcador `ux90Migrated: true` en el MISMO
 * updateOne atómico, cuyo filtro exige `{ _id, tenantId, currentUnitLevel: <leído>, ux90Migrated: { $ne: true } }`.
 * El marcador se escribe vía `Product.collection` (driver nativo) y NO existe en el schema de Mongoose.
 *
 * Por defecto es DRY-RUN (solo lista). Escribe únicamente con `--apply`.
 *
 * Ejecutar (desde la raíz del monorepo):
 *   pnpm --filter @estetica/server exec ts-node src/scripts/migrate-ux90-open-unit.ts            (dry-run)
 *   pnpm --filter @estetica/server exec ts-node src/scripts/migrate-ux90-open-unit.ts --apply    (escribe)
 *
 * Requiere DATABASE_URL en el entorno (apps/server/.env).
 */

import mongoose from 'mongoose';
import { Product } from '../models/Product';

const LOG = '[migrate-ux90]';
const MARKER = 'ux90Migrated';

export interface MigrationSummary {
    affected: number;       // productos candidatos (con nivel y sin marcador)
    plusOneApplied: number; // productos a los que se sumó +1 al stock
    canonized: number;      // abiertos al 100% canonizados a "sin abierto"
    depleted: number;       // abiertos en 0 (agotados) limpiados
    skipped: number;        // conflictos de concurrencia / niveles inválidos (sin cambios)
}

export const emptySummary = (): MigrationSummary => ({
    affected: 0, plusOneApplied: 0, canonized: 0, depleted: 0, skipped: 0
});

// Tenants que tienen al menos un producto candidato (nivel numérico y sin marcador).
export const findTenantsToMigrate = async (): Promise<mongoose.Types.ObjectId[]> =>
    Product.collection.distinct('tenantId', {
        currentUnitLevel: { $type: 'number' },
        [MARKER]: { $ne: true }
    }) as Promise<mongoose.Types.ObjectId[]>;

export const migrateTenantProducts = async (
    tenantId: mongoose.Types.ObjectId,
    { apply = false, log = true }: { apply?: boolean; log?: boolean } = {}
): Promise<MigrationSummary> => {
    if (!tenantId) throw new Error('migrateTenantProducts: tenantId requerido');
    const summary = emptySummary();
    const say = (msg: string) => { if (log) console.log(msg); };

    const products = await Product.collection
        .find({ tenantId, currentUnitLevel: { $type: 'number' }, [MARKER]: { $ne: true } })
        .toArray();

    for (const p of products) {
        const level = p.currentUnitLevel as number;
        const stock = p.stock as number;

        if (level < 0 || level > 100) {
            summary.skipped++;
            console.warn(`${LOG} Producto ${p._id} con nivel inválido (${level}). Sin cambios.`);
            continue;
        }

        summary.affected++;
        const addOne = level > 0;
        const dropLevel = level === 0 || level === 100;
        const newStock = addOne ? stock + 1 : stock;
        const newLevel = dropLevel ? '(sin abierto)' : String(level);
        say(`${LOG}   ${p.name} (${p.brand}) stock ${stock} nivel ${level} -> stock ${newStock} nivel ${newLevel}`);

        if (apply) {
            const update: Record<string, unknown> = { $set: { [MARKER]: true } };
            if (addOne) update.$inc = { stock: 1 };
            if (dropLevel) update.$unset = { currentUnitLevel: '' };
            const res = await Product.collection.updateOne(
                { _id: p._id, tenantId, currentUnitLevel: level, [MARKER]: { $ne: true } },
                update
            );
            if (res.modifiedCount !== 1) {
                summary.affected--;
                summary.skipped++;
                console.warn(`${LOG} Producto ${p._id} cambió durante la migración. Sin cambios.`);
                continue;
            }
        }

        if (addOne) summary.plusOneApplied++;
        if (level === 100) summary.canonized++;
        if (level === 0) summary.depleted++;
    }
    return summary;
};

const run = async () => {
    const apply = process.argv.includes('--apply');

    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        process.loadEnvFile();
    }
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error(`${LOG} Falta DATABASE_URL en el entorno. Abortando.`);
        process.exit(1);
    }

    await mongoose.connect(dbUrl);
    console.log(`${LOG} Conectado a MongoDB. Modo: ${apply ? 'APPLY (escribe)' : 'DRY-RUN (sin escrituras)'}`);

    const total = emptySummary();
    const tenants = await findTenantsToMigrate();
    for (const tenantId of tenants) {
        console.log(`${LOG} Tenant ${tenantId}:`);
        const s = await migrateTenantProducts(tenantId, { apply });
        total.affected += s.affected;
        total.plusOneApplied += s.plusOneApplied;
        total.canonized += s.canonized;
        total.depleted += s.depleted;
        total.skipped += s.skipped;
    }

    const verb = apply ? 'aplicados' : 'a aplicar (dry-run)';
    console.log(`${LOG} Resumen:`);
    console.log(`  - Productos afectados:              ${total.affected}`);
    console.log(`  - +1 stock ${verb}: ${total.plusOneApplied}`);
    console.log(`  - Abiertos canonizados (100%):      ${total.canonized}`);
    console.log(`  - Abiertos agotados limpiados (0%): ${total.depleted}`);
    console.log(`  - Omitidos (conflicto/invalidos):   ${total.skipped}`);
    if (!apply) console.log(`${LOG} Dry-run: no se escribió nada. Re-ejecutar con --apply para aplicar.`);

    await mongoose.disconnect();
    console.log(`${LOG} Desconectado.`);
    process.exit(0);
};

// No ejecutar al importar (tests).
if (require.main === module) {
    run().catch(async (error) => {
        console.error(`${LOG} Error durante la migración:`, error);
        await mongoose.disconnect().catch(() => undefined);
        process.exit(1);
    });
}
