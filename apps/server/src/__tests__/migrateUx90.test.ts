import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Product } from '../models/Product';
import { migrateTenantProducts, findTenantsToMigrate } from '../scripts/migrate-ux90-open-unit';

let mongod: MongoMemoryServer;
const tenantA = new mongoose.Types.ObjectId();
const tenantB = new mongoose.Types.ObjectId();

const mk = (tenantId: mongoose.Types.ObjectId, name: string, stock: number, currentUnitLevel?: number) =>
    Product.create({ tenantId, name, brand: 'X', stock, currentUnitLevel });

const raw = async (id: unknown) => Product.collection.findOne({ _id: id as mongoose.Types.ObjectId });

describe('UX-90 — migración del envase abierto (Mongo en memoria)', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    });
    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });
    beforeEach(async () => {
        await Product.deleteMany({});
    });

    it('nivel 1..99: stock +1 y nivel se mantiene', async () => {
        const p = await mk(tenantA, 'a', 4, 70);
        const s = await migrateTenantProducts(tenantA, { apply: true, log: false });
        const d = await raw(p._id);
        expect(d).toMatchObject({ stock: 5, currentUnitLevel: 70, ux90Migrated: true });
        expect(s).toMatchObject({ affected: 1, plusOneApplied: 1, canonized: 0, depleted: 0 });
    });

    it('nivel 100: stock +1 y se quita el nivel', async () => {
        const p = await mk(tenantA, 'a', 4, 100);
        const s = await migrateTenantProducts(tenantA, { apply: true, log: false });
        const d = await raw(p._id);
        expect(d!.stock).toBe(5);
        expect(d!.currentUnitLevel).toBeUndefined();
        expect(s).toMatchObject({ affected: 1, plusOneApplied: 1, canonized: 1, depleted: 0 });
    });

    it('nivel 0: se quita el nivel sin sumar', async () => {
        const p = await mk(tenantA, 'a', 4, 0);
        const s = await migrateTenantProducts(tenantA, { apply: true, log: false });
        const d = await raw(p._id);
        expect(d!.stock).toBe(4);
        expect(d!.currentUnitLevel).toBeUndefined();
        expect(s).toMatchObject({ affected: 1, plusOneApplied: 0, canonized: 0, depleted: 1 });
    });

    it('productos sin nivel no se tocan', async () => {
        const p = await mk(tenantA, 'a', 4);
        const s = await migrateTenantProducts(tenantA, { apply: true, log: false });
        const d = await raw(p._id);
        expect(d!.stock).toBe(4);
        expect(d!.ux90Migrated).toBeUndefined();
        expect(s.affected).toBe(0);
    });

    it('dry-run no escribe nada pero reporta', async () => {
        const p = await mk(tenantA, 'a', 4, 70);
        const s = await migrateTenantProducts(tenantA, { log: false });
        const d = await raw(p._id);
        expect(d).toMatchObject({ stock: 4, currentUnitLevel: 70 });
        expect(d!.ux90Migrated).toBeUndefined();
        expect(s).toMatchObject({ affected: 1, plusOneApplied: 1 });
    });

    it('es idempotente: la segunda corrida no cambia nada', async () => {
        const p = await mk(tenantA, 'a', 4, 70);
        await migrateTenantProducts(tenantA, { apply: true, log: false });
        const s2 = await migrateTenantProducts(tenantA, { apply: true, log: false });
        expect((await raw(p._id))!.stock).toBe(5);
        expect(s2.affected).toBe(0);
        expect(await findTenantsToMigrate()).toHaveLength(0);
    });

    it('aísla tenants: migrar A no toca B', async () => {
        const a = await mk(tenantA, 'a', 4, 70);
        const b = await mk(tenantB, 'b', 4, 70);
        await migrateTenantProducts(tenantA, { apply: true, log: false });
        expect((await raw(a._id))!.stock).toBe(5);
        expect(await raw(b._id)).toMatchObject({ stock: 4, currentUnitLevel: 70 });
        expect((await findTenantsToMigrate()).map(String)).toEqual([String(tenantB)]);
    });
});
