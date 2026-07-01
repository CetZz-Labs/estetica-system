import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validateRequest';
import { getNotificationSettings, updateNotificationSettings } from '../controllers/notificationSettingsController';

const router: Router = Router();

router.get('/', getNotificationSettings);

router.put(
    '/',
    [
        body('smtpHost').optional().isString().trim(),
        body('smtpPort').optional().isInt({ min: 1, max: 65535 }),
        body('smtpSecure').optional().isBoolean(),
        body('smtpUser').optional().isString().trim(),
        body('smtpPassword').optional().isString(),
        body('fromEmail').optional({ checkFalsy: true }).isEmail(),
        body('fromName').optional().isString().trim(),
        body('reminderHoursBefore').optional().isInt({ min: 1, max: 168 }).withMessage('Debe ser entre 1 y 168 horas'),
        validateRequest
    ],
    updateNotificationSettings
);

export default router;
