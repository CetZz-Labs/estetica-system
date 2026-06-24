# Catálogo de Patrones de Implementación — Backend (Maison CRM API)

> **Qué es esto:** templates copy-paste extraídos de código ya auditado y de las reglas canónicas de gobernanza. Antes de implementar un listado paginado, un lookup multi-tenant, una ruta validada, un control de stock o una carga masiva, **copiá el patrón de aquí** en vez de reinventarlo o copy-pastear de un controlador cerrado.
>
> **Stack:** Node.js + Express 4.21 + TypeScript + Mongoose 9.6 + Clerk Express. Sandbox: `apps/server/`.
>
> **Fuente canónica de las reglas:** los *porqués* y mandatos de seguridad viven en [`governance-rules.md`](governance-rules.md). Este archivo solo da el **cómo** (código de referencia). Ante contradicción, manda `governance-rules.md` + `CHECKPOINTS.md`.

**Índice:**
- [P1 — Listado paginado con multi-tenancy](#p1--listado-paginado-con-multi-tenancy)
- [P2 — Lookup tenant-scoped (anti-IDOR)](#p2--lookup-tenant-scoped-anti-idor)
- [P3 — Ruta validada con express-validator](#p3--ruta-validada-con-express-validator)
- [P4 — Control de stock seguro](#p4--control-de-stock-seguro)
- [P5 — Carga masiva con upsert](#p5--carga-masiva-con-upsert)
- [P6 — Registro de visita con auto-retoque](#p6--registro-de-visita-con-auto-retoque)
- [P7 — Controller con manejo de errores](#p7--controller-con-manejo-de-errores)

---

## P1 — Listado paginado con multi-tenancy

> **Gate de rechazo:** el `reviewer` rechaza cualquier endpoint que devuelva una colección de filas de negocio **potencialmente ilimitada** (clientes, visitas, productos, turnos) como array plano sin `skip`/`limit`. Ver `CHECKPOINTS.md` C3 → "Paginación Obligatoria".

**Mandato:** todo listado de negocio pagina a **7 ítems/página** (page-size estándar). El filtrado y la búsqueda se resuelven **en el servidor** (Mongo query), nunca delegados al cliente. El `total` se calcula sobre el dataset filtrado **y por tenant**.

**Contrato de salida:** `{ data: T[], meta: { total, page, limit, totalPages } }`.

```typescript
// controllers/clientController.ts
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 7; // page-size estándar de negocio

export const getClients = async (req: Request, res: Response) => {
    try {
        const page = Math.max(DEFAULT_PAGE, Number(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || PAGE_SIZE));
        const search = (req.query.search as string)?.trim();

        // Filtro SIEMPRE scopeado por tenant + soft-delete. Búsqueda server-side.
        const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const [data, total] = await Promise.all([
            Client.find(filter).sort({ lastName: 1 }).skip((page - 1) * limit).limit(limit),
            Client.countDocuments(filter),
        ]);

        return res.status(200).json({
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

**Exenciones explícitas (NO paginar):**
- **Widgets de dashboard** con `limit` fijo de diseño (`getRecentRecords` → 10, próximos retoques → N fijo).
- **Catálogos acotados** con tope pequeño y conocido (selects/dropdowns de servicios).
- **Rankings / top-N** que no son tablas navegables: array plano ordenado con `.limit(N)` fijo, renderizado sin controles de paginación.
- **Agregaciones / KPIs** que no devuelven filas (`dashboard/stats`).

---

## P2 — Lookup tenant-scoped (anti-IDOR)

> **Regla canónica:** [`governance-rules.md#gov-tenant`](governance-rules.md#gov-tenant--aislamiento-multi-tenant) mandato 3. **Gate SEC-B** en `CHECKPOINTS.md` C7.

**Mandato:** ningún endpoint busca un recurso por `_id` sin filtrar también por `tenantId`. Un `_id` de otro tenant retorna **404 Not Found** (nunca 403 — no revelar existencia). Prohibido `findById` / `findByIdAndUpdate` / `findByIdAndDelete` directos en modelos de negocio.

```typescript
// ❌ Prohibido — fuga cross-tenant (IDOR)
const client = await Client.findById(req.params.id);

// ✅ Correcto — scopeado por tenant
export const getClientById = async (req: Request, res: Response) => {
    try {
        const client = await Client.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        return res.status(200).json(client);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ✅ Update — whitelist explícita de campos editables (anti mass-assignment de tenantId)
export const updateClient = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, phone, medicalNotes } = req.body;
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { $set: { firstName, lastName, phone, medicalNotes } },
            { new: true, runValidators: true },
        );
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        return res.status(200).json(client);
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

**Referencias del body** (ej. `client`, `service`, `product` al crear un servicerecord) DEBEN validarse contra el tenant del request antes de usarse — ver P6.

---

## P3 — Ruta validada con express-validator

> **Regla canónica:** [`governance-rules.md#gov-auth`](governance-rules.md#gov-auth--autenticación-y-control-de-acceso) + validación de DTOs. **Gate SEC-A / SEC-D** en `CHECKPOINTS.md` C7.

**Mandato:** todo router protegido aplica `checkAdminAccess` y `checkTenantAccess` (Fase 2+) a nivel de router. Todo POST/PUT valida el body con `express-validator` en array inline, con `validateRequest` como **último** elemento. Los query params numéricos se validan también (no confiar en coerción implícita).

```typescript
// routes/clientRoutes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkAdminAccess } from '../middlewares/authMiddleware';
import { checkTenantAccess } from '../middlewares/tenantMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { getClients, getClientById, createClient, updateClient, deleteClient } from '../controllers/clientController';

const router: Router = Router();

// Toda la superficie protegida: auth + tenant resolver
router.use(checkAdminAccess);
router.use(checkTenantAccess);

router.get(
    '/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        validateRequest,
    ],
    getClients,
);

router.get('/:id', [param('id').isMongoId(), validateRequest], getClientById);

router.post(
    '/',
    [
        body('firstName').trim().notEmpty().withMessage('El nombre es obligatorio'),
        body('lastName').trim().notEmpty().withMessage('El apellido es obligatorio'),
        body('phone').optional().trim(),
        body('medicalNotes').optional().trim(),
        validateRequest,
    ],
    createClient,
);

router.put('/:id', [param('id').isMongoId(), body('firstName').optional().trim().notEmpty(), validateRequest], updateClient);
router.delete('/:id', [param('id').isMongoId(), validateRequest], deleteClient);

export default router;
```

Montaje en `server.ts`: `app.use('/api/clientes', clientRoutes)`.

---

## P4 — Control de stock seguro

> **Regla canónica:** [`governance-rules.md#gov-stock`](governance-rules.md#gov-stock--control-de-inventario-y-stock). **Gate** en `CHECKPOINTS.md` C3 → "Control de Stock".

**Mandato:** validación Mongoose `min: [0, ...]` en el campo `stock`. Toda operación de egreso valida stock suficiente **antes** de descontar. El egreso usa `$inc` negativo dentro de un lookup tenant-scoped.

```typescript
// controllers/productController.ts
export const adjustStock = async (req: Request, res: Response) => {
    try {
        const { type, quantity } = req.body as { type: 'in' | 'out'; quantity: number };

        const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Regla de negocio: el stock nunca queda negativo. Rechazar el egreso, no clampear.
        if (type === 'out' && product.stock - quantity < 0) {
            return res.status(400).json({
                error: `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${quantity}`,
            });
        }

        const delta = type === 'in' ? quantity : -quantity;
        product.stock += delta;
        await product.save(); // dispara validación min: 0 como red de seguridad

        return res.status(200).json(product);
    } catch (error) {
        console.error('Error al ajustar stock:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

---

## P5 — Carga masiva con upsert

> **Regla canónica:** [`governance-rules.md#gov-stock`](governance-rules.md#gov-stock--control-de-inventario-y-stock) mandato 4.

**Mandato:** identificar producto por `tenantId + name + brand` (case-insensitive) para upsert. En `bulkWrite`, `tenantId` va en el **`filter`** Y en **`$setOnInsert`**. Si el producto existe, se **suma** el stock con `$inc`; si no, se crea.

```typescript
// controllers/productController.ts
export const createBulkProducts = async (req: Request, res: Response) => {
    try {
        const rows = req.body.products as { name: string; brand: string; stock: number; description?: string }[];

        const operations = rows.map((row) => ({
            updateOne: {
                filter: {
                    tenantId: req.tenantId,
                    name: row.name.trim(),
                    brand: row.brand.trim(),
                },
                update: {
                    $inc: { stock: row.stock },
                    $setOnInsert: {
                        tenantId: req.tenantId,
                        name: row.name.trim(),
                        brand: row.brand.trim(),
                        description: row.description?.trim(),
                        isActive: true,
                    },
                },
                upsert: true,
            },
        }));

        const result = await Product.bulkWrite(operations);
        return res.status(200).json({
            created: result.upsertedCount,
            updated: result.modifiedCount,
        });
    } catch (error) {
        console.error('Error en carga masiva:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

---

## P6 — Registro de visita con auto-retoque

> **Regla canónica:** [`governance-rules.md#gov-visit`](governance-rules.md#gov-visit--registro-de-visitas-y-retoques) + [`#gov-stock`](governance-rules.md#gov-stock--control-de-inventario-y-stock).

**Mandato (orden estricto):**
1. Validar que `client`, `service` y cada `product` del body pertenecen al tenant del request (anti-IDOR cruzado).
2. Calcular `nextTouchupDate = serviceDate + service.defaultTouchupDays` (si `> 0` y no se provee manualmente).
3. Descontar stock de cada insumo (validando suficiente — ver P4).
4. Auto-completar el retoque anterior del mismo `tenantId + client + service` con `touchupStatus: 'pending'`.
5. Crear el servicerecord nuevo con `touchupStatus: 'pending'`.

```typescript
// controllers/serviceRecordController.ts
export const createServiceRecord = async (req: Request, res: Response) => {
    try {
        const { client, service, serviceDate, notes, productsUsed = [], nextTouchupDate } = req.body;

        // 1. Validar referencias contra el tenant (anti-IDOR cruzado)
        const [clientDoc, serviceDoc] = await Promise.all([
            Client.findOne({ _id: client, tenantId: req.tenantId }),
            Service.findOne({ _id: service, tenantId: req.tenantId }),
        ]);
        if (!clientDoc || !serviceDoc) {
            return res.status(400).json({ error: 'Cliente o servicio inválido para este negocio' });
        }

        // 2. Cálculo de próximo retoque (manual prevalece sobre automático)
        let touchupDate: Date | undefined = nextTouchupDate ? new Date(nextTouchupDate) : undefined;
        if (!touchupDate && serviceDoc.defaultTouchupDays > 0) {
            touchupDate = new Date(serviceDate);
            touchupDate.setDate(touchupDate.getDate() + serviceDoc.defaultTouchupDays);
        }

        // 3. Descontar stock (validar suficiencia antes)
        for (const item of productsUsed) {
            const product = await Product.findOne({ _id: item.product, tenantId: req.tenantId });
            if (!product) {
                return res.status(400).json({ error: 'Insumo inválido para este negocio' });
            }
            if (product.stock - item.quantity < 0) {
                return res.status(400).json({ error: `Stock insuficiente de ${product.name}` });
            }
            product.stock -= item.quantity;
            await product.save();
        }

        // 4. Auto-completar retoque anterior del mismo cliente+servicio
        await ServiceRecord.updateMany(
            { tenantId: req.tenantId, client, service, touchupStatus: 'pending' },
            { $set: { touchupStatus: 'completed' } },
        );

        // 5. Crear el nuevo registro (nace pending)
        const record = await ServiceRecord.create({
            tenantId: req.tenantId,
            client,
            service,
            serviceDate,
            notes,
            productsUsed,
            nextTouchupDate: touchupDate,
            touchupStatus: 'pending',
        });

        return res.status(201).json(record);
    } catch (error) {
        console.error('Error al crear registro de servicio:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

> **Nota de atomicidad:** MongoDB sin réplica no soporta transacciones multi-documento. El orden (validar → descontar → crear) minimiza el riesgo de estado inconsistente. Si en el futuro se habilita un replica set, envolver los pasos 3–5 en una sesión transaccional (`session.withTransaction`).

---

## P7 — Controller con manejo de errores

> **Regla canónica:** `docs/conventions.md` → "Patrones de Error (Backend)". No existe middleware global de errores: **cada controller maneja los suyos**.

**Mandato:** cada controller envuelve su lógica en `try/catch`. En el catch: `console.error('Contexto:', error)` + `res.status(500).json({ error: '...' })`. Los errores de negocio retornan 400 con mensaje descriptivo. Los stack traces de Mongoose **nunca** se propagan al cliente.

```typescript
export const someController = async (req: Request, res: Response) => {
    try {
        // Regla de negocio violada → 400 descriptivo
        if (/* condición inválida */ false) {
            return res.status(400).json({ error: 'Mensaje claro de la regla violada' });
        }
        const result = await SomeModel.find({ tenantId: req.tenantId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Contexto del error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

**Códigos HTTP canónicos:** 200 (GET/PUT/DELETE), 201 (POST), 400 (validación/negocio), 401 (no autenticado), 403 (no autorizado), 404 (no encontrado), 500 (interno). Formato de error siempre `{ error: 'mensaje descriptivo' }`.

---

> **Cómo extender este catálogo:** cuando una feature cerrada produzca un patrón, gotcha o workaround genuinamente nuevo y reutilizable (no cubierto aquí ni en `architecture.md`/`conventions.md`), el `leader` lo promueve a este archivo durante el cierre de sesión. No duplicar patrones que solo reafirman una convención ya documentada.
