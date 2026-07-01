import cron from 'node-cron';
import { Tenant, ITenant } from '../models/Tenant';
import { Appointment } from '../models/Appointment';
import { sendAppointmentReminder } from './mailService';

const DEFAULT_REMINDER_HOURS_BEFORE = 24;

interface PopulatedReminderAppointment {
    _id: unknown;
    client?: { firstName: string; lastName: string; email?: string } | null;
    service?: { name: string } | null;
    startTime: Date;
    reminderSent: boolean;
    save: () => Promise<unknown>;
}

export const runReminderCheck = async (): Promise<void> => {
    const tenants = await Tenant.find({
        isActive: true,
        'notificationSettings.smtpHost': { $exists: true, $ne: '' },
        'notificationSettings.smtpUser': { $exists: true, $ne: '' },
        'notificationSettings.smtpPasswordEncrypted': { $exists: true, $ne: '' },
    });

    for (const tenant of tenants as ITenant[]) {
        const reminderHoursBefore = tenant.notificationSettings?.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE;
        const now = new Date();
        const windowEnd = new Date(now.getTime() + reminderHoursBefore * 60 * 60 * 1000);

        const appointments = await Appointment.find({
            tenantId: tenant._id,
            isActive: true,
            status: { $in: ['pending', 'confirmed'] },
            reminderSent: false,
            startTime: { $gte: now, $lte: windowEnd },
        })
            .populate('client', 'firstName lastName email')
            .populate('service', 'name') as unknown as PopulatedReminderAppointment[];

        for (const appointment of appointments) {
            if (!appointment.client?.email) {
                // Omisión silenciosa (GOV-NOTIFY mandato 5): sin email no hay reintento posible, no se marca reminderSent
                continue;
            }

            try {
                await sendAppointmentReminder(tenant, {
                    client: {
                        firstName: appointment.client.firstName,
                        lastName: appointment.client.lastName,
                        email: appointment.client.email,
                    },
                    service: appointment.service,
                    startTime: appointment.startTime,
                });

                appointment.reminderSent = true;
                await appointment.save();
            } catch (error) {
                console.error(`Error al enviar recordatorio (tenantId: ${tenant._id}, appointmentId: ${appointment._id}):`, error);
            }
        }
    }
};

export const startReminderScheduler = (): void => {
    cron.schedule('*/15 * * * *', () => {
        runReminderCheck().catch((err) => console.error('Error en reminderScheduler:', err));
    });
    console.log('Reminder scheduler iniciado (cada 15 min)');
};
