import { Router } from 'express';
import { body } from 'express-validator';
import { checkAdminAccess, checkTenantAccess } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { saveSubscription, deleteSubscription } from '../controllers/pushSubscriptionController';

const router: Router = Router();

// Sin requireRole: cualquier admin autenticado (ADMIN/PROFESSIONAL/RECEPTIONIST) puede
// suscribir su propio dispositivo a los recordatorios push, a diferencia de la configuración
// SMTP/negocio de notificationSettingsRoutes (restringida a ADMIN).
router.use(checkAdminAccess);
router.use(checkTenantAccess);

router.post(
    '/',
    [
        body('endpoint').isString().trim().notEmpty().withMessage('El endpoint es obligatorio'),
        body('keys.p256dh').isString().notEmpty().withMessage('La clave p256dh es obligatoria'),
        body('keys.auth').isString().notEmpty().withMessage('La clave auth es obligatoria'),
        validateRequest
    ],
    saveSubscription
);

router.delete(
    '/',
    [
        body('endpoint').isString().trim().notEmpty().withMessage('El endpoint es obligatorio'),
        validateRequest
    ],
    deleteSubscription
);

export default router;
