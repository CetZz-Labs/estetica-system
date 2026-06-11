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

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_ID = 'user_tenant_test';

let mongod: MongoMemoryServer;
let tenantId: string;

describe('EP-10 — Configuración básica del negocio', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    beforeEach(async () => {
        await Tenant.deleteMany({});
        await Admin.deleteMany({});

        const tenant = await Tenant.create({ name: 'Mi Negocio Test' });
        tenantId = tenant._id.toString();

        await Admin.create({
            externalId: USER_ID,
            tenantId: tenant._id,
            email: 'duena@test.com',
            role: 'ADMIN'
        });

        asUser(USER_ID);
    });

    it('GET 200 — devuelve la configuración del negocio', async () => {
        const res = await request(app).get('/api/negocio');

        expect(res.status).toBe(200);
        expect(res.body.tenant).toBeDefined();
        expect(res.body.tenant.name).toBe('Mi Negocio Test');
        expect(res.body.tenant.timezone).toBe('America/Argentina/Buenos_Aires');
        expect(res.body.tenant.currency).toBe('ARS');
    });

    it('PUT 200 — actualiza el nombre del negocio', async () => {
        const res = await request(app)
            .put('/api/negocio')
            .send({ name: 'Mi Negocio Renombrado' });

        expect(res.status).toBe(200);
        expect(res.body.tenant.name).toBe('Mi Negocio Renombrado');

        const updated = await Tenant.findById(tenantId);
        expect(updated?.name).toBe('Mi Negocio Renombrado');
    });

    it('PUT 200 — actualiza timezone y currency', async () => {
        const res = await request(app)
            .put('/api/negocio')
            .send({ timezone: 'America/New_York', currency: 'USD' });

        expect(res.status).toBe(200);
        expect(res.body.tenant.timezone).toBe('America/New_York');
        expect(res.body.tenant.currency).toBe('USD');

        const updated = await Tenant.findById(tenantId);
        expect(updated?.timezone).toBe('America/New_York');
        expect(updated?.currency).toBe('USD');
    });

    it('PUT 400 — rechaza name vacío', async () => {
        const res = await request(app)
            .put('/api/negocio')
            .send({ name: '' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].msg).toBe('El nombre no puede estar vacío');
    });

    it('GET 401 — rechaza sin autenticación', async () => {
        asUser(null);

        const res = await request(app).get('/api/negocio');

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    it('PUT 400 — rechaza currency de longitud incorrecta', async () => {
        const res = await request(app)
            .put('/api/negocio')
            .send({ currency: 'AR' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});
