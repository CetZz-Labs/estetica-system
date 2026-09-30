import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Product } from '../models/Product';
import { consumeProducts, reconcileProducts, restoreProducts, StockError } from '../services/stockService';

let mongod: MongoMemoryServer;
const tenantA = new mongoose.Types.ObjectId();
const tenantB = new mongoose.Types.ObjectId();

const mk = (tenantId: mongoose.Types.ObjectId, stock: number, currentUnitLevel?: number) =>
    Product.create({ tenantId, name: 'Tinte', brand: 'X', stock, currentUnitLevel });

const state = async (id: unknown) => {
    const p = await Product.findById(id).lean();
    return { stock: p!.stock, level: p!.currentUnitLevel };
};

describe('UX-90 — stockService (Mongo en memoria)', () => {
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

    it('consume 30% sin abierto y deriva los campos del item', async () => {
        const p = await mk(tenantA, 5);
        const items = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 30 }]);
        expect(await state(p._id)).toEqual({ stock: 4, level: 70 }); // se abre uno: stock-1
        expect(items[0]).toMatchObject({ quantity: 1, usedPercent: 30, remainingLevel: 70, usedExistingUnit: false });
    });

    it('con abierto, drena primero el abierto: al agotarlo limpia el nivel y NO toca el stock', async () => {
        const p = await mk(tenantA, 5, 70);
        const items = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 70 }]);
        expect(await state(p._id)).toEqual({ stock: 5, level: undefined });
        expect(items[0]).toMatchObject({ usedExistingUnit: true, remainingLevel: 0 });
    });

    it('abierto completo + 30% de uno nuevo (L=70, U=100): stock-1 y abierto al 70', async () => {
        const p = await mk(tenantA, 5, 70);
        await consumeProducts(tenantA, [{ product: p.id, usedPercent: 100 }]);
        expect(await state(p._id)).toEqual({ stock: 4, level: 70 });
    });

    it('stock 0 con abierto es utilizable; más que el abierto da 400', async () => {
        const p = await mk(tenantA, 0, 40);
        await consumeProducts(tenantA, [{ product: p.id, usedPercent: 30 }]);
        expect(await state(p._id)).toEqual({ stock: 0, level: 10 });
        await expect(consumeProducts(tenantA, [{ product: p.id, usedPercent: 11 }]))
            .rejects.toMatchObject({ status: 400 });
        expect(await state(p._id)).toEqual({ stock: 0, level: 10 });
    });

    it('quantity legacy equivale a envases enteros', async () => {
        const p = await mk(tenantA, 5);
        await consumeProducts(tenantA, [{ product: p.id, quantity: 2 }]);
        expect(await state(p._id)).toEqual({ stock: 3, level: undefined });
    });

    it('stock insuficiente: 400 y no muta nada (validación previa a escribir)', async () => {
        const a = await mk(tenantA, 5);
        const b = await mk(tenantA, 1);
        await expect(
            consumeProducts(tenantA, [{ product: a.id, usedPercent: 100 }, { product: b.id, usedPercent: 101 }])
        ).rejects.toMatchObject({ status: 400 });
        expect(await state(a._id)).toEqual({ stock: 5, level: undefined });
    });

    it('duplicados: 400; producto de otro tenant: 404', async () => {
        const a = await mk(tenantA, 5);
        const other = await mk(tenantB, 5);
        await expect(consumeProducts(tenantA, [{ product: a.id, usedPercent: 10 }, { product: a.id, usedPercent: 10 }]))
            .rejects.toMatchObject({ status: 400 });
        await expect(consumeProducts(tenantA, [{ product: other.id, usedPercent: 10 }]))
            .rejects.toMatchObject({ status: 404 });
        expect(await state(other._id)).toEqual({ stock: 5, level: undefined });
    });

    it('update por delta de puntos y delete restauran el pool (ejemplo del digest)', async () => {
        const p = await mk(tenantA, 5);
        const a = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 100 }]); // S=4
        const b = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 30 }]); // P=370: S=3, L=70
        expect(await state(p._id)).toEqual({ stock: 3, level: 70 });

        // editar A de 100 a 50 devuelve 50 puntos: P = 370 + 50 = 420
        await reconcileProducts(tenantA, a, [{ product: p.id, usedPercent: 50 }]);
        expect(await state(p._id)).toEqual({ stock: 4, level: 20 });

        await restoreProducts(tenantA, a.map((i) => ({ ...i, usedPercent: 50 })));
        expect(await state(p._id)).toEqual({ stock: 4, level: 70 });
        await restoreProducts(tenantA, b);
        expect(await state(p._id)).toEqual({ stock: 5, level: undefined });
    });

    it('update: producto que desaparece devuelve puntos; update con delta > disponible da 400', async () => {
        const p = await mk(tenantA, 1);
        const items = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 100 }]); // S=0
        await reconcileProducts(tenantA, items, []);
        expect(await state(p._id)).toEqual({ stock: 1, level: undefined });
        await expect(reconcileProducts(tenantA, [], [{ product: p.id, usedPercent: 101 }]))
            .rejects.toBeInstanceOf(StockError);
    });

    it('delete ignora productos huérfanos', async () => {
        const p = await mk(tenantA, 2);
        const items = await consumeProducts(tenantA, [{ product: p.id, usedPercent: 100 }]);
        await Product.deleteOne({ _id: p._id });
        await expect(restoreProducts(tenantA, items)).resolves.toBeUndefined();
    });

    it('409 tras agotar reintentos cuando el producto cambia constantemente', async () => {
        const p = await mk(tenantA, 5);
        const real = Product.updateOne.bind(Product);
        // Simula un request concurrente: antes de cada escritura condicional cambia el stock.
        (Product as unknown as { updateOne: unknown }).updateOne = async (...args: Parameters<typeof real>) => {
            await Product.collection.updateOne({ _id: p._id }, { $inc: { stock: 1 } });
            return real(...args);
        };
        try {
            await expect(consumeProducts(tenantA, [{ product: p.id, usedPercent: 10 }]))
                .rejects.toMatchObject({ status: 409 });
        } finally {
            (Product as unknown as { updateOne: unknown }).updateOne = real;
        }
    });
});
