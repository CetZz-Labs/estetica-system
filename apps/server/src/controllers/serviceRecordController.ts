import { Request, Response } from 'express';
import { ServiceRecord } from '../models/ServiceRecord';
import { Service } from '../models/Service';
import { Product } from '../models/Product';

// 1. Create (POST /api/registros)
export const createServiceRecord = async (req: Request, res: Response) => {
    try {
        const { client, service, serviceDate, notes, productsUsed, nextTouchupDate } = req.body;

        // 1. Lógica de fecha de retoque
        let finalNextTouchupDate = nextTouchupDate;
        if (!finalNextTouchupDate) {
            const foundService = await Service.findById(service);
            if (foundService && foundService.defaultTouchupDays && foundService.defaultTouchupDays > 0) {
                const date = new Date(serviceDate);
                date.setDate(date.getDate() + foundService.defaultTouchupDays);
                finalNextTouchupDate = date;
            }
        }

        // 2. LÓGICA DE DESCUENTO DE STOCK
        if (productsUsed && Array.isArray(productsUsed) && productsUsed.length > 0) {
            for (const item of productsUsed) {
                const product = await Product.findById(item.product);

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
        await ServiceRecord.updateMany(
            {
                client: client,
                service: service,
                touchupStatus: 'pending'
            },
            {
                $set: { touchupStatus: 'completed' }
            }
        );

        // 4. Crear el registro con la nueva estructura de productos
        const newRecord = new ServiceRecord({
            client,
            service,
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

// 2. Read - Historial por Cliente (GET /api/registros/cliente/:clientId)
export const getClientRecords = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;

        const records = await ServiceRecord.find({ client: clientId })
            .populate('service', 'name') // Solo traemos el nombre del servicio
            .populate('productsUsed.product', 'name')
            .sort({ serviceDate: -1 }); // El más reciente primero (descendente)

        return res.status(200).json(records);
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
            touchupStatus: 'pending',
            nextTouchupDate: { $ne: null }
        })
            .populate('client', 'firstName lastName phone')
            .populate('service', 'name')
            .sort({ nextTouchupDate: 1 }); // Ascendente: los más urgentes (fechas más tempranas) primero

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
        const updateData = req.body; // express-validator se encarga de que aquí solo vengan campos permitidos y válidos

        const updatedRecord = await ServiceRecord.findByIdAndUpdate(
            id,
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

        // IMPORTANTE: Borrado físico como fue requerido para casos de error de carga
        const deletedRecord = await ServiceRecord.findByIdAndDelete(id);

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
        // Traemos los últimos 10 servicios registrados, sin importar el estado del retoque
        const records = await ServiceRecord.find()
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
