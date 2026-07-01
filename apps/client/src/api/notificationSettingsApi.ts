import api from '../libs/axios';

export interface NotificationSettings {
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    fromEmail?: string;
    fromName?: string;
    reminderHoursBefore?: number;
    hasSmtpPassword: boolean;
}

export interface NotificationSettingsFormData {
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPassword?: string;   // vacío = no cambiar la contraseña guardada
    fromEmail?: string;
    fromName?: string;
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
