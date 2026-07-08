import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validateRequest';
import { getNotificationSettings, updateNotificationSettings } from '../controllers/notificationSettingsController';

const router: Router = Router();

router.get('/', getNotificationSettings);

router.put(
    '/',
    [
        body('reminderHoursBefore').isInt({ min: 1, max: 168 }).withMessage('Debe ser entre 1 y 168 horas'),
        validateRequest
    ],
    updateNotificationSettings
);

export default router;
