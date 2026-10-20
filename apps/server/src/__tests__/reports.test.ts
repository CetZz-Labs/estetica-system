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

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_A = 'user_rep_a';
const USER_PRO = 'user_rep_pro';
const USER_REC = 'user_rep_rec';

let mongod: MongoMemoryServer;
let tenantA: mongoose.Types.ObjectId;
let tenantB: mongoose.Types.ObjectId;

const mkAppt = (tenantId: mongoose.Types.ObjectId, startIso: string, status = 'pending', isActive = true) =>
    Appointment.create({
        tenantId,
        client: new mongoose.Types.ObjectId(),
        startTime: new Date(startIso),
        endTime: new Date(new Date(startIso).getTime() + 3600000),
        status,
        createdBy: new mongoose.Types.ObjectId(),
        isActive
    });

describe('REP-1 — GET /api/reportes/turnos', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    beforeEach(async () => {
        await Promise.all([Tenant.deleteMany({}), Admin.deleteMany({}), Appointment.deleteMany({})]);
        const a = await Tenant.create({ name: 'A' });
        const b = await Tenant.create({ name: 'B' });
        tenantA = a._id as mongoose.Types.ObjectId;
        tenantB = b._id as mongoose.Types.ObjectId;
        await Admin.create({ externalId: USER_A, email: 'a@test.com', tenantId: tenantA, role: 'ADMIN' });
        await Admin.create({ externalId: USER_PRO, email: 'p@test.com', tenantId: tenantA, role: 'PROFESSIONAL' });
        await Admin.create({ externalId: USER_REC, email: 'r@test.com', tenantId: tenantA, role: 'RECEPTIONIST' });
        asUser(USER_A);
    });

    it('401 sin autenticación', async () => {
        asUser(null);
        const res = await request(app).get('/api/reportes/turnos?from=2026-03-01&to=2026-03-02');
        expect(res.status).toBe(401);
    });

    it('403 para PROFESSIONAL y RECEPTIONIST', async () => {
        asUser(USER_PRO);
        expect((await request(app).get('/api/reportes/turnos?from=2026-03-01&to=2026-03-02')).status).toBe(403);
        asUser(USER_REC);
        expect((await request(app).get('/api/reportes/turnos?from=2026-03-01&to=2026-03-02')).status).toBe(403);
    });

    it('400 sin from/to, formato inválido, from>to y rango > 366 días', async () => {
        expect((await request(app).get('/api/reportes/turnos')).status).toBe(400);
        expect((await request(app).get('/api/reportes/turnos?from=2026-03-01')).status).toBe(400);
        expect((await request(app).get('/api/reportes/turnos?from=foo&to=2026-03-01')).status).toBe(400);
        expect((await request(app).get('/api/reportes/turnos?from=2026-03-05&to=2026-03-01')).status).toBe(400);
        expect((await request(app).get('/api/reportes/turnos?from=2025-01-01&to=2026-01-02')).status).toBe(400);
        expect((await request(app).get('/api/reportes/turnos?from=2025-01-01&to=2026-01-01')).status).toBe(200);
    });

    it('200 — totales, byDay con ceros y byWeekday de 7 ítems (zona del tenant)', async () => {
        // 2026-03-02 es lunes. Tenant en Buenos Aires (UTC-3).
        await mkAppt(tenantA, '2026-03-02T13:00:00Z', 'pending');
        await mkAppt(tenantA, '2026-03-02T15:00:00Z', 'confirmed');
        // 2026-03-04T02:30Z = 2026-03-03 23:30 local (martes) -> cuenta como día 03
        await mkAppt(tenantA, '2026-03-04T02:30:00Z', 'completed');
        // 2026-03-03T02:59Z = 2026-03-02 23:59 local -> día 02; 03:00Z ya es día 03
        await mkAppt(tenantA, '2026-03-03T02:59:00Z', 'cancelled');
        // Inactivo y fuera de rango: no cuentan
        await mkAppt(tenantA, '2026-03-02T16:00:00Z', 'pending', false);
        await mkAppt(tenantA, '2026-03-05T03:00:00Z', 'pending'); // 05 local, fuera de [02..04]
        await mkAppt(tenantA, '2026-03-02T02:59:00Z', 'pending'); // 01 local, fuera

        const res = await request(app).get('/api/reportes/turnos?from=2026-03-02&to=2026-03-04');
        expect(res.status).toBe(200);
        expect(res.body.range).toEqual({ from: '2026-03-02', to: '2026-03-04' });
        expect(res.body.totals).toEqual({ total: 4, pending: 1, confirmed: 1, cancelled: 1, completed: 1 });
        expect(res.body.byDay).toEqual([
            { date: '2026-03-02', count: 3 },
            { date: '2026-03-03', count: 1 },
            { date: '2026-03-04', count: 0 }
        ]);
        expect(res.body.byWeekday).toHaveLength(7);
        expect(res.body.byWeekday[0]).toEqual({ weekday: 1, count: 3 });
        expect(res.body.byWeekday[1]).toEqual({ weekday: 2, count: 1 });
        expect(res.body.byWeekday.map((w: { weekday: number }) => w.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('200 vacío — todo en cero y 7 weekdays', async () => {
        const res = await request(app).get('/api/reportes/turnos?from=2026-03-02&to=2026-03-02');
        expect(res.status).toBe(200);
        expect(res.body.totals).toEqual({ total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0 });
        expect(res.body.byDay).toEqual([{ date: '2026-03-02', count: 0 }]);
        expect(res.body.byWeekday).toHaveLength(7);
    });

    it('IDOR — los turnos de otro tenant no se cuentan', async () => {
        await mkAppt(tenantB, '2026-03-02T13:00:00Z', 'confirmed');
        await mkAppt(tenantA, '2026-03-02T13:00:00Z', 'pending');
        const res = await request(app).get(`/api/reportes/turnos?from=2026-03-02&to=2026-03-02&tenantId=${tenantB}`);
        expect(res.status).toBe(200);
        expect(res.body.totals.total).toBe(1);
        expect(res.body.totals.confirmed).toBe(0);
    });

    it('respeta la zona horaria del tenant', async () => {
        await Tenant.updateOne({ _id: tenantA }, { timezone: 'UTC' });
        await mkAppt(tenantA, '2026-03-02T02:30:00Z', 'pending');
        const res = await request(app).get('/api/reportes/turnos?from=2026-03-02&to=2026-03-02');
        expect(res.body.totals.total).toBe(1);
    });
});
