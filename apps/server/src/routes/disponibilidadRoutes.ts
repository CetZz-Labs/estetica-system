import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validateRequest';
import { getDisponibilidad, updateDisponibilidad } from '../controllers/disponibilidadController';

const router: Router = Router();

router.get('/', getDisponibilidad);

router.put(
    '/',
    [
        body('schedule').optional().isArray({ min: 7, max: 7 }).withMessage('El horario debe tener exactamente 7 días'),
        body('schedule.*.day').optional().isInt({ min: 0, max: 6 }),
        body('schedule.*.isOpen').optional().isBoolean(),
        body('schedule.*.openTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Formato de hora inválido (HH:MM)'),
        body('schedule.*.closeTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Formato de hora inválido (HH:MM)'),
        body('blockedDates').optional().isArray(),
        body('blockedDates.*.date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha inválido (YYYY-MM-DD)'),
        validateRequest
    ],
    updateDisponibilidad
);

export default router;
