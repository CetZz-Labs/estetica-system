import api from '../libs/axios';

export interface PushSubscriptionPayload {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

/** POST /api/notificaciones/push-subscription — Guarda (o actualiza) la suscripción push de este dispositivo */
export const savePushSubscription = async (data: PushSubscriptionPayload): Promise<unknown> => {
    const response = await api.post('/notificaciones/push-subscription', data);
    return response.data;
};

/** DELETE /api/notificaciones/push-subscription — Elimina la suscripción push de este dispositivo */
export const deletePushSubscription = async (endpoint: string): Promise<{ message: string }> => {
    const response = await api.delete('/notificaciones/push-subscription', { data: { endpoint } });
    return response.data;
};
