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

// UX-85: cuántos nombres se listan como máximo en el body de la notificación antes de truncar con "y N más".
const MAX_NAMES_IN_BODY = 6;

const formatClientName = (client: { firstName?: string; lastName?: string } | null | undefined): string => {
    if (!client) return 'Cliente';
    return `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Cliente';
};

const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date);
};

// Junta las entradas de turnos y retoques en una lista de nombres truncada a MAX_NAMES_IN_BODY,
// agregando el sufijo "y N más" cuando corresponda (UX-85).
const buildTruncatedList = (entries: string[]): string => {
    if (entries.length <= MAX_NAMES_IN_BODY) return entries.join(', ');
    const visible = entries.slice(0, MAX_NAMES_IN_BODY);
    const remaining = entries.length - MAX_NAMES_IN_BODY;
    return `${visible.join(', ')} y ${remaining} más`;
};

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
                Appointment.find({
                    tenantId,
                    isActive: true,
                    status: { $in: ['pending', 'confirmed'] },
                    startTime: { $gte: startOfDay, $lte: endOfDay }
                }).populate<{ client: { firstName?: string; lastName?: string } | null }>('client', 'firstName lastName').sort({ startTime: 1 }),
                ServiceRecord.find({
                    tenantId,
                    touchupStatus: 'pending',
                    nextTouchupDate: { $lte: endOfDay }
                }).populate<{ client: { firstName?: string; lastName?: string } | null }>('client', 'firstName lastName').sort({ nextTouchupDate: 1 })
            ]);

            const total = turnosHoy.length + retoquesPendientes.length;
            if (total === 0) continue;

            const subscriptions = await PushSubscription.find({ tenantId });
            if (subscriptions.length === 0) continue;

            // UX-85: cuerpo legible con nombres de clientes en vez de solo el total, truncado a MAX_NAMES_IN_BODY.
            const turnosEntries = turnosHoy.map((appointment) => `${formatClientName(appointment.client)} ${formatTime(appointment.startTime)}`);
            const retoquesEntries = retoquesPendientes.map((record) => formatClientName(record.client));

            const bodyParts: string[] = [];
            if (turnosEntries.length > 0) {
                bodyParts.push(`Turnos hoy: ${buildTruncatedList(turnosEntries)}.`);
            }
            if (retoquesEntries.length > 0) {
                bodyParts.push(`Retoques pendientes: ${buildTruncatedList(retoquesEntries)}.`);
            }

            const payload = JSON.stringify({
                title: tenant.name,
                body: bodyParts.join(' ')
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
