import nodemailer from 'nodemailer';
import { ITenant } from '../models/Tenant';
import { decryptSecret } from '../utils/crypto';

interface ReminderAppointment {
    client: {
        firstName: string;
        lastName: string;
        email: string;
    };
    service?: { name: string } | null;
    startTime: Date;
}

export const sendAppointmentReminder = async (tenant: ITenant, appointment: ReminderAppointment): Promise<void> => {
    const settings = tenant.notificationSettings;

    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPasswordEncrypted) {
        throw new Error(`Tenant ${tenant._id} no tiene configuración SMTP completa`);
    }

    const smtpPassword = decryptSecret(settings.smtpPasswordEncrypted);

    const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure ?? false,
        auth: {
            user: settings.smtpUser,
            pass: smtpPassword,
        },
    });

    const serviceName = appointment.service?.name ?? 'tu turno';
    const clientFullName = `${appointment.client.firstName} ${appointment.client.lastName}`.trim();
    const formattedDateTime = new Intl.DateTimeFormat('es-AR', {
        timeZone: tenant.timezone,
        dateStyle: 'full',
        timeStyle: 'short',
    }).format(appointment.startTime);

    const fromAddress = settings.fromEmail || settings.smtpUser;
    const from = `"${settings.fromName || tenant.name}" <${fromAddress}>`;
    const subject = `Recordatorio de tu turno en ${tenant.name}`;

    const text = `Hola ${clientFullName},

Te recordamos tu turno para "${serviceName}" el ${formattedDateTime}.

Ante cualquier consulta, podés escribirnos a ${fromAddress}.

${tenant.name}`;

    const html = `
        <p>Hola ${clientFullName},</p>
        <p>Te recordamos tu turno para <strong>${serviceName}</strong> el <strong>${formattedDateTime}</strong>.</p>
        <p>Ante cualquier consulta, podés escribirnos a <a href="mailto:${fromAddress}">${fromAddress}</a>.</p>
        <p>${tenant.name}</p>
    `;

    await transporter.sendMail({
        from,
        to: appointment.client.email,
        subject,
        text,
        html,
    });
};
