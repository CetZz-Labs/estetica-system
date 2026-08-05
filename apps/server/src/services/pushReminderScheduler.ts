import cron from 'node-cron';
import webpush from 'web-push';
import { Tenant, ITenant } from '../models/Tenant';
import { Appointment } from '../models/Appointment';
import { ServiceRecord } from '../models/ServiceRecord';
import { PushSubscription } from '../models/PushSubscription';
import { pushConfig } from '../config/pushConfig';

const isPushConfigured = (): boolean => {
    return Boolean(pushConfig.publicKey && pushConfig.privateKey && pushConfig.subject);
};

if (isPushConfigured()) {
    webpush.setVapidDetails(pushConfig.subject, pushConfig.publicKey, pushConfig.privateKey);
}

interface WebPushError {
    statusCode?: number;
}

export const runPushReminderCheck = async (): Promise<void> => {
    if (!isPushConfigured()) {
        console.warn('pushReminderScheduler: claves VAPID no configuradas, se omite el envío de notificaciones push.');
        return;
    }

    // Simplificación de alcance (UX-68, ver impl_UX-68-backend.md): el "día calendario" se calcula
    // con la zona horaria del PROCESO servidor, no con tenant.timezone (a diferencia de P10 en
    // patterns-backend.md). Mismo criterio de simplificación que reminderScheduler.ts, que tampoco
    // varía su cadencia por tenant, solo la ventana de anticipación.
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const tenants = await Tenant.find({ isActive: true });

    for (const tenant of tenants as ITenant[]) {
        const tenantId = tenant._id;

        try {
            const [turnosHoy, retoquesPendientes] = await Promise.all([
                Appointment.countDocuments({
                    tenantId,
                    isActive: true,
                    status: { $in: ['pending', 'confirmed'] },
                    startTime: { $gte: startOfDay, $lte: endOfDay }
                }),
                ServiceRecord.countDocuments({
                    tenantId,
                    touchupStatus: 'pending',
                    nextTouchupDate: { $lte: endOfDay }
                })
            ]);

            const total = turnosHoy + retoquesPendientes;
            if (total === 0) continue;

            const subscriptions = await PushSubscription.find({ tenantId });
            if (subscriptions.length === 0) continue;

            const payload = JSON.stringify({
                title: 'Maison CRM',
                body: `Hoy: ${turnosHoy} turno${turnosHoy === 1 ? '' : 's'}, ${retoquesPendientes} retoque${retoquesPendientes === 1 ? '' : 's'} pendiente${retoquesPendientes === 1 ? '' : 's'}`
            });

            for (const subscription of subscriptions) {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: subscription.endpoint,
                            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
                        },
                        payload
                    );
                } catch (sendError) {
                    const statusCode = (sendError as WebPushError).statusCode;
                    if (statusCode === 410 || statusCode === 404) {
                        // Suscripción caducada del lado del navegador: limpieza automática (GOV-DB no aplica, no es soft-delete)
                        await PushSubscription.deleteOne({ _id: subscription._id });
                    } else {
                        console.error(`Error al enviar push (tenantId: ${tenantId}, subscriptionId: ${subscription._id}):`, sendError);
                    }
                }
            }
        } catch (error) {
            console.error(`Error al procesar recordatorios push (tenantId: ${tenantId}):`, error);
        }
    }
};

export const startPushReminderScheduler = (): void => {
    // Corre una vez por día a las 08:00 (hora del proceso servidor).
    cron.schedule('0 8 * * *', () => {
        runPushReminderCheck().catch((err) => console.error('Error en pushReminderScheduler:', err));
    });
    console.log('Push reminder scheduler iniciado (diario 08:00)');
};
