import { Request, Response } from 'express';
import { Tenant } from '../models/Tenant';

const DEFAULT_REMINDER_HOURS_BEFORE = 24;

export const getNotificationSettings = async (req: Request, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        const settings = tenant.notificationSettings;

        return res.status(200).json({
            reminderHoursBefore: settings?.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE,
        });
    } catch (error) {
        console.error('Error al obtener configuración de notificaciones:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateNotificationSettings = async (req: Request, res: Response) => {
    try {
        const { reminderHoursBefore } = req.body;

        if (reminderHoursBefore === undefined) {
            return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
        }

        const updated = await Tenant.findByIdAndUpdate(
            req.tenantId,
            { $set: { 'notificationSettings.reminderHoursBefore': reminderHoursBefore } },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Negocio no encontrado' });
        }

        const settings = updated.notificationSettings;

        return res.status(200).json({
            reminderHoursBefore: settings?.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE,
        });
    } catch (error) {
        console.error('Error al actualizar configuración de notificaciones:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
