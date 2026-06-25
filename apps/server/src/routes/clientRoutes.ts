import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient
} from '../controllers/clientController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// Proteger todas las rutas de clientes con el middleware de admin y aislamiento por tenant
router.use(checkAdminAccess);
router.use(checkTenantAccess);

// 1. Create (POST /api/clientes)
router.post(
    '/',
    [
        body('firstName').notEmpty().withMessage('El nombre (firstName) es obligatorio').trim(),
        body('lastName').notEmpty().withMessage('El apellido (lastName) es obligatorio').trim(),
        body('phone').optional().isString().trim(),
        body('medicalNotes').optional().isString().trim(),
        validateRequest
    ],
    createClient
);

// 2. Read All (GET /api/clientes)
router.get('/', getClients);

// 3. Read One (GET /api/clientes/:id)
router.get(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        validateRequest
    ],
    getClientById
);

// 4. Update (PUT /api/clientes/:id)
router.put(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        body('firstName').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
        body('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío').trim(),
        body('phone').optional().isString().trim(),
        body('medicalNotes').optional().isString().trim(),
        validateRequest
    ],
    updateClient
);

// 5. Delete (DELETE /api/clientes/:id) - Soft Delete — solo ADMIN (SRS §6.2)
router.delete(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
        validateRequest
    ],
    deleteClient
);

export default router;
