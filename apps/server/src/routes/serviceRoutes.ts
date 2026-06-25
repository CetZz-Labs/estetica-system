import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createService,
    getServices,
    getServiceById,
    updateService,
    deleteService
} from '../controllers/serviceController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// Proteger todas las rutas de servicios con el middleware de admin y aislamiento por tenant
router.use(checkAdminAccess);
router.use(checkTenantAccess);

// 1. Create (POST /api/servicios) — solo ADMIN (SRS §6.2)
router.post(
    '/',
    [
        requireRole('ADMIN'),
        body('name').notEmpty().withMessage('El nombre (name) es obligatorio').isString().trim(),
        body('defaultTouchupDays')
            .optional()
            .isInt({ min: 1 }).withMessage('defaultTouchupDays debe ser un número entero positivo')
            .toInt(),
        body('duration')
            .optional()
            .isInt({ min: 1 }).withMessage('duration debe ser un número entero positivo (minutos)')
            .toInt(),
        validateRequest
    ],
    createService
);

// 2. Read All (GET /api/servicios)
router.get('/', getServices);

// 3. Read One (GET /api/servicios/:id)
router.get(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        validateRequest
    ],
    getServiceById
);

// 4. Update (PUT /api/servicios/:id) — solo ADMIN (SRS §6.2)
router.put(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío').isString().trim(),
        body('defaultTouchupDays')
            .optional()
            .isInt({ min: 1 }).withMessage('defaultTouchupDays debe ser un número entero positivo')
            .toInt(),
        body('duration')
            .optional()
            .isInt({ min: 1 }).withMessage('duration debe ser un número entero positivo (minutos)')
            .toInt(),
        validateRequest
    ],
    updateService
);

// 5. Delete (DELETE /api/servicios/:id) - Soft Delete — solo ADMIN (SRS §6.2)
router.delete(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        validateRequest
    ],
    deleteService
);

export default router;
