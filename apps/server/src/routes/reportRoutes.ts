import { Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middlewares/validateRequest';
import { getAppointmentsReport } from '../controllers/reportController';
import { validateReportRange } from '../utils/reportRange';

const router: Router = Router();

router.get(
    '/turnos',
    [
        query('from').notEmpty().withMessage('El parámetro from es obligatorio'),
        query('to').notEmpty().withMessage('El parámetro to es obligatorio')
            .bail()
            .custom((to, { req }) => {
                const error = validateReportRange(req.query?.from, to);
                if (error) throw new Error(error);
                return true;
            }),
        validateRequest
    ],
    getAppointmentsReport
);

export default router;
