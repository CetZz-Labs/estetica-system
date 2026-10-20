import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const authState = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock('@clerk/express', () => ({
    getAuth: () => ({ userId: authState.userId }),
    clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    clerkClient: { users: { getUser: vi.fn() } }
}));

vi.mock('../config/db', () => ({
    connectDB: vi.fn()
}));

import app from '../server';
import { Tenant } from '../models/Tenant';
import { Admin } from '../models/Admin';
import { ServiceRecord } from '../models/ServiceRecord';
import { Product } from '../models/Product';

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_A = 'user_rep3_a';
const USER_PRO = 'user_rep3_pro';
const USER_REC = 'user_rep3_rec';
type Oid = mongoose.Types.ObjectId;

let mongod: MongoMemoryServer;
let tenantA: Oid;
let tenantB: Oid;

const mkProduct = async (tenantId: Oid, name: string, stock = 10, isActive = true, brand = 'Marca') =>
    (await Product.create({ tenantId, name, brand, stock, isActive }))._id as Oid;

interface Item { product: Oid; quantity: number; usedExistingUnit?: boolean }
const mkRecord = (tenantId: Oid, dateIso: string, productsUsed: Item[]) =>
    ServiceRecord.create({
        tenantId,
        service: new mongoose.Types.ObjectId(),
        client: new mongoose.Types.ObjectId(),
        serviceDate: new Date(dateIso),
        productsUsed
    });

const URL = '/api/reportes/productos';
const RANGE = 'from=2026-03-01&to=2026-03-31';

describe('REP-3 — reporte de productos', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    beforeEach(async () => {
        await Promise.all([
            Tenant.deleteMany({}), Admin.deleteMany({}), ServiceRecord.deleteMany({}), Product.deleteMany({})
        ]);
        const a = await Tenant.create({ name: 'A' });
        const b = await Tenant.create({ name: 'B' });
        tenantA = a._id as Oid;
        tenantB = b._id as Oid;
        await Admin.create({ externalId: USER_A, email: 'a@test.com', tenantId: tenantA, role: 'ADMIN' });
        await Admin.create({ externalId: USER_PRO, email: 'p@test.com', tenantId: tenantA, role: 'PROFESSIONAL' });
        await Admin.create({ externalId: USER_REC, email: 'r@test.com', tenantId: tenantA, role: 'RECEPTIONIST' });
        asUser(USER_A);
    });

    it('401 sin autenticación', async () => {
        asUser(null);
        expect((await request(app).get(`${URL}?${RANGE}`)).status).toBe(401);
    });

    it('403 para PROFESSIONAL y RECEPTIONIST', async () => {
        asUser(USER_PRO);
        expect((await request(app).get(`${URL}?${RANGE}`)).status).toBe(403);
        asUser(USER_REC);
        expect((await request(app).get(`${URL}?${RANGE}`)).status).toBe(403);
    });

    it('400 de validación', async () => {
        expect((await request(app).get(URL)).status).toBe(400);
        expect((await request(app).get(`${URL}?from=2026-03-01`)).status).toBe(400);
        expect((await request(app).get(`${URL}?from=foo&to=2026-03-01`)).status).toBe(400);
        expect((await request(app).get(`${URL}?from=2026-03-05&to=2026-03-01`)).status).toBe(400);
        expect((await request(app).get(`${URL}?from=2025-01-01&to=2026-01-02`)).status).toBe(400);
        expect((await request(app).get(`${URL}?from=2025-01-01&to=2026-01-01`)).status).toBe(200);
    });

    it('vacío -> totales en cero, listas vacías y threshold', async () => {
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            range: { from: '2026-03-01', to: '2026-03-31' },
            totals: { productsUsed: 0, usages: 0, unitsConsumed: 0 },
            topProducts: [],
            lowStock: { threshold: 5, total: 0, items: [] }
        });
    });

    it('usedExistingUnit aporta 0 a unitsConsumed pero cuenta como uso; totales y stock actual', async () => {
        const p1 = await mkProduct(tenantA, 'Tintura', 8, true, 'Loreal');
        const p2 = await mkProduct(tenantA, 'Oxidante', 9);
        await mkRecord(tenantA, '2026-03-05T00:00:00Z', [{ product: p1, quantity: 2 }, { product: p2, quantity: 1, usedExistingUnit: true }]);
        await mkRecord(tenantA, '2026-03-06T00:00:00Z', [{ product: p1, quantity: 1, usedExistingUnit: true }, { product: p1, quantity: 3 }]);

        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.totals).toEqual({ productsUsed: 2, usages: 4, unitsConsumed: 5 });
        expect(res.body.topProducts).toEqual([
            { productId: String(p1), name: 'Tintura', brand: 'Loreal', usages: 3, unitsConsumed: 5, stock: 8 },
            { productId: String(p2), name: 'Oxidante', brand: 'Marca', usages: 1, unitsConsumed: 0, stock: 9 }
        ]);
    });

    it('desempates: usages, luego unitsConsumed, luego name', async () => {
        const a = await mkProduct(tenantA, 'Bravo');
        const b = await mkProduct(tenantA, 'Alfa');
        const c = await mkProduct(tenantA, 'Charlie');
        const d = await mkProduct(tenantA, 'Delta');
        await mkRecord(tenantA, '2026-03-05T00:00:00Z', [
            { product: a, quantity: 1 }, { product: b, quantity: 1 }, { product: c, quantity: 4 }, { product: d, quantity: 1 }
        ]);
        await mkRecord(tenantA, '2026-03-06T00:00:00Z', [{ product: d, quantity: 1 }]);
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.topProducts.map((p: { name: string }) => p.name)).toEqual(['Delta', 'Charlie', 'Alfa', 'Bravo']);
    });

    it('top 10 con 11 productos', async () => {
        for (let i = 0; i < 11; i++) {
            const p = await mkProduct(tenantA, `Prod ${String(i).padStart(2, '0')}`);
            await mkRecord(tenantA, '2026-03-05T00:00:00Z', [{ product: p, quantity: 1 }]);
        }
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.topProducts).toHaveLength(10);
        expect(res.body.totals.productsUsed).toBe(11);
        expect(res.body.topProducts[0].name).toBe('Prod 00');
    });

    it('producto eliminado/inexistente -> Producto eliminado, brand vacío, stock 0', async () => {
        await mkRecord(tenantA, '2026-03-05T00:00:00Z', [{ product: new mongoose.Types.ObjectId(), quantity: 2 }]);
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.topProducts).toHaveLength(1);
        expect(res.body.topProducts[0]).toMatchObject({ name: 'Producto eliminado', brand: '', stock: 0, usages: 1, unitsConsumed: 2 });
    });

    it('serviceDate: último día incluido y fuera de rango excluido (UTC)', async () => {
        const p = await mkProduct(tenantA, 'Tintura');
        await mkRecord(tenantA, '2026-03-01T00:00:00Z', [{ product: p, quantity: 1 }]);
        await mkRecord(tenantA, '2026-03-31T00:00:00Z', [{ product: p, quantity: 1 }]);
        await mkRecord(tenantA, '2026-04-01T00:00:00Z', [{ product: p, quantity: 1 }]);
        await mkRecord(tenantA, '2026-02-28T00:00:00Z', [{ product: p, quantity: 1 }]);
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.totals.usages).toBe(2);
    });

    it('IDOR: otro tenant no aparece en ranking ni en lowStock; tenantId de query ignorado', async () => {
        const mine = await mkProduct(tenantA, 'Mio', 1);
        const theirs = await mkProduct(tenantB, 'Ajeno', 0);
        await mkRecord(tenantA, '2026-03-05T00:00:00Z', [{ product: mine, quantity: 1 }]);
        await mkRecord(tenantB, '2026-03-05T00:00:00Z', [{ product: theirs, quantity: 1 }]);
        // Registro de A que referencia un producto de B: no debe filtrar datos del otro tenant.
        await mkRecord(tenantA, '2026-03-06T00:00:00Z', [{ product: theirs, quantity: 1 }]);

        const res = await request(app).get(`${URL}?${RANGE}&tenantId=${tenantB}`);
        const names = res.body.topProducts.map((p: { name: string }) => p.name);
        expect(names).toContain('Mio');
        expect(names).not.toContain('Ajeno');
        expect(res.body.lowStock.items.map((p: { name: string }) => p.name)).toEqual(['Mio']);
        expect(res.body.lowStock.total).toBe(1);
    });

    it('lowStock: total > 20, orden stock asc/name asc, inactivos excluidos, independiente del rango', async () => {
        for (let i = 0; i < 22; i++) await mkProduct(tenantA, `Bajo ${String(i).padStart(2, '0')}`, i % 6);
        await mkProduct(tenantA, 'Inactivo', 0, false);
        await mkProduct(tenantA, 'Alto', 6);
        const res = await request(app).get(`${URL}?from=2020-01-01&to=2020-01-02`);
        expect(res.body.lowStock.threshold).toBe(5);
        expect(res.body.lowStock.total).toBe(22);
        expect(res.body.lowStock.items).toHaveLength(20);
        const items = res.body.lowStock.items as { name: string; stock: number }[];
        expect(items[0]).toMatchObject({ name: 'Bajo 00', stock: 0 });
        for (let i = 1; i < items.length; i++) {
            const prev = items[i - 1];
            const cur = items[i];
            expect(prev.stock < cur.stock || (prev.stock === cur.stock && prev.name <= cur.name)).toBe(true);
        }
        expect(items.map(x => x.name)).not.toContain('Inactivo');
    });
});
