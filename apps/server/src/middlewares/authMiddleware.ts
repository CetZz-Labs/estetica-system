import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { Admin, type IAdmin } from '../models/Admin';

declare global {
    namespace Express {
        interface Request {
            adminInfo?: IAdmin;
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