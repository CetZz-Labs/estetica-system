import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiMessageCircle, FiPhoneOff, FiAlertCircle, FiCalendar } from 'react-icons/fi';

import { getAppointments } from '../api/appointmentApi';
import { getTenant } from '../api/tenantApi';
import { handleApiError } from '../api/errorHandler';
import type { Appointment } from '../types';
import { getTodayDateString, formatFullDateTime } from '../utils/dates';
import { getLocalDayRangeISO } from '../utils/timeSlots';
import { toWhatsAppPhone } from '../utils/phone';
import { useTopbar } from '../layouts/TopbarContext';

function buildReminderMessage(appointment: Appointment, businessName: string): string {
    const clientName = `${appointment.client.firstName} ${appointment.client.lastName ?? ''}`.trim();
    const serviceName = appointment.service?.name ?? 'tu turno';
    const dateTime = formatFullDateTime(appointment.startTime);
    return `Hola ${clientName}! Te recordamos tu turno para "${serviceName}" el ${dateTime} en ${businessName}. Te esperamos!`;
}

export default function Recordatorios() {
    useTopbar({ title: 'Recordatorios' });

    // GET /api/turnos acotado al día de hoy — no acepta status 'in' (solo un valor), por eso el
    // filtro pending/confirmed se resuelve acá, sobre un dataset ya acotado a un solo día.
    const { start, end } = useMemo(() => getLocalDayRangeISO(getTodayDateString()), []);

    const { data: tenantData } = useQuery({
        queryKey: ['tenant'],
        queryFn: getTenant,
    });

    const { data: appointments, isLoading, isError, error } = useQuery<Appointment[]>({
        queryKey: ['appointments', 'recordatorios', start, end],
        queryFn: () => getAppointments({ startDate: start, endDate: end }),
    });

    useEffect(() => {
        if (isError) {
            handleApiError(error, 'No se pudieron cargar los turnos de hoy.');
        }
    }, [isError, error]);

    const todaysReminders = useMemo(() => {
        return (appointments ?? [])
            .filter((appointment) => appointment.status === 'pending' || appointment.status === 'confirmed')
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [appointments]);

    const businessName = tenantData?.tenant.name ?? 'nuestro negocio';

    const handleSendReminder = (appointment: Appointment) => {
        const waPhone = appointment.client.phone ? toWhatsAppPhone(appointment.client.phone) : null;
        if (!waPhone) return;
        const message = buildReminderMessage(appointment, businessName);
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Loading
    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-card bg-surface-2" />
                ))}
            </div>
        );
    }

    // Error (el detalle va al toast vía handleApiError, este bloque solo da la señal visual genérica)
    if (isError) {
        return (
            <div className="flex flex-col items-center gap-2 py-12 text-alert-text">
                <FiAlertCircle size={28} aria-hidden />
                <p className="text-sm">No pudimos cargar los turnos de hoy. Reintentá en unos segundos.</p>
            </div>
        );
    }

    // Empty
    if (!todaysReminders.length) {
        return (
            <div className="flex flex-col items-center gap-2 py-12 text-muted">
                <FiCalendar size={28} aria-hidden />
                <p className="text-sm">No hay turnos para hoy.</p>
            </div>
        );
    }

    // Data
    return (
        <div className="bg-surface border border-border rounded-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-surface-2 border-b border-border">
                        <tr>
                            <th className="px-5 py-3 text-[11.5px] font-semibold tracking-widest text-muted uppercase">Cliente</th>
                            <th className="px-5 py-3 text-[11.5px] font-semibold tracking-widest text-muted uppercase">Servicio</th>
                            <th className="px-5 py-3 text-[11.5px] font-semibold tracking-widest text-muted uppercase">Horario</th>
                            <th className="px-5 py-3 text-[11.5px] font-semibold tracking-widest text-muted uppercase">Profesional</th>
                            <th className="px-5 py-3 text-[11.5px] font-semibold tracking-widest text-muted uppercase">Recordatorio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaysReminders.map((appointment) => {
                            const clientName = `${appointment.client.firstName} ${appointment.client.lastName ?? ''}`.trim();
                            const waPhone = appointment.client.phone ? toWhatsAppPhone(appointment.client.phone) : null;

                            return (
                                <tr key={appointment._id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                                    <td className="px-5 py-[13px] text-sm font-medium text-text">{clientName}</td>
                                    <td className="px-5 py-[13px] text-sm text-text-2">{appointment.service?.name ?? 'Sin servicio'}</td>
                                    <td className="px-5 py-[13px] text-sm text-text-2 whitespace-nowrap">{formatFullDateTime(appointment.startTime)}</td>
                                    <td className="px-5 py-[13px] text-sm text-text-2">{appointment.professional?.name ?? '—'}</td>
                                    <td className="px-5 py-[13px]">
                                        <button
                                            type="button"
                                            disabled={!waPhone}
                                            onClick={() => handleSendReminder(appointment)}
                                            aria-label={waPhone ? 'Enviar recordatorio por WhatsApp' : 'Sin teléfono cargado, no se puede enviar recordatorio'}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ctrl bg-sage-bg text-sage-text text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:hover:opacity-100"
                                        >
                                            {waPhone ? (
                                                <>
                                                    <FiMessageCircle aria-hidden />
                                                    Enviar recordatorio por WhatsApp
                                                </>
                                            ) : (
                                                <>
                                                    <FiPhoneOff aria-hidden />
                                                    Sin teléfono
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
