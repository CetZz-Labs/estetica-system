import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Admin, type IAdmin } from '../models/Admin';

declare global {
    namespace Express {
        interface Request {
            adminInfo?: IAdmin;
            tenantId?: Types.ObjectId;
        }
    }
}

// 2. Capa de Maison: Verificamos contra MongoDB
export const checkAdminAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Usamos getAuth() como indica la nueva documentación
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado en Clerk' });
        }

        // Buscamos al admin en Mongoose usando el ID de Clerk
        const admin = await Admin.findOne({ externalId: userId });

        if (!admin) {
            return res.status(403).json({
                error: 'Acceso denegado. No tienes permisos de administrador en el CRM.'
            });
        }

        // Inyectamos el admin de la BD en la request para usarlo en los controladores
        req.adminInfo = admin;

        next();
    } catch (error) {
        console.error('Error verificando admin en BD:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// 3. Capa Multi-Tenant: corre DESPUÉS de checkAdminAccess.
// Lee el tenant del admin autenticado y lo inyecta en la request para que
// todos los controllers filtren automáticamente por tenantId.
export const checkTenantAccess = (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.adminInfo?.tenantId;

        if (!tenantId) {
            return res.status(403).json({
                error: 'Acceso denegado. El administrador no tiene un tenant asignado.'
            });
        }

        req.tenantId = tenantId;

        next();
    } catch (error) {
        console.error('Error verificando tenant del admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};