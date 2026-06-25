import { Router } from 'express';
import { body, query } from 'express-validator';
import { validateInvitation, acceptInvitation } from '../controllers/invitationController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// EXCEPCIÓN DOCUMENTADA: sin checkAdminAccess ni checkTenantAccess.
// El usuario invitado no tiene Admin en MongoDB todavía. Gate: clerkMiddleware global + lógica del controller.

router.get(
    '/validate',
    [
        query('token').notEmpty().withMessage('El token es requerido'),
        validateRequest
    ],
    validateInvitation
);

router.post(
    '/aceptar',
    [
        body('token').notEmpty().withMessage('El token es requerido'),
        validateRequest
    ],
    acceptInvitation
);

export default router;
