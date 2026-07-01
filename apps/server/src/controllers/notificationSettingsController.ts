import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';
import { encryptSecret } from '../utils/crypto';

const DEFAULT_REMINDER_HOURS_BEFORE = 24;

export const getNotificationSettings = async (req: Request, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        const settings = tenant.notificationSettings;

        return res.status(200).json({
            smtpHost: settings?.smtpHost,
            smtpPort: settings?.smtpPort,
            smtpSecure: settings?.smtpSecure,
            smtpUser: settings?.smtpUser,
            fromEmail: settings?.fromEmail,
            fromName: settings?.fromName,
            reminderHoursBefore: settings?.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE,
            hasSmtpPassword: Boolean(settings?.smtpPasswordEncrypted),
        });
    } catch (error) {
        console.error('Error al obtener configuración de notificaciones:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateNotificationSettings = async (req: Request, res: Response) => {
    try {
        const {
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword,
            fromEmail,
            fromName,
            reminderHoursBefore,
        } = req.body;

        const updates: Record<string, unknown> = {};
        if (smtpHost !== undefined) updates['notificationSettings.smtpHost'] = smtpHost;
        if (smtpPort !== undefined) updates['notificationSettings.smtpPort'] = smtpPort;
        if (smtpSecure !== undefined) updates['notificationSettings.smtpSecure'] = smtpSecure;
        if (smtpUser !== undefined) updates['notificationSettings.smtpUser'] = smtpUser;
        if (fromEmail !== undefined) updates['notificationSettings.fromEmail'] = fromEmail;
        if (fromName !== undefined) updates['notificationSettings.fromName'] = fromName;
        if (reminderHoursBefore !== undefined) updates['notificationSettings.reminderHoursBefore'] = reminderHoursBefore;

        // Patrón "dejar en blanco para no cambiar" (GOV-NOTIFY mandato 3): solo se re-cifra si viene un valor no vacío.
        if (smtpPassword !== undefined && smtpPassword !== '') {
            updates['notificationSettings.smtpPasswordEncrypted'] = encryptSecret(smtpPassword);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const updated = await Tenant.findByIdAndUpdate(
            req.tenantId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        const settings = updated.notificationSettings;

        return res.status(200).json({
            smtpHost: settings?.smtpHost,
            smtpPort: settings?.smtpPort,
            smtpSecure: settings?.smtpSecure,
            smtpUser: settings?.smtpUser,
            fromEmail: settings?.fromEmail,
            fromName: settings?.fromName,
            reminderHoursBefore: settings?.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE,
            hasSmtpPassword: Boolean(settings?.smtpPasswordEncrypted),
        });
    } catch (error) {
        console.error('Error al actualizar configuración de notificaciones:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
