import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middlewares/validateRequest';
import { getAppointmentsReport, getOccupancyReport, getServicesReport } from '../controllers/reportController';
import { validateReportRange } from '../utils/reportRange';

const router: Router = Router();

// Validación compartida de from/to por todos los reportes (REP-1, REP-2).
const rangeValidation = [
    query('from').notEmpty().withMessage('El parámetro from es obligatorio'),
    query('to').notEmpty().withMessage('El parámetro to es obligatorio')
        .bail()
        .custom((to, { req }) => {
            const error = validateReportRange(req.query?.from, to);
            if (error) throw new Error(error);
            return true;
        }),
    validateRequest
];

router.get('/turnos', rangeValidation, getAppointmentsReport);
router.get('/ocupacion', rangeValidation, getOccupancyReport);
router.get('/servicios', rangeValidation, getServicesReport);

export default router;
