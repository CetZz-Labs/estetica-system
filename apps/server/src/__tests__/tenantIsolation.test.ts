import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Estado mutable del mock de Clerk: cada test decide qué usuario "está logueado"
const authState = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock('@clerk/express', () => ({
    getAuth: () => ({ userId: authState.userId }),
    clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    requireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    // El server importa clerkClient via onboardingController (EP-09); aquí no se usa
    clerkClient: { users: { getUser: vi.fn() } }
}));

// Evitamos la conexión real a MongoDB del arranque del server (usamos memory server)
vi.mock('../config/db', () => ({
    connectDB: vi.fn()
}));

import app from '../server';
import { Tenant } from '../models/Tenant';
import { Admin } from '../models/Admin';
import { Client, type IClient } from '../models/Client';
import { Service, type IService } from '../models/Service';
import { Product, type IProduct } from '../models/Product';
import { ServiceRecord, type IServiceRecord } from '../models/ServiceRecord';

const asUser = (userId: string | null) => {
    authState.userId = userId;
};

const USER_A = 'user_tenant_a';
const USER_B = 'user_tenant_b';
const USER_NO_TENANT = 'user_no_tenant';

let mongod: MongoMemoryServer;

let tenantAId: string;
let tenantBId: string;
let clientA: IClient;
let clientB1: IClient;
let serviceA: IService;
let serviceB: IService;
let productA: IProduct;
let productB: IProduct;
let recordB1: IServiceRecord;

describe('EP-08 — Aislamiento multi-tenant', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());

        // --- Tenants ---
        const tenantA = await Tenant.create({ name: 'Estética A' });
        const tenantB = await Tenant.create({ name: 'Estética B' });
        tenantAId = tenantA.id;
        tenantBId = tenantB.id;

        // --- Admins (uno por tenant) ---
        await Admin.create({ externalId: USER_A, email: 'admin.a@test.com', tenantId: tenantA._id });
        await Admin.create({ externalId: USER_B, email: 'admin.b@test.com', tenantId: tenantB._id });

        // Admin legado sin tenant (inserción cruda para saltear la validación required del schema)
        await Admin.collection.insertOne({
            externalId: USER_NO_TENANT,
            email: 'no.tenant@test.com',
            role: 'ADMIN',
            isActive: true
        });

        // --- Datos del Tenant A ---
        clientA = await Client.create({ tenantId: tenantA._id, firstName: 'Ana', lastName: 'Alvarez' });
        serviceA = await Service.create({ tenantId: tenantA._id, name: 'Color A', defaultTouchupDays: 30 });
        productA = await Product.create({ tenantId: tenantA._id, name: 'Oxidante 20 Vol', brand: 'Wella', stock: 10 });
        await ServiceRecord.create({
            tenantId: tenantA._id,
            client: clientA._id,
            service: serviceA._id,
            serviceDate: new Date('2026-05-01T10:00:00.000Z'),
            nextTouchupDate: new Date('2026-07-01T10:00:00.000Z'),
            touchupStatus: 'pending'
        });

        // --- Datos del Tenant B ---
        clientB1 = await Client.create({ tenantId: tenantB._id, firstName: 'Berta', lastName: 'Benitez' });
        const clientB2 = await Client.create({ tenantId: tenantB._id, firstName: 'Bruno', lastName: 'Barrios' });
        serviceB = await Service.create({ tenantId: tenantB._id, name: 'Color B', defaultTouchupDays: 45 });
        productB = await Product.create({ tenantId: tenantB._id, name: 'Oxidante 30 Vol', brand: 'Loreal', stock: 10 });
        recordB1 = await ServiceRecord.create({
            tenantId: tenantB._id,
            client: clientB1._id,
            service: serviceB._id,
            serviceDate: new Date('2026-05-02T10:00:00.000Z'),
            nextTouchupDate: new Date('2026-08-01T10:00:00.000Z'),
            touchupStatus: 'pending'
        });
        await ServiceRecord.create({
            tenantId: tenantB._id,
            client: clientB2._id,
            service: serviceB._id,
            serviceDate: new Date('2026-05-03T10:00:00.000Z'),
            nextTouchupDate: new Date('2026-09-01T10:00:00.000Z'),
            touchupStatus: 'pending'
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongod.stop();
    });

    // ============================
    // Gates de autenticación / tenant
    // ============================

    it('rechaza con 401 los requests sin usuario autenticado', async () => {
        asUser(null);
        const res = await request(app).get('/api/clientes');
        expect(res.status).toBe(401);
    });

    it('rechaza con 403 a un admin sin tenant asignado', async () => {
        asUser(USER_NO_TENANT);
        const res = await request(app).get('/api/clientes');
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('tenant');
    });

    // ============================
    // Listados: cada tenant ve solo lo suyo
    // ============================

    it('GET /api/clientes devuelve solo los clientes del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/clientes');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].firstName).toBe('Ana');
    });

    it('GET /api/clientes devuelve solo los clientes del tenant B', async () => {
        asUser(USER_B);
        const res = await request(app).get('/api/clientes');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('GET /api/servicios devuelve solo los servicios del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/servicios');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Color A');
    });

    it('GET /api/productos devuelve solo los productos del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/productos');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('Oxidante 20 Vol');
    });

    it('GET /api/registros/recientes devuelve solo los registros del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/registros/recientes');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it('GET /api/registros/retoques devuelve solo los retoques del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/registros/retoques');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it('GET /api/registros/cliente/:id de un cliente ajeno devuelve lista vacía', async () => {
        asUser(USER_A);
        const res = await request(app).get(`/api/registros/cliente/${clientB1.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    it('GET /api/dashboard/stats cuenta solo los datos del tenant A', async () => {
        asUser(USER_A);
        const res = await request(app).get('/api/dashboard/stats');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            totalClients: 1,
            servicesDone: 1,
            upcomingTouchups: 1
        });
    });

    // ============================
    // Acceso por ID cruzado: tenant A no toca recursos de tenant B
    // ============================

    it('GET /api/clientes/:id de tenant B con credenciales de A devuelve 404', async () => {
        asUser(USER_A);
        const res = await request(app).get(`/api/clientes/${clientB1.id}`);
        expect(res.status).toBe(404);

        // El dueño legítimo sí lo ve
        asUser(USER_B);
        const resOwner = await request(app).get(`/api/clientes/${clientB1.id}`);
        expect(resOwner.status).toBe(200);
    });

    it('PUT /api/clientes/:id de tenant B con credenciales de A devuelve 404 y no modifica nada', async () => {
        asUser(USER_A);
        const res = await request(app)
            .put(`/api/clientes/${clientB1.id}`)
            .send({ firstName: 'Hackeada' });
        expect(res.status).toBe(404);

        const untouched = await Client.findById(clientB1._id);
        expect(untouched?.firstName).toBe('Berta');
    });

    it('GET /api/servicios/:id de tenant B con credenciales de A devuelve 404', async () => {
        asUser(USER_A);
        const res = await request(app).get(`/api/servicios/${serviceB.id}`);
        expect(res.status).toBe(404);
    });

    it('DELETE /api/clientes/:id de tenant B con credenciales de A devuelve 404 y no desactiva', async () => {
        asUser(USER_A);
        const res = await request(app).delete(`/api/clientes/${clientB1.id}`);
        expect(res.status).toBe(404);

        const untouched = await Client.findById(clientB1._id);
        expect(untouched?.isActive).toBe(true);
    });

    it('DELETE /api/registros/:id de tenant B con credenciales de A devuelve 404 y no borra', async () => {
        asUser(USER_A);
        const res = await request(app).delete(`/api/registros/${recordB1.id}`);
        expect(res.status).toBe(404);

        const stillThere = await ServiceRecord.findById(recordB1._id);
        expect(stillThere).not.toBeNull();
    });

    it('POST /api/productos/:id/stock de un producto ajeno devuelve 404 y no altera el stock', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post(`/api/productos/${productB.id}/stock`)
            .send({ quantity: -5 });
        expect(res.status).toBe(404);

        const untouched = await Product.findById(productB._id);
        expect(untouched?.stock).toBe(10);
    });

    // ============================
    // Registros de visita: vectores de fuga cross-tenant
    // ============================

    it('POST /api/registros con un client de otro tenant devuelve 404', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/registros')
            .send({
                client: clientB1.id,
                service: serviceA.id,
                serviceDate: '2026-06-10T10:00:00.000Z'
            });
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('Cliente');
    });

    it('POST /api/registros con un service de otro tenant devuelve 404', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/registros')
            .send({
                client: clientA.id,
                service: serviceB.id,
                serviceDate: '2026-06-10T10:00:00.000Z'
            });
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('Servicio');
    });

    it('POST /api/registros no permite descontar stock de un producto de otro tenant', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/registros')
            .send({
                client: clientA.id,
                service: serviceA.id,
                serviceDate: '2026-06-10T10:00:00.000Z',
                productsUsed: [{ product: productB.id, quantity: 2 }]
            });
        expect(res.status).toBe(404);

        const untouched = await Product.findById(productB._id);
        expect(untouched?.stock).toBe(10);
    });

    it('POST /api/registros con datos propios funciona, descuenta stock y guarda tenantId', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/registros')
            .send({
                client: clientA.id,
                service: serviceA.id,
                serviceDate: '2026-06-10T10:00:00.000Z',
                productsUsed: [{ product: productA.id, quantity: 2 }]
            });
        expect(res.status).toBe(201);
        expect(res.body.tenantId).toBe(tenantAId);

        const updatedProduct = await Product.findById(productA._id);
        expect(updatedProduct?.stock).toBe(8);
    });

    it('PUT /api/registros/:id ignora tenantId y client maliciosos en el body (anti mass-assignment)', async () => {
        asUser(USER_B);
        const res = await request(app)
            .put(`/api/registros/${recordB1.id}`)
            .send({
                tenantId: tenantAId,
                client: clientA.id,
                notes: 'Nota legítima actualizada'
            });
        expect(res.status).toBe(200);

        const record = await ServiceRecord.findById(recordB1._id);
        // El tenantId y el client originales se preservan intactos
        expect(record?.tenantId.toString()).toBe(tenantBId);
        expect(record?.client.toString()).toBe(clientB1.id);
        // El campo whitelisteado sí se actualizó
        expect(record?.notes).toBe('Nota legítima actualizada');
    });

    // ============================
    // Productos: la unicidad name+brand es por tenant
    // ============================

    it('POST /api/productos permite crear el mismo name+brand que tiene otro tenant', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/productos')
            .send({ name: 'Oxidante 30 Vol', brand: 'Loreal', stock: 3 });
        expect(res.status).toBe(201);
        expect(res.body.tenantId).toBe(tenantAId);

        // Y dentro del mismo tenant sí lo detecta como duplicado
        const dup = await request(app)
            .post('/api/productos')
            .send({ name: 'oxidante 30 vol', brand: 'LOREAL', stock: 1 });
        expect(dup.status).toBe(400);
    });

    it('POST /api/productos/bulk hace upsert solo dentro del tenant propio', async () => {
        asUser(USER_A);
        const res = await request(app)
            .post('/api/productos/bulk')
            .send([{ name: 'Oxidante 30 Vol', brand: 'Loreal', stock: 5 }]);
        expect(res.status).toBe(200);

        // El producto homónimo de tenant B no fue tocado
        const productOfB = await Product.findById(productB._id);
        expect(productOfB?.stock).toBe(10);

        // El de tenant A (creado en el test anterior con stock 3) recibió el incremento
        const productOfA = await Product.findOne({ tenantId: tenantAId, name: 'Oxidante 30 Vol', brand: 'Loreal' });
        expect(productOfA?.stock).toBe(8);
    });
});
