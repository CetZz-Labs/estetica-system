import api from '../libs/axios';

export interface NotificationSettings {
    reminderHoursBefore?: number;
}

export interface NotificationSettingsFormData {
    reminderHoursBefore?: number;
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
    const { data } = await api.get('/notificaciones');
    return data;
};

export const updateNotificationSettings = async (payload: NotificationSettingsFormData): Promise<NotificationSettings> => {
    const { data } = await api.put('/notificaciones', payload);
    return data;
};
