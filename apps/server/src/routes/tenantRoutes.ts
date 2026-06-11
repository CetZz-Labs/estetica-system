import { Router } from 'express';
import { body } from 'express-validator';
import { getTenant, updateTenant } from '../controllers/tenantController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

router.get('/', getTenant);

router.put(
    '/',
    [
        body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
        body('logo').optional().trim(),
        body('timezone').optional().trim().notEmpty().withMessage('La zona horaria no puede estar vacía'),
        body('currency').optional().trim().notEmpty().withMessage('La moneda no puede estar vacía')
            .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código ISO 4217 de 3 caracteres'),
        validateRequest
    ],
    updateTenant
);

export default router;
