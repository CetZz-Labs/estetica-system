import { Request, Response } from 'express';
import { ServiceRecord } from '../models/ServiceRecord';
import { Service } from '../models/Service';
import { Product } from '../models/Product';
import { Client } from '../models/Client';
import { Professional } from '../models/Professional';
import { Tenant } from '../models/Tenant';
import { isBeforeCalendarDay } from '../utils/dateUtils';

// 1. Create (POST /api/registros)
export const createServiceRecord = async (req: Request, res: Response) => {
    try {
        const { client, service, professional, serviceDate, notes, productsUsed, nextTouchupDate, isBackfill } = req.body;
        const tenantId = req.tenantId;

        // 0. VALIDACIÓN MULTI-TENANT: el cliente del body debe pertenecer al tenant autenticado
        const foundClient = await Client.findOne({ _id: client, tenantId });
        if (!foundClient) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // 0.b. El servicio referenciado también debe pertenecer al tenant
        const foundService = await Service.findOne({ _id: service, tenantId });
        if (!foundService) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        // 0.c. EP-11: la profesional es requerida en visitas nuevas y debe pertenecer
        // al tenant + estar activa (legacy queda sin professional, ver schema).
        if (!professional) {
            return res.status(400).json({ error: 'La profesional (professional) es obligatoria' });
        }
        const foundProfessional = await Professional.findOne({ _id: professional, tenantId, isActive: true });
        if (!foundProfessional) {
            return res.status(400).json({ error: 'Profesional no válida para este negocio' });
        }

        // 1. Lógica de fecha de retoque — el usuario tiene control total: no hay auto-cálculo.
        const finalNextTouchupDate = nextTouchupDate;

        // Resolución única del tenant/tz, reusada por el guard de serviceDate (UX-69) y el de
        // nextTouchupDate (UX-27) para evitar una segunda query a Tenant.
        const tenant = await Tenant.findById(tenantId);
        const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';

        // UX-69: por defecto (isBackfill falso/ausente) serviceDate no puede ser una fecha pasada
        // — flujo normal de registro del día. Con isBackfill=true el usuario declara explícitamente
        // que está cargando una visita pasada, y en ese caso serviceDate DEBE ser estrictamente
        // anterior a hoy (no tendría sentido de negocio usar el flag para hoy/futuro). Mismo
        // criterio de "día calendario" en zona horaria del tenant que el guard de nextTouchupDate.
        // Comparación estricta contra `true` (mismo patrón que `confirm` en professionalController.ts):
        // el validator `isBoolean()` de express-validator también acepta strings como 'false' sin
        // convertirlas, y `!isBackfill` trataría un string 'false' truthy como si fuera true.
        const backfillFlag = isBackfill === true || isBackfill === 'true';
        if (!backfillFlag) {
            if (isBeforeCalendarDay(new Date(serviceDate), new Date(), tz)) {
                return res.status(400).json({ error: 'La fecha del servicio no puede ser anterior al día de hoy' });
            }
        } else {
            if (!isBeforeCalendarDay(new Date(serviceDate), new Date(), tz)) {
                return res.status(400).json({ error: 'Una visita pasada debe tener una fecha anterior a hoy' });
            }
        }

        // UX-27: nextTouchupDate no puede ser una fecha ya pasada. Se compara contra el día
        // calendario actual (no el instante exacto): si cae hoy, es válido aunque la hora ya
        // haya pasado. El "hoy" se calcula en la zona horaria del tenant (no la del proceso
        // servidor), mismo patrón que `checkBusinessHours` en appointmentController.ts.
        if (finalNextTouchupDate) {
            if (isBeforeCalendarDay(new Date(finalNextTouchupDate), new Date(), tz)) {
                return res.status(400).json({ error: 'La fecha de próximo retoque no puede ser anterior al día de hoy' });
            }
        }

        // 2. LÓGICA DE DESCUENTO DE STOCK (solo productos del tenant)
        if (productsUsed && Array.isArray(productsUsed) && productsUsed.length > 0) {
            for (const item of productsUsed) {
                const product = await Product.findOne({ _id: item.product, tenantId });

                if (!product) {
                    return res.status(404).json({ error: `Producto con ID ${item.product} no encontrado` });
                }

                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`
                    });
                }

                // Descontamos el stock
                product.stock -= item.quantity;
                await product.save();
            }
        }

        // ⭐️ 3. LÓGICA DE AUTO-COMPLETADO DE RETOQUES (NUEVO)
        // Buscamos si el cliente tenía retoques pendientes para este mismo servicio y los cerramos.
        // UX-13: solo se auto-completan los retoques cuya fecha (nextTouchupDate) ya fue superada
        // por esta nueva visita (anterior o igual a serviceDate). Un retoque pendiente con fecha
        // futura respecto a esta visita debe permanecer intacto ('pending').
        await ServiceRecord.updateMany(
            {
                tenantId: tenantId,
                client: client,
                service: service,
                touchupStatus: 'pending',
                nextTouchupDate: { $lte: new Date(serviceDate) }
            },
            {
                $set: { touchupStatus: 'completed' }
            }
        );

        // 4. Crear el registro con la nueva estructura de productos
        const newRecord = new ServiceRecord({
            tenantId,
            client,
            service,
            professional,
            serviceDate,
            notes,
            productsUsed,
            nextTouchupDate: finalNextTouchupDate,
            touchupStatus: 'pending' // Este nuevo registro nace pendiente para el FUTURO retoque
        });

        const savedRecord = await newRecord.save();

        return res.status(201).json(savedRecord);

    } catch (error) {
        console.error('Error al crear el registro:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 1.b Read - Listado general paginado con filtros combinados (GET /api/registros)
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 7; // page-size estándar de negocio (P1)

export const getServiceRecords = async (req: Request, res: Response) => {
    try {
        const page = Math.max(DEFAULT_PAGE, Number(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || PAGE_SIZE));

        const { clientId, serviceId, professionalId, dateFrom, dateTo } = req.query;

        // Filtro SIEMPRE scopeado por tenant. Filtros combinados server-side.
        const filter: Record<string, unknown> = { tenantId: req.tenantId };
        if (clientId) filter.client = clientId;
        if (serviceId) filter.service = serviceId;
        if (professionalId) filter.professional = professionalId;
        if (dateFrom || dateTo) {
            const serviceDateFilter: Record<string, Date> = {};
            if (dateFrom) serviceDateFilter.$gte = new Date(dateFrom as string);
            if (dateTo) serviceDateFilter.$lte = new Date(dateTo as string);
            filter.serviceDate = serviceDateFilter;
        }

        const [data, total] = await Promise.all([
            ServiceRecord.find(filter)
                .populate('client', 'firstName lastName phone')
                .populate('service', 'name')
                .populate('professional', 'name color')
                .populate('productsUsed.product', 'name')
                .sort({ serviceDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            ServiceRecord.countDocuments(filter),
        ]);

        return res.status(200).json({
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error al listar los registros de servicio:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 2. Read - Historial por Cliente, paginado con filtros de fecha (GET /api/registros/cliente/:clientId)
export const getClientRecords = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        const page = Math.max(DEFAULT_PAGE, Number(req.query.page) || DEFAULT_PAGE);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || PAGE_SIZE));
        const { dateFrom, dateTo } = req.query;

        const filter: Record<string, unknown> = { tenantId: req.tenantId, client: clientId };
        if (dateFrom || dateTo) {
            const serviceDateFilter: Record<string, Date> = {};
            if (dateFrom) serviceDateFilter.$gte = new Date(dateFrom as string);
            if (dateTo) serviceDateFilter.$lte = new Date(dateTo as string);
            filter.serviceDate = serviceDateFilter;
        }

        const [data, total] = await Promise.all([
            ServiceRecord.find(filter)
                .populate('service', 'name') // Solo traemos el nombre del servicio
                .populate('professional', 'name color')
                .populate('productsUsed.product', 'name')
                .sort({ serviceDate: -1 }) // El más reciente primero (descendente)
                .skip((page - 1) * limit)
                .limit(limit),
            ServiceRecord.countDocuments(filter),
        ]);

        return res.status(200).json({
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error('Error al obtener el historial del cliente:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener el historial' });
    }
};

// 3. Read - Próximos Retoques / Dashboard (GET /api/registros/retoques)
export const getUpcomingTouchups = async (req: Request, res: Response) => {
    try {
        // Buscamos los que están pendientes. También nos aseguramos de que tengan una fecha programada.
        const records = await ServiceRecord.find({
            tenantId: req.tenantId,
            touchupStatus: 'pending',
            nextTouchupDate: { $ne: null }
        })
            .populate('client', 'firstName lastName phone')
            .populate('service', 'name')
            .populate('professional', 'name color')
            .populate('productsUsed.product', 'name')
            .sort({ nextTouchupDate: 1 }) // Ascendente: los más urgentes (fechas más tempranas) primero
            .limit(7);

        return res.status(200).json(records);
    } catch (error) {
        console.error('Error al obtener los próximos retoques:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los retoques' });
    }
};

// 4. Update (PUT /api/registros/:id)
export const updateServiceRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Paso 0 (UX-67): fetch previo del registro ANTES de tocar cualquier stock.
        // Garantiza el 404 temprano (registro inexistente / de otro tenant) y nos da
        // acceso a productsUsed viejo, necesario para calcular deltas en la reconciliación.
        const existingRecord = await ServiceRecord.findOne({ _id: id, tenantId: req.tenantId });
        if (!existingRecord) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        // Whitelist explícita de campos editables (anti mass-assignment).
        // tenantId, client y service NO son editables vía PUT.
        // productsUsed SÍ es editable (UX-67) vía reconciliación de stock por delta (ver abajo).
        const { serviceDate, notes, nextTouchupDate, touchupStatus, productsUsed } = req.body;

        // UX-27: nextTouchupDate no puede ser una fecha ya pasada. Se compara contra el día
        // calendario actual (no el instante exacto): si cae hoy, es válido aunque la hora ya
        // haya pasado. El "hoy" se calcula en la zona horaria del tenant (no la del proceso
        // servidor), mismo patrón que `checkBusinessHours` en appointmentController.ts.
        if (nextTouchupDate !== undefined && nextTouchupDate !== null) {
            const tenant = await Tenant.findById(req.tenantId);
            const tz = tenant?.timezone || 'America/Argentina/Buenos_Aires';
            if (isBeforeCalendarDay(new Date(nextTouchupDate), new Date(), tz)) {
                return res.status(400).json({ error: 'La fecha de próximo retoque no puede ser anterior al día de hoy' });
            }
        }

        const updateData: Record<string, unknown> = {};
        if (serviceDate !== undefined) updateData.serviceDate = serviceDate;
        if (notes !== undefined) updateData.notes = notes;
        if (nextTouchupDate !== undefined) updateData.nextTouchupDate = nextTouchupDate;
        if (touchupStatus !== undefined) updateData.touchupStatus = touchupStatus;

        // UX-67: reconciliación de stock por delta. undefined = "no tocar productos"
        // (comportamiento preexistente preservado); [] explícito = "vaciar todos los
        // insumos y restaurar el 100% del stock consumido". Por eso el guard es
        // estrictamente `!== undefined`, nunca un chequeo de truthiness/longitud.
        if (productsUsed !== undefined) {
            if (!Array.isArray(productsUsed)) {
                return res.status(400).json({ error: 'productsUsed debe ser una lista (array)' });
            }

            // 1. Rechazar duplicados dentro del nuevo array antes de leer stock.
            const seenIds = new Set<string>();
            for (const item of productsUsed) {
                const productIdStr = String(item.product);
                if (seenIds.has(productIdStr)) {
                    return res.status(400).json({ error: 'Producto duplicado en la lista de insumos' });
                }
                seenIds.add(productIdStr);
            }

            // 2-4. oldMap (registro previo) / newMap (body) / unionIds.
            const oldMap = new Map<string, number>();
            for (const item of existingRecord.productsUsed) {
                oldMap.set(item.product.toString(), item.quantity);
            }

            const newMap = new Map<string, number>();
            for (const item of productsUsed) {
                newMap.set(String(item.product), item.quantity);
            }

            const unionIds = [...new Set([...oldMap.keys(), ...newMap.keys()])];

            if (unionIds.length > 0) {
                // 5. Una sola query, sin filtrar isActive (misma convención que createServiceRecord).
                const products = await Product.find({ _id: { $in: unionIds }, tenantId: req.tenantId });

                if (products.length !== unionIds.length) {
                    // Anti-IDOR: referencia embebida en el body (no el :id de la ruta) → 400, no 404.
                    return res.status(400).json({ error: 'Uno o más insumos no son válidos para este negocio' });
                }

                const productsById = new Map(products.map(p => [p._id.toString(), p]));

                // 6. Fase de validación pura (solo lectura): comprobar suficiencia de stock
                // para cada delta positivo. Si falla, cortar sin haber mutado nada todavía.
                for (const productId of unionIds) {
                    const delta = (newMap.get(productId) ?? 0) - (oldMap.get(productId) ?? 0);
                    if (delta > 0) {
                        const product = productsById.get(productId)!;
                        if (product.stock < delta) {
                            return res.status(400).json({
                                error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Requerido adicional: ${delta}`
                            });
                        }
                    }
                }

                // 7. Fase de escritura: recién ahora, con toda la validación superada, aplicar
                // los deltas. Misma fórmula para ambos signos: delta positivo resta stock,
                // delta negativo (restauración) lo suma.
                for (const productId of unionIds) {
                    const delta = (newMap.get(productId) ?? 0) - (oldMap.get(productId) ?? 0);
                    if (delta !== 0) {
                        const product = productsById.get(productId)!;
                        product.stock -= delta;
                        await product.save();
                    }
                }
            }

            // 8. Normalizado a { product, quantity }[], nunca objetos poblados.
            updateData.productsUsed = productsUsed.map((item: { product: string; quantity: number }) => ({
                product: item.product,
                quantity: item.quantity
            }));
        }

        const updatedRecord = await ServiceRecord.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        return res.status(200).json(updatedRecord);
    } catch (error) {
        console.error('Error al actualizar el registro:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar el registro' });
    }
};

// 5. Delete (DELETE /api/registros/:id)
export const deleteServiceRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // IMPORTANTE: Borrado físico como fue requerido para casos de error de carga (acotado al tenant)
        const deletedRecord = await ServiceRecord.findOneAndDelete({ _id: id, tenantId: req.tenantId });

        if (!deletedRecord) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        return res.status(200).json({
            message: 'Registro eliminado físicamente de forma exitosa',
            record: deletedRecord
        });
    } catch (error) {
        console.error('Error al eliminar el registro:', error);
        return res.status(500).json({ error: 'Error interno del servidor al eliminar el registro' });
    }
};

// Read - Últimos Movimientos (GET /api/registros/recientes)
export const getRecentRecords = async (req: Request, res: Response) => {
    try {
        // Traemos los últimos 10 servicios registrados del tenant, sin importar el estado del retoque
        const records = await ServiceRecord.find({ tenantId: req.tenantId })
            .populate('client', 'firstName lastName')
            .populate('service', 'name')
            .sort({ createdAt: -1 }) // Los creados más recientemente primero
            .limit(10);

        return res.status(200).json(records);
    } catch (error) {
        console.error('Error al obtener movimientos recientes:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
