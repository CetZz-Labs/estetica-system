import { Request, Response } from 'express';
import { Service } from '../models/Service';

// 1. Create (POST /api/servicios)
export const createService = async (req: Request, res: Response) => {
    try {
        const { name, defaultTouchupDays, duration } = req.body;

        const newService = new Service({
            tenantId: req.tenantId,
            name,
            defaultTouchupDays,
            duration,
            isActive: true
        });

        const savedService = await newService.save();

        return res.status(201).json(savedService);
    } catch (error) {
        console.error('Error al crear el servicio:', error);
        return res.status(500).json({ error: 'Error interno del servidor al crear el servicio' });
    }
};

// 2. Read All (GET /api/servicios)
export const getServices = async (req: Request, res: Response) => {
    try {
        // Filtrar por tenant, activos y ordenar alfabéticamente por 'name' (1 ascendente)
        const services = await Service.find({ tenantId: req.tenantId, isActive: true }).sort({ name: 1 });
        return res.status(200).json(services);
    } catch (error) {
        console.error('Error al obtener los servicios:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener los servicios' });
    }
};

// 3. Read One (GET /api/servicios/:id)
export const getServiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const service = await Service.findOne({ _id: id, tenantId: req.tenantId });

        if (!service || !service.isActive) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        return res.status(200).json(service);
    } catch (error) {
        console.error('Error al obtener el servicio por ID:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener el servicio' });
    }
};

// 4. Update (PUT /api/servicios/:id)
export const updateService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, defaultTouchupDays, duration } = req.body;

        if (!req.body) {
            return res.status(400).json({ error: 'Bad request' });
        }

        const updatedService = await Service.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true },
            {
                $set: {
                    ...(name !== undefined && { name }),
                    ...(defaultTouchupDays !== undefined && { defaultTouchupDays }),
                    ...(duration !== undefined && { duration })
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({ error: 'Servicio no encontrado o inactivo' });
        }

        return res.status(200).json(updatedService);
    } catch (error) {
        console.error('Error al actualizar el servicio:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar el servicio' });
    }
};

// 5. Delete (DELETE /api/servicios/:id) - Soft Delete
export const deleteService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Soft Delete: actualizar isActive a false
        const deletedService = await Service.findOneAndUpdate(
            { _id: id, tenantId: req.tenantId, isActive: true },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!deletedService) {
            return res.status(404).json({ error: 'Servicio no encontrado o ya ha sido eliminado' });
        }

        return res.status(200).json({
            message: 'Servicio eliminado correctamente',
            service: deletedService
        });
    } catch (error) {
        console.error('Error al eliminar el servicio:', error);
        return res.status(500).json({ error: 'Error interno del servidor al eliminar el servicio' });
    }
};
