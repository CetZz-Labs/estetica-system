import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess, requireRole } from '../middlewares/authMiddleware';
import {
    createServiceRecord,
    getClientRecords,
    getUpcomingTouchups,
    updateServiceRecord,
    deleteServiceRecord,
    getRecentRecords,
    getServiceRecords
} from '../controllers/serviceRecordController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

// Proteger todas las rutas con el middleware de admin y aislamiento por tenant
router.use(checkAdminAccess);
router.use(checkTenantAccess);

// ==========================================
// Rutas Específicas (Deben ir antes de las dinámicas como /:id)
// ==========================================

// 3. Read - Próximos Retoques / Dashboard (GET /api/registros/retoques)
router.get('/retoques', getUpcomingTouchups);
router.get('/recientes', getRecentRecords);

// 1.b Read - Listado general paginado con filtros combinados (GET /api/registros)
router.get(
    '/',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un entero entre 1 y 100'),
        query('clientId').optional().isMongoId().withMessage('clientId no es válido'),
        query('serviceId').optional().isMongoId().withMessage('serviceId no es válido'),
        query('professionalId').optional().isMongoId().withMessage('professionalId no es válido'),
        query('dateFrom').optional().isISO8601().withMessage('dateFrom debe tener formato ISO 8601'),
        query('dateTo').optional().isISO8601().withMessage('dateTo debe tener formato ISO 8601'),
        validateRequest
    ],
    getServiceRecords
);

// 2. Read - Historial por Cliente, paginado con filtros de fecha (GET /api/registros/cliente/:clientId)
router.get(
    '/cliente/:clientId',
    [
        param('clientId').isMongoId().withMessage('El ID del cliente no es válido'),
        query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser un entero entre 1 y 100'),
        query('dateFrom').optional().isISO8601().withMessage('dateFrom debe tener formato ISO 8601'),
        query('dateTo').optional().isISO8601().withMessage('dateTo debe tener formato ISO 8601'),
        validateRequest
    ],
    getClientRecords
);

// ==========================================
// Rutas Base (CRUD Estándar)
// ==========================================

// 1. Create (POST /api/registros) — ADMIN y PROFESSIONAL (SRS §6.2)
router.post(
    '/',
    [
        requireRole('ADMIN', 'PROFESSIONAL'),
        body('client').isMongoId().withMessage('El ID del cliente (client) es obligatorio y debe ser válido'),
        body('service').isMongoId().withMessage('El ID del servicio (service) es obligatorio y debe ser válido'),
        body('professional').isMongoId().withMessage('El ID de la profesional (professional) es obligatorio y debe ser válido'),
        body('serviceDate').isISO8601().withMessage('La fecha del servicio (serviceDate) es obligatoria y debe tener formato ISO 8601'),
        body('notes').optional().isString().trim(),

        body('productsUsed').optional().isArray().withMessage('productsUsed debe ser una lista (array)'),
        body('productsUsed.*.product').isMongoId().withMessage('Cada producto usado debe tener un ID válido'),
        body('productsUsed.*.quantity')
            .isNumeric().withMessage('La cantidad debe ser un número')
            .custom(value => value > 0).withMessage('La cantidad debe ser mayor a 0'),

        body('nextTouchupDate').optional({ checkFalsy: true }).isISO8601().withMessage('La fecha del próximo retoque no es válida').toDate(),
        body('touchupStatus').optional().isIn(['pending', 'completed', 'canceled']).withMessage('Estado de retoque no válido'),
        body('isBackfill').optional().isBoolean().withMessage('isBackfill debe ser booleano'),
        validateRequest
    ],
    createServiceRecord
);

// 4. Update (PUT /api/registros/:id)
router.put(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID del registro no es válido'),
        // client y service NO son editables vía PUT (ver whitelist en el controller).
        // productsUsed SÍ es editable (UX-67): mirror literal de los validators del POST.
        body('serviceDate').optional().isISO8601().withMessage('serviceDate debe tener formato ISO 8601'),
        body('notes').optional().isString().trim(),

        body('productsUsed').optional().isArray().withMessage('productsUsed debe ser una lista (array)'),
        body('productsUsed.*.product').isMongoId().withMessage('Cada producto usado debe tener un ID válido'),
        body('productsUsed.*.quantity')
            .isNumeric().withMessage('La cantidad debe ser un número')
            .custom(value => value > 0).withMessage('La cantidad debe ser mayor a 0'),

        body('nextTouchupDate').optional({ checkFalsy: true }).isISO8601().withMessage('La fecha del próximo retoque no es válida').toDate(),
        body('touchupStatus').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Estado de retoque no válido'),
        validateRequest
    ],
    updateServiceRecord
);

// 5. Delete (DELETE /api/registros/:id) — solo ADMIN (UX-72: restaura stock, borrado físico)
router.delete(
    '/:id',
    [
        requireRole('ADMIN'),
        param('id').isMongoId().withMessage('El ID del registro no es válido'),
        validateRequest
    ],
    deleteServiceRecord
);

export default router;
