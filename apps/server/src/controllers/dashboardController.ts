// Backend: src/controllers/dashboardController.ts
import { Request, Response } from 'express';
// Asegúrate de importar tus modelos de Mongoose
import { Client } from '../models/Client';
import { ServiceRecord } from '../models/ServiceRecord';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId;

        // Ejecutamos las 3 promesas en paralelo para mayor velocidad (siempre acotadas al tenant)
        const [totalClients, servicesDone, upcomingTouchups] = await Promise.all([
            Client.countDocuments({ tenantId }),
            ServiceRecord.countDocuments({ tenantId }),
            ServiceRecord.countDocuments({ tenantId, touchupStatus: 'pending' })
        ]);

        return res.status(200).json({
            totalClients,
            servicesDone,
            upcomingTouchups
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};