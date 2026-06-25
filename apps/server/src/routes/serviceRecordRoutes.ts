import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { checkAdminAccess, checkTenantAccess } from '../middlewares/authMiddleware';
import {
    createServiceRecord,
    getClientRecords,
    getUpcomingTouchups,
    updateServiceRecord,
    deleteServiceRecord,
    getRecentRecords
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

// 2. Read - Historial por Cliente (GET /api/registros/cliente/:clientId)
router.get(
    '/cliente/:clientId',
    [
        param('clientId').isMongoId().withMessage('El ID del cliente no es válido'),
        validateRequest
    ],
    getClientRecords
);

// ==========================================
// Rutas Base (CRUD Estándar)
// ==========================================

// 1. Create (POST /api/registros)
router.post(
    '/',
    [
        body('client').isMongoId().withMessage('El ID del cliente (client) es obligatorio y debe ser válido'),
        body('service').isMongoId().withMessage('El ID del servicio (service) es obligatorio y debe ser válido'),
        body('professional').isMongoId().withMessage('El ID de la profesional (professional) es obligatorio y debe ser válido'),
        body('serviceDate').isISO8601().withMessage('La fecha del servicio (serviceDate) es obligatoria y debe tener formato ISO 8601').toDate(),
        body('notes').optional().isString().trim(),

        body('productsUsed').optional().isArray().withMessage('productsUsed debe ser una lista (array)'),
        body('productsUsed.*.product').isMongoId().withMessage('Cada producto usado debe tener un ID válido'),
        body('productsUsed.*.quantity')
            .isNumeric().withMessage('La cantidad debe ser un número')
            .custom(value => value > 0).withMessage('La cantidad debe ser mayor a 0'),

        body('nextTouchupDate').optional({ nullable: true }).isISO8601().withMessage('nextTouchupDate debe ser una fecha válida').toDate(),
        body('touchupStatus').optional().isIn(['pending', 'completed', 'canceled']).withMessage('Estado de retoque no válido'),
        validateRequest
    ],
    createServiceRecord
);

// 4. Update (PUT /api/registros/:id)
router.put(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID del registro no es válido'),
        // client, service y productsUsed NO son editables vía PUT (ver whitelist en el controller)
        body('serviceDate').optional().isISO8601().withMessage('serviceDate debe tener formato ISO 8601').toDate(),
        body('notes').optional().isString().trim(),
        body('nextTouchupDate').optional({ nullable: true }).isISO8601().withMessage('nextTouchupDate debe ser una fecha válida').toDate(),
        body('touchupStatus').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Estado de retoque no válido'),
        validateRequest
    ],
    updateServiceRecord
);

// 5. Delete (DELETE /api/registros/:id)
router.delete(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID del registro no es válido'),
        validateRequest
    ],
    deleteServiceRecord
);

export default router;
