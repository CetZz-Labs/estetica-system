export interface IMailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
}

const buildMailConfig = (): IMailConfig => {
    const host = process.env.SMTP_HOST ?? '';
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASSWORD ?? '';
    const fromEmail = process.env.SMTP_FROM_EMAIL ?? '';

    if (!host || !user || !pass || !fromEmail) {
        console.warn('mailConfig: faltan variables de entorno SMTP (SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM_EMAIL). El envío de recordatorios fallará hasta que se configuren.');
    }

    return { host, port, secure, user, pass, fromEmail };
};

export const mailConfig: IMailConfig = buildMailConfig();
