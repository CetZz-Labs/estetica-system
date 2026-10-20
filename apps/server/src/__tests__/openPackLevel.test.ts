import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
import { Client, type IClient } from '../models/Client';
import { Service, type IService } from '../models/Service';
import { Product, type IProduct } from '../models/Product';
import { Professional } from '../models/Professional';
import { ServiceRecord } from '../models/ServiceRecord';

const USER = 'user_openpack';
let mongod: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;
let client: IClient;
let service: IService;
let product: IProduct;
let professionalId: string;

// Fecha de hoy (válida para registros no-backfill)
const today = () => new Date().toISOString().slice(0, 10);

describe('UX-94 — remainingLevel no puede superar currentUnitLevel (envase abierto)', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
        const tenant = await Tenant.create({ name: 'Estética OP' });
        tenantId = tenant._id as mongoose.Types.ObjectId;
        await Admin.create({ externalId: USER, email: 'op@test.com', tenantId });
        client = await Client.create({ tenantId, firstName: 'Ana', lastName: 'Op' });
        service = await Service.create({ tenantId, name: 'Color', defaultTouchupDays: 30 });
        product = await Product.create({ tenantId, name: 'Tinte', brand: 'X', stock: 5, currentUnitLevel: 40 });
        professionalId = (await Professional.create({ tenantId, name: 'Pro', color: '#112233' })).id;
        authState.userId = USER;
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    it('POST con usedExistingUnit y remainingLevel > currentUnitLevel devuelve 400 y no modifica el nivel', async () => {
        const res = await request(app).post('/api/registros').send({
            client: client.id,
            service: service.id,
            professional: professionalId,
            serviceDate: today(),
            productsUsed: [{ product: product.id, quantity: 1, usedExistingUnit: true, remainingLevel: 60 }]
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/nivel restante/i);
        const p = await Product.findById(product._id);
        expect(p?.currentUnitLevel).toBe(40);
        expect(p?.stock).toBe(5);
    });

    it('PUT con usedExistingUnit y remainingLevel > currentUnitLevel devuelve 400 y no modifica el nivel', async () => {
        const record = await ServiceRecord.create({
            tenantId,
            client: client._id,
            service: service._id,
            serviceDate: new Date(),
            productsUsed: []
        });
        const res = await request(app).put(`/api/registros/${record.id}`).send({
            productsUsed: [{ product: product.id, quantity: 1, usedExistingUnit: true, remainingLevel: 60 }]
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/nivel restante/i);
        const p = await Product.findById(product._id);
        expect(p?.currentUnitLevel).toBe(40);
    });

    it('PUT con remainingLevel <= currentUnitLevel es aceptado y actualiza el nivel', async () => {
        const record = await ServiceRecord.create({
            tenantId,
            client: client._id,
            service: service._id,
            serviceDate: new Date(),
            productsUsed: []
        });
        const res = await request(app).put(`/api/registros/${record.id}`).send({
            productsUsed: [{ product: product.id, quantity: 1, usedExistingUnit: true, remainingLevel: 25 }]
        });
        expect(res.status).toBe(200);
        const p = await Product.findById(product._id);
        expect(p?.currentUnitLevel).toBe(25);
    });
});
