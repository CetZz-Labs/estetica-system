import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { checkAdminAccess, checkTenantAccess } from '../middlewares/authMiddleware';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    completeAppointment,
    getPendingRegistration,
    cancelAppointment,
    getClientAppointments,
    getUpcomingAppointments
} from '../controllers/appointmentController';
import { validateRequest } from '../middlewares/validateRequest';

const router: Router = Router();

router.use(checkAdminAccess);
router.use(checkTenantAccess);

router.post(
    '/',
    [
        body('client').isMongoId().withMessage('El ID del cliente no es válido'),
        body('service').optional({ checkFalsy: true }).isMongoId().withMessage('El ID del servicio no es válido'),
        body('professional').optional({ checkFalsy: true }).isMongoId().withMessage('El ID del profesional no es válido'),
        body('startTime').isISO8601().withMessage('La fecha de inicio debe ser una fecha ISO válida'),
        body('notes').optional().isString().trim(),
        validateRequest
    ],
    createAppointment
);

router.get(
    '/',
    [
        query('startDate').optional().isISO8601().withMessage('startDate debe ser una fecha ISO válida'),
        query('endDate').optional().isISO8601().withMessage('endDate debe ser una fecha ISO válida'),
        query('professional').optional().isMongoId().withMessage('El ID del profesional no es válido'),
        query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
            .withMessage('Estado no válido'),
        validateRequest
    ],
    getAppointments
);

router.get(
    '/client/:clientId',
    [
        param('clientId').isMongoId().withMessage('El ID del cliente no es válido'),
        validateRequest
    ],
    getClientAppointments
);

router.get(
    '/pending-registration',
    getPendingRegistration
);

router.post(
    '/:id/complete',
    [
        param('id').isMongoId().withMessage('El ID del turno no es válido'),
        body('notes').optional().isString().trim(),
        body('productsUsed').optional().isArray().withMessage('productsUsed debe ser una lista'),
        body('productsUsed.*.product').isMongoId().withMessage('Cada producto debe tener un ID válido'),
        // UX-90: total de puntos consumidos (100 = un envase; puede superar 100). quantity pasa a
        // derivada y solo se exige si no viene usedPercent (clientes viejos).
        body('productsUsed.*.usedPercent').optional().isInt({ min: 1, max: 10000 }).withMessage('usedPercent debe ser un entero entre 1 y 10000'),
        body('productsUsed.*.quantity')
            .optional()
            .isNumeric().withMessage('La cantidad debe ser un número')
            .custom(value => value > 0).withMessage('La cantidad debe ser mayor a 0'),
        // Derivados por el server: se aceptan por compat de clientes viejos y se ignoran.
        body('productsUsed.*.remainingLevel').optional().isFloat({ min: 0, max: 100 }).withMessage('remainingLevel debe ser un número entre 0 y 100'),
        body('productsUsed.*.usedExistingUnit').optional().isBoolean().withMessage('usedExistingUnit debe ser booleano'),
        body('nextTouchupDate').optional({ checkFalsy: true }).isISO8601().withMessage('La fecha del próximo retoque no es válida').toDate(),
        validateRequest
    ],
    completeAppointment
);

router.get(
    '/proximos',
    getUpcomingAppointments
);

router.get(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID del turno no es válido'),
        validateRequest
    ],
    getAppointmentById
);

router.put(
    '/:id',
    [
        param('id').isMongoId().withMessage('El ID del turno no es válido'),
        body('client').optional().isMongoId().withMessage('El ID del cliente no es válido'),
        body('service').optional().isMongoId().withMessage('El ID del servicio no es válido'),
        body('professional').optional().isMongoId().withMessage('El ID del profesional no es válido'),
        body('startTime').optional().isISO8601().withMessage('La fecha de inicio debe ser una fecha ISO válida'),
        body('notes').optional().isString().trim(),
        body('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed'])
            .withMessage('Estado no válido'),
        validateRequest
    ],
    updateAppointment
);

router.patch(
    '/:id/cancel',
    [
        param('id').isMongoId().withMessage('El ID del turno no es válido'),
        body('cancelReason').optional().isString().trim(),
        validateRequest
    ],
    cancelAppointment
);

export default router;
