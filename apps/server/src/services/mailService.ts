import nodemailer from 'nodemailer';
import { ITenant } from '../models/Tenant';
import { mailConfig } from '../config/mailConfig';

interface ReminderAppointment {
    client: {
        firstName: string;
        lastName: string;
        email: string;
    };
    service?: { name: string } | null;
    startTime: Date;
}

// Transporter único de la app (EP-17-b): la config SMTP ya no depende del tenant, se arma una sola vez.
const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: {
        user: mailConfig.user,
        pass: mailConfig.pass,
    },
});

export const sendAppointmentReminder = async (tenant: ITenant, appointment: ReminderAppointment): Promise<void> => {
    const serviceName = appointment.service?.name ?? 'tu turno';
    const clientFullName = `${appointment.client.firstName} ${appointment.client.lastName}`.trim();
    const formattedDateTime = new Intl.DateTimeFormat('es-AR', {
        timeZone: tenant.timezone,
        dateStyle: 'full',
        timeStyle: 'short',
    }).format(appointment.startTime);

    const fromAddress = mailConfig.fromEmail;
    const from = `"${tenant.name}" <${fromAddress}>`;
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
