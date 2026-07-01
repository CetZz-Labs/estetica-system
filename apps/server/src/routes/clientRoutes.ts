import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient,
    createBulkClients
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
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido').normalizeEmail(),
        body('medicalNotes').optional().isString().trim(),
        validateRequest
    ],
    createClient
);

// Carga masiva (POST /api/clientes/carga-masiva)
router.post(
    '/carga-masiva',
    [
        body().isArray({ min: 1 }).withMessage('Se esperaba un array de clientes'),
        body('*.firstName').notEmpty().withMessage('Cada cliente debe tener firstName'),
        body('*.lastName').notEmpty().withMessage('Cada cliente debe tener lastName'),
        body('*.phone').optional().isString().trim(),
        body('*.email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido en una o más filas'),
        body('*.medicalNotes').optional().isString().trim(),
        validateRequest
    ],
    createBulkClients
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
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido').normalizeEmail(),
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
