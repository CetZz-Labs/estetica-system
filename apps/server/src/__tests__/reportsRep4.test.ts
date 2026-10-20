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
import { Client } from '../models/Client';

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_A = 'user_rep4_a';
const USER_PRO = 'user_rep4_pro';
const USER_REC = 'user_rep4_rec';
type Oid = mongoose.Types.ObjectId;

let mongod: MongoMemoryServer;
let tenantA: Oid;
let tenantB: Oid;

const mkClient = async (tenantId: Oid, firstName: string, lastName = 'Perez', isActive = true) =>
    (await Client.create({ tenantId, firstName, lastName, isActive }))._id as Oid;

const mkVisit = (tenantId: Oid, client: Oid, dateIso: string) =>
    ServiceRecord.create({
        tenantId,
        service: new mongoose.Types.ObjectId(),
        client,
        serviceDate: new Date(dateIso),
        productsUsed: []
    });

const daysAgoIso = (n: number) => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n)).toISOString();
};

const URL = '/api/reportes/clientes';
const RANGE = 'from=2026-03-01&to=2026-03-31';
const OLD = 'from=2020-01-01&to=2020-01-02';

describe('REP-4 — reporte de clientes', () => {
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
            Tenant.deleteMany({}), Admin.deleteMany({}), ServiceRecord.deleteMany({}), Client.deleteMany({})
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

    it('vacío -> ceros, returnRate 0, avg null e inactivos vacíos', async () => {
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            range: { from: '2026-03-01', to: '2026-03-31' },
            totals: { clientsServed: 0, newClients: 0, returningClients: 0, returnRate: 0 },
            avgVisitIntervalDays: null,
            inactive: { thresholdDays: 90, total: 0, items: [] }
        });
    });

    it('nuevos vs recurrentes y returnRate', async () => {
        const nuevo = await mkClient(tenantA, 'Nuevo');
        const rec1 = await mkClient(tenantA, 'Rec1');
        const rec2 = await mkClient(tenantA, 'Rec2');
        const fuera = await mkClient(tenantA, 'Fuera');
        await mkVisit(tenantA, nuevo, '2026-03-05T00:00:00Z');
        await mkVisit(tenantA, nuevo, '2026-03-20T00:00:00Z');
        await mkVisit(tenantA, rec1, '2026-01-10T00:00:00Z');
        await mkVisit(tenantA, rec1, '2026-03-10T00:00:00Z');
        await mkVisit(tenantA, rec2, '2025-12-10T00:00:00Z');
        await mkVisit(tenantA, rec2, '2026-03-12T00:00:00Z');
        await mkVisit(tenantA, fuera, '2026-02-10T00:00:00Z');
        await mkVisit(tenantA, fuera, '2026-04-10T00:00:00Z');
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.totals).toEqual({ clientsServed: 3, newClients: 1, returningClients: 2, returnRate: 0.6667 });
    });

    it('avgVisitIntervalDays: con pares (incluye visita previa al rango) y sin pares', async () => {
        const c1 = await mkClient(tenantA, 'Uno');
        const c2 = await mkClient(tenantA, 'Dos');
        // c1: 02-20 -> 03-01 (9d) y 03-01 -> 03-11 (10d)
        await mkVisit(tenantA, c1, '2026-02-20T00:00:00Z');
        await mkVisit(tenantA, c1, '2026-03-01T00:00:00Z');
        await mkVisit(tenantA, c1, '2026-03-11T00:00:00Z');
        // c2: 03-05 -> 03-12 (7d); la visita posterior al rango no cuenta
        await mkVisit(tenantA, c2, '2026-03-05T00:00:00Z');
        await mkVisit(tenantA, c2, '2026-03-12T00:00:00Z');
        await mkVisit(tenantA, c2, '2026-05-01T00:00:00Z');
        const res = await request(app).get(`${URL}?${RANGE}`);
        // (9 + 10 + 7) / 3 = 8.67 -> 8.7
        expect(res.body.avgVisitIntervalDays).toBe(8.7);

        await ServiceRecord.deleteMany({});
        const c3 = await mkClient(tenantA, 'Tres');
        await mkVisit(tenantA, c3, '2026-03-05T00:00:00Z');
        const res2 = await request(app).get(`${URL}?${RANGE}`);
        expect(res2.body.avgVisitIntervalDays).toBeNull();
        expect(res2.body.totals.newClients).toBe(1);
    });

    it('serviceDate: último día incluido y fuera de rango excluido (UTC)', async () => {
        const a = await mkClient(tenantA, 'A');
        const b = await mkClient(tenantA, 'B');
        const c = await mkClient(tenantA, 'C');
        await mkVisit(tenantA, a, '2026-03-31T00:00:00Z');
        await mkVisit(tenantA, b, '2026-04-01T00:00:00Z');
        await mkVisit(tenantA, c, '2026-02-28T00:00:00Z');
        const res = await request(app).get(`${URL}?${RANGE}`);
        expect(res.body.totals.clientsServed).toBe(1);
    });

    it('inactivos: 90 días no, 91 sí; sin visitas, isActive:false y otro tenant excluidos', async () => {
        const c90 = await mkClient(tenantA, 'Noventa');
        const c91 = await mkClient(tenantA, 'Noventayuno');
        await mkClient(tenantA, 'SinVisitas');
        const baja = await mkClient(tenantA, 'Baja', 'Perez', false);
        const ajeno = await mkClient(tenantB, 'Ajeno');
        await mkVisit(tenantA, c90, daysAgoIso(90));
        await mkVisit(tenantA, c91, daysAgoIso(100));
        await mkVisit(tenantA, c91, daysAgoIso(91));
        await mkVisit(tenantA, baja, daysAgoIso(200));
        await mkVisit(tenantB, ajeno, daysAgoIso(200));
        const res = await request(app).get(`${URL}?${OLD}&tenantId=${tenantB}`);
        expect(res.body.inactive.total).toBe(1);
        expect(res.body.inactive.items).toEqual([{
            clientId: String(c91),
            name: 'Noventayuno Perez',
            lastVisit: daysAgoIso(91).slice(0, 10),
            daysSince: 91,
            visits: 2
        }]);
    });

    it('inactivos: lastName ausente sin doble espacio ni undefined', async () => {
        const id = new mongoose.Types.ObjectId();
        await Client.collection.insertOne({ _id: id, tenantId: tenantA, firstName: 'Solo', isActive: true });
        await mkVisit(tenantA, id, daysAgoIso(120));
        const res = await request(app).get(`${URL}?${OLD}`);
        expect(res.body.inactive.items[0].name).toBe('Solo');
    });

    it('inactivos: total > 20 con items = 20, orden daysSince desc y name asc', async () => {
        for (let i = 0; i < 22; i++) {
            const c = await mkClient(tenantA, `Cli ${String(i).padStart(2, '0')}`);
            await mkVisit(tenantA, c, daysAgoIso(100 + (i % 3)));
        }
        const res = await request(app).get(`${URL}?${OLD}`);
        expect(res.body.inactive.total).toBe(22);
        expect(res.body.inactive.items).toHaveLength(20);
        const items = res.body.inactive.items as { name: string; daysSince: number }[];
        expect(items[0].daysSince).toBe(102);
        for (let i = 1; i < items.length; i++) {
            const p = items[i - 1];
            const c = items[i];
            expect(p.daysSince > c.daysSince || (p.daysSince === c.daysSince && p.name <= c.name)).toBe(true);
        }
    });

    it('IDOR: visitas de otro tenant no cuentan ni como previas', async () => {
        const mine = await mkClient(tenantA, 'Mio');
        await mkVisit(tenantA, mine, '2026-03-05T00:00:00Z');
        // Mismo clientId con visita previa en tenant B: no debe volverlo recurrente.
        await mkVisit(tenantB, mine, '2026-01-05T00:00:00Z');
        const other = await mkClient(tenantB, 'Otro');
        await mkVisit(tenantB, other, '2026-03-06T00:00:00Z');
        const res = await request(app).get(`${URL}?${RANGE}&tenantId=${tenantB}`);
        expect(res.body.totals).toEqual({ clientsServed: 1, newClients: 1, returningClients: 0, returnRate: 0 });
        expect(res.body.avgVisitIntervalDays).toBeNull();
    });
});
