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
import { Appointment } from '../models/Appointment';
import { ServiceRecord } from '../models/ServiceRecord';
import { Service } from '../models/Service';
import { Professional } from '../models/Professional';

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_A = 'user_rep2_a';
const USER_PRO = 'user_rep2_pro';
const USER_REC = 'user_rep2_rec';
type Oid = mongoose.Types.ObjectId;

let mongod: MongoMemoryServer;
let tenantA: Oid;
let tenantB: Oid;

const mkAppt = (tenantId: Oid, startIso: string, status = 'pending', isActive = true) =>
    Appointment.create({
        tenantId,
        client: new mongoose.Types.ObjectId(),
        startTime: new Date(startIso),
        endTime: new Date(new Date(startIso).getTime() + 3600000),
        status,
        createdBy: new mongoose.Types.ObjectId(),
        isActive
    });

const mkRecord = (tenantId: Oid, service: Oid, client: Oid, dateIso: string, professional?: Oid) =>
    ServiceRecord.create({ tenantId, service, client, professional, serviceDate: new Date(dateIso), productsUsed: [] });

const mkService = (tenantId: Oid, name: string) => Service.create({ tenantId, name });

describe('REP-2 — reportes de ocupación y servicios', () => {
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
            Tenant.deleteMany({}), Admin.deleteMany({}), Appointment.deleteMany({}),
            ServiceRecord.deleteMany({}), Service.deleteMany({}), Professional.deleteMany({})
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

    for (const path of ['ocupacion', 'servicios']) {
        const base = `/api/reportes/${path}`;

        it(`${path}: 401 sin autenticación`, async () => {
            asUser(null);
            expect((await request(app).get(`${base}?from=2026-03-01&to=2026-03-02`)).status).toBe(401);
        });

        it(`${path}: 403 para PROFESSIONAL y RECEPTIONIST`, async () => {
            asUser(USER_PRO);
            expect((await request(app).get(`${base}?from=2026-03-01&to=2026-03-02`)).status).toBe(403);
            asUser(USER_REC);
            expect((await request(app).get(`${base}?from=2026-03-01&to=2026-03-02`)).status).toBe(403);
        });

        it(`${path}: 400 de validación`, async () => {
            expect((await request(app).get(base)).status).toBe(400);
            expect((await request(app).get(`${base}?from=2026-03-01`)).status).toBe(400);
            expect((await request(app).get(`${base}?from=foo&to=2026-03-01`)).status).toBe(400);
            expect((await request(app).get(`${base}?from=2026-03-05&to=2026-03-01`)).status).toBe(400);
            expect((await request(app).get(`${base}?from=2025-01-01&to=2026-01-02`)).status).toBe(400);
            expect((await request(app).get(`${base}?from=2025-01-01&to=2026-01-01`)).status).toBe(200);
        });
    }

    it('ocupacion: vacío -> 168 celdas en cero y peak null', async () => {
        const res = await request(app).get('/api/reportes/ocupacion?from=2026-03-02&to=2026-03-08');
        expect(res.status).toBe(200);
        expect(res.body.range).toEqual({ from: '2026-03-02', to: '2026-03-08' });
        expect(res.body.total).toBe(0);
        expect(res.body.peak).toBeNull();
        expect(res.body.heatmap).toHaveLength(168);
        expect(res.body.heatmap[0]).toEqual({ weekday: 1, hour: 0, count: 0 });
        expect(res.body.heatmap[167]).toEqual({ weekday: 7, hour: 23, count: 0 });
    });

    it('ocupacion: grilla completa, tz del tenant, peak con desempate y exclusión de cancelados/inactivos', async () => {
        // Buenos Aires UTC-3. 2026-03-02 lunes.
        await mkAppt(tenantA, '2026-03-02T13:00:00Z'); // lun 10h
        await mkAppt(tenantA, '2026-03-02T13:30:00Z', 'confirmed'); // lun 10h
        await mkAppt(tenantA, '2026-03-03T13:00:00Z'); // mar 10h
        await mkAppt(tenantA, '2026-03-03T14:00:00Z'); // mar 11h
        await mkAppt(tenantA, '2026-03-04T02:30:00Z', 'completed'); // mar 23h local
        await mkAppt(tenantA, '2026-03-02T13:00:00Z', 'cancelled'); // excluido
        await mkAppt(tenantA, '2026-03-02T13:00:00Z', 'pending', false); // inactivo
        await mkAppt(tenantA, '2026-03-09T13:00:00Z'); // fuera de rango
        await mkAppt(tenantB, '2026-03-02T13:00:00Z'); // otro tenant

        const res = await request(app).get('/api/reportes/ocupacion?from=2026-03-02&to=2026-03-08');
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(5);
        expect(res.body.heatmap).toHaveLength(168);
        const cell = (w: number, h: number) => res.body.heatmap.find((c: { weekday: number; hour: number }) => c.weekday === w && c.hour === h);
        expect(cell(1, 10).count).toBe(2);
        expect(cell(2, 10).count).toBe(1);
        expect(cell(2, 11).count).toBe(1);
        expect(cell(2, 23).count).toBe(1);
        expect(res.body.peak).toEqual({ weekday: 1, hour: 10, count: 2 });
    });

    it('ocupacion: desempate del peak por menor weekday y luego menor hour', async () => {
        await mkAppt(tenantA, '2026-03-04T14:00:00Z'); // mié 11h
        await mkAppt(tenantA, '2026-03-03T15:00:00Z'); // mar 12h
        await mkAppt(tenantA, '2026-03-03T13:00:00Z'); // mar 10h
        const res = await request(app).get('/api/reportes/ocupacion?from=2026-03-02&to=2026-03-08');
        expect(res.body.peak).toEqual({ weekday: 2, hour: 10, count: 1 });
    });

    it('servicios: vacío -> totales en cero y listas vacías', async () => {
        const res = await request(app).get('/api/reportes/servicios?from=2026-03-01&to=2026-03-31');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            range: { from: '2026-03-01', to: '2026-03-31' },
            totals: { visits: 0, clientsServed: 0 },
            topServices: [],
            byProfessional: []
        });
    });

    it('servicios: totales, ranking, Sin asignar, serviceDate UTC e IDOR', async () => {
        const corte = await mkService(tenantA, 'Corte');
        const color = await mkService(tenantA, 'Color');
        const otro = await mkService(tenantB, 'Ajeno');
        const pro = await Professional.create({ tenantId: tenantA, name: 'Ana', color: '#112233' });
        const c1 = new mongoose.Types.ObjectId();
        const c2 = new mongoose.Types.ObjectId();
        const cid = (s: { _id: unknown }) => s._id as Oid;

        await mkRecord(tenantA, cid(corte), c1, '2026-03-01T00:00:00Z', pro._id as Oid); // primer día
        await mkRecord(tenantA, cid(corte), c1, '2026-03-10T00:00:00Z', pro._id as Oid);
        await mkRecord(tenantA, cid(color), c2, '2026-03-31T00:00:00Z'); // último día del rango, UTC
        await mkRecord(tenantA, cid(corte), c2, '2026-04-01T00:00:00Z'); // fuera
        await mkRecord(tenantA, cid(corte), c2, '2026-02-28T00:00:00Z'); // fuera
        await mkRecord(tenantB, cid(otro), c1, '2026-03-05T00:00:00Z'); // otro tenant

        const res = await request(app).get(`/api/reportes/servicios?from=2026-03-01&to=2026-03-31&tenantId=${tenantB}`);
        expect(res.status).toBe(200);
        expect(res.body.totals).toEqual({ visits: 3, clientsServed: 2 });
        expect(res.body.topServices).toEqual([
            { serviceId: String(corte._id), name: 'Corte', count: 2 },
            { serviceId: String(color._id), name: 'Color', count: 1 }
        ]);
        expect(res.body.byProfessional).toEqual([
            { professionalId: String(pro._id), name: 'Ana', color: '#112233', count: 2 },
            { professionalId: null, name: 'Sin asignar', color: null, count: 1 }
        ]);
    });

    it('servicios: top 10, desempate por nombre y servicio eliminado', async () => {
        const client = new mongoose.Types.ObjectId();
        for (let i = 0; i < 12; i++) {
            const s = await mkService(tenantA, `Srv ${String(i).padStart(2, '0')}`);
            await mkRecord(tenantA, s._id as Oid, client, '2026-03-05T00:00:00Z');
        }
        const res = await request(app).get('/api/reportes/servicios?from=2026-03-01&to=2026-03-31');
        expect(res.body.topServices).toHaveLength(10);
        expect(res.body.topServices.map((s: { name: string }) => s.name)[0]).toBe('Srv 00');
        expect(res.body.totals.visits).toBe(12);

        await mkRecord(tenantA, new mongoose.Types.ObjectId(), client, '2026-03-06T00:00:00Z');
        await mkRecord(tenantA, (await Service.findOne({ name: 'Srv 05' }))!._id as Oid, client, '2026-03-06T00:00:00Z');
        const res2 = await request(app).get('/api/reportes/servicios?from=2026-03-06&to=2026-03-06');
        expect(res2.body.topServices.map((s: { name: string }) => s.name)).toEqual(['Servicio eliminado', 'Srv 05']);
    });
});
