import { FiUser, FiPhone, FiCalendar, FiClock, FiCheck, FiEdit2, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router';

import type { Appointment } from '../types';
import { formatDateTime, formatFullDateTime, formatTime } from '../utils/dates';
import { getStatusIcon, getRenderStatus, getStatusLabel } from '../utils/appointmentStatus';

interface DetailProps {
    appointment: Appointment;
}

/**
 * Contenido de solo lectura con el detalle de un turno (estado, cliente, servicio,
 * profesional, horario, notas, motivo de cancelación y link a la ficha del cliente).
 * Compartido entre `Turnos.tsx` (modal del calendario) y `Dashboard.tsx` (modal de la card
 * de "Próximos turnos"). Se usa como `children` del `<Modal>` compartido.
 */
export default function AppointmentDetail({ appointment }: DetailProps) {
    const status = getRenderStatus(appointment);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                    status === 'confirmed' ? 'bg-green-50 text-maison-green border-green-200' :
                    status === 'cancelled' ? 'bg-red-50 text-maison-red border-red-200' :
                    status === 'overdue' ? 'bg-red-50 text-maison-red border-red-200' :
                    status === 'completed' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                    'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                    {getStatusIcon(status)}
                    {getStatusLabel(status)}
                </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                    <FiUser className="text-lg" />
                </div>
                <div>
                    <p className="text-sm font-medium text-maison-text">{appointment.client.firstName} {appointment.client.lastName}</p>
                    {appointment.client.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><FiPhone /> {appointment.client.phone}</p>
                    )}
                </div>
            </div>

            {appointment.service && (
                <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                    <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                        <FiCalendar className="text-lg" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-maison-text">{appointment.service.name}</p>
                        <p className="text-xs text-gray-500">{appointment.service.duration} min</p>
                    </div>
                </div>
            )}

            {appointment.professional && typeof appointment.professional === 'object' && (
                <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                    <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                        <FiUser className="text-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-maison-border shrink-0" style={{ backgroundColor: appointment.professional.color }} aria-hidden />
                        <p className="text-sm font-medium text-maison-text">{appointment.professional.name}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                    <FiClock className="text-lg" />
                </div>
                <div>
                    <p className="text-sm font-medium text-maison-text">{formatFullDateTime(appointment.startTime)}</p>
                    <p className="text-xs text-gray-500">Hasta {formatTime(appointment.endTime)}</p>
                </div>
            </div>

            {appointment.notes && (
                <div>
                    <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Notas</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">{appointment.notes}</p>
                </div>
            )}

            {appointment.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold tracking-widest text-maison-red uppercase mb-2">Cancelación</h4>
                    {appointment.cancelReason && (
                        <p className="text-sm text-red-700 mb-1">Motivo: {appointment.cancelReason}</p>
                    )}
                    {appointment.cancelledAt && (
                        <p className="text-xs text-red-500">{formatDateTime(appointment.cancelledAt)}</p>
                    )}
                </div>
            )}

            <Link
                to={`/clientes/${appointment.client._id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-maison-primary hover:underline"
            >
                <FiExternalLink /> Ir a ficha del cliente
            </Link>
        </div>
    );
}

interface FooterProps {
    appointment: Appointment;
    /** Se omite (no se renderiza el botón) si no se provee. */
    onCancel?: () => void;
    /** Se omite (no se renderiza el botón) si no se provee. */
    onEdit?: () => void;
    /** Se omite (no se renderiza el botón) si no se provee. */
    onComplete?: () => void;
}

/**
 * Footer de acciones para el modal de detalle de turno. Las acciones se inyectan por props:
 * si un callback no se provee, el botón correspondiente no se renderiza. No se muestra ninguna
 * acción si el turno ya está cancelado o completado.
 */
export function AppointmentDetailFooter({ appointment, onCancel, onEdit, onComplete }: FooterProps) {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        return null;
    }

    return (
        <>
            {onCancel && (
                <button onClick={onCancel}
                    aria-label="Cancelar turno"
                    title="Cancelar turno"
                    className="p-2 text-gray-400 hover:text-maison-red transition-colors cursor-pointer">
                    <FiTrash2 className="text-lg" />
                </button>
            )}
            {onEdit && (
                <button onClick={onEdit}
                    aria-label="Editar turno"
                    title="Editar turno"
                    className="p-2 text-gray-400 hover:text-maison-primary transition-colors cursor-pointer">
                    <FiEdit2 className="text-lg" />
                </button>
            )}
            {onComplete && (
                <button onClick={onComplete}
                    className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
                    <FiCheck /> Completar y Registrar
                </button>
            )}
        </>
    );
}
