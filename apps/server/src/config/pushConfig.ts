export interface IPushConfig {
    publicKey: string;
    privateKey: string;
    subject: string;
}

const buildPushConfig = (): IPushConfig => {
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
    const subject = process.env.VAPID_SUBJECT ?? '';

    if (!publicKey || !privateKey || !subject) {
        console.warn('pushConfig: faltan variables de entorno VAPID (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT). El envío de notificaciones push fallará hasta que se configuren.');
    }

    return { publicKey, privateKey, subject };
};

export const pushConfig: IPushConfig = buildPushConfig();
