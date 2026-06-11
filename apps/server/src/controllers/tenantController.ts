import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';

export const getTenant = async (req: Request, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);

        if (!tenant) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        return res.status(200).json({ tenant });
    } catch (error) {
        console.error('Error al obtener la configuración del negocio:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener la configuración del negocio' });
    }
};

export const updateTenant = async (req: Request, res: Response) => {
    try {
        const allowedFields = ['name', 'logo', 'timezone', 'currency'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.tenantId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        return res.status(200).json({ tenant });
    } catch (error) {
        console.error('Error al actualizar la configuración del negocio:', error);
        return res.status(500).json({ error: 'Error interno del servidor al actualizar la configuración del negocio' });
    }
};
