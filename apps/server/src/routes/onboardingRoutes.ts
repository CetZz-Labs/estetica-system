import { Router } from 'express';
import { body } from 'express-validator';
import { createTenantWithAdmin } from '../controllers/onboardingController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// EXCEPCIÓN DOCUMENTADA: sin checkAdminAccess ni checkTenantAccess.
// El admin aún no existe en MongoDB cuando se registra un nuevo tenant;
// la autenticación (sesión Clerk) y el gate de email verificado se validan en el controller.
router.post(
    '/',
    [
        body('businessName').notEmpty().withMessage('El nombre del negocio (businessName) es obligatorio').trim(),
        body('responsibleName').optional().isString().trim(),
        validateRequest
    ],
    createTenantWithAdmin
);

export default router;
