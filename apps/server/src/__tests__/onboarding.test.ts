import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Estado mutable del mock de Clerk: cada test decide qué usuario "está logueado"
const authState = vi.hoisted(() => ({ userId: null as string | null }));

// Mock del backend SDK de Clerk (clerkClient.users.getUser)
const clerkUsers = vi.hoisted(() => ({
    getUser: vi.fn()
}));

vi.mock('@clerk/express', () => ({
    getAuth: () => ({ userId: authState.userId }),
    clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    clerkClient: { users: clerkUsers }
}));

// Evitamos la conexión real a MongoDB del arranque del server (usamos memory server)
vi.mock('../config/db', () => ({
    connectDB: vi.fn()
}));

import app from '../server';
import { Tenant } from '../models/Tenant';
import { Admin } from '../models/Admin';

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

// Simula la respuesta de clerkClient.users.getUser para el usuario "logueado"
const mockClerkUser = (email: string, verified: boolean) => {
    clerkUsers.getUser.mockResolvedValue({
        id: authState.userId,
        primaryEmailAddressId: 'idn_primary',
        emailAddresses: [
            {
                id: 'idn_primary',
                emailAddress: email,
                verification: { status: verified ? 'verified' : 'unverified' }
            }
        ]
    });
};

const USER_NEW = 'user_onboarding_new';
const USER_UNVERIFIED = 'user_onboarding_unverified';
const USER_DUP_EMAIL = 'user_onboarding_dup_email';

let mongod: MongoMemoryServer;

describe('EP-09 — Onboarding autónomo de nuevos tenants', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    it('rechaza con 401 los requests sin sesión de Clerk', async () => {
        asUser(null);
        const res = await request(app)
            .post('/api/onboarding')
            .send({ businessName: 'Maison Sin Sesión' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });

    it('rechaza con 403 si el email primario no está verificado', async () => {
        asUser(USER_UNVERIFIED);
        mockClerkUser('noverificado@test.com', false);

        const res = await request(app)
            .post('/api/onboarding')
            .send({ businessName: 'Maison No Verificada' });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('El correo electrónico no está verificado.');

        // No debe haber creado nada
        expect(await Tenant.countDocuments()).toBe(0);
        expect(await Admin.countDocuments()).toBe(0);
    });

    it('rechaza con 400 si falta businessName', async () => {
        asUser(USER_NEW);
        mockClerkUser('duena@maison.com', true);

        const res = await request(app)
            .post('/api/onboarding')
            .send({ responsibleName: 'Dueña Sin Negocio' });

        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
    });

    it('crea tenant y admin vinculado con 201', async () => {
        asUser(USER_NEW);
        mockClerkUser('duena@maison.com', true);

        const res = await request(app)
            .post('/api/onboarding')
            .send({ businessName: 'Maison Nueva', responsibleName: 'Dueña Maison' });

        expect(res.status).toBe(201);
        expect(res.body.tenant).toBeDefined();
        expect(res.body.admin).toBeDefined();
        expect(res.body.tenant.name).toBe('Maison Nueva');

        // El admin queda vinculado al tenant recién creado con rol ADMIN
        expect(res.body.admin.tenantId).toBe(res.body.tenant._id);
        expect(res.body.admin.externalId).toBe(USER_NEW);
        expect(res.body.admin.email).toBe('duena@maison.com');
        expect(res.body.admin.role).toBe('ADMIN');

        const adminInDb = await Admin.findOne({ externalId: USER_NEW });
        expect(adminInDb).not.toBeNull();
        expect(adminInDb?.tenantId.toString()).toBe(res.body.tenant._id);
    });

    it('es idempotente: un segundo POST del mismo usuario devuelve 200 sin duplicar documentos', async () => {
        asUser(USER_NEW);
        mockClerkUser('duena@maison.com', true);

        const tenantsBefore = await Tenant.countDocuments();
        const adminsBefore = await Admin.countDocuments();

        const res = await request(app)
            .post('/api/onboarding')
            .send({ businessName: 'Maison Repetida' });

        expect(res.status).toBe(200);
        // Devuelve el tenant/admin originales, no crea uno nuevo con el nombre repetido
        expect(res.body.tenant.name).toBe('Maison Nueva');
        expect(res.body.admin.externalId).toBe(USER_NEW);

        expect(await Tenant.countDocuments()).toBe(tenantsBefore);
        expect(await Admin.countDocuments()).toBe(adminsBefore);
    });

    it('rechaza con 409 si el email ya pertenece a otro externalId', async () => {
        asUser(USER_DUP_EMAIL);
        mockClerkUser('duena@maison.com', true); // mismo email, otro usuario Clerk

        const tenantsBefore = await Tenant.countDocuments();
        const adminsBefore = await Admin.countDocuments();

        const res = await request(app)
            .post('/api/onboarding')
            .send({ businessName: 'Maison Clonada' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBeDefined();

        // No debe haber creado documentos nuevos
        expect(await Tenant.countDocuments()).toBe(tenantsBefore);
        expect(await Admin.countDocuments()).toBe(adminsBefore);
    });
});
