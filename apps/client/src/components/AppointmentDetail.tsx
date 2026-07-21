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
                    status === 'confirmed' ? 'bg-ring-subtle text-ring border-ring/20' :
                    status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    status === 'completed' ? 'bg-muted text-muted-foreground border-border' :
                    'bg-muted text-muted-foreground border-border'
                }`}>
                    {getStatusIcon(status)}
                    {getStatusLabel(status)}
                </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                <div className="p-2 bg-card rounded-full border border-border text-muted-foreground">
                    <FiUser className="text-lg" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{appointment.client.firstName} {appointment.client.lastName}</p>
                    {appointment.client.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><FiPhone /> {appointment.client.phone}</p>
                    )}
                </div>
            </div>

            {appointment.service && (
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                    <div className="p-2 bg-card rounded-full border border-border text-muted-foreground">
                        <FiCalendar className="text-lg" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{appointment.service.name}</p>
                        <p className="text-xs text-muted-foreground">{appointment.service.duration} min</p>
                    </div>
                </div>
            )}

            {appointment.professional && typeof appointment.professional === 'object' && (
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                    <div className="p-2 bg-card rounded-full border border-border text-muted-foreground">
                        <FiUser className="text-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-border shrink-0" style={{ backgroundColor: appointment.professional.color }} aria-hidden />
                        <p className="text-sm font-medium text-foreground">{appointment.professional.name}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                <div className="p-2 bg-card rounded-full border border-border text-muted-foreground">
                    <FiClock className="text-lg" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{formatFullDateTime(appointment.startTime)}</p>
                    <p className="text-xs text-muted-foreground">Hasta {formatTime(appointment.endTime)}</p>
                </div>
            </div>

            {appointment.notes && (
                <div>
                    <h4 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Notas</h4>
                    <p className="text-sm text-muted-foreground bg-surface-2 p-3 rounded-lg border border-border">{appointment.notes}</p>
                </div>
            )}

            {appointment.status === 'cancelled' && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold tracking-widest text-destructive uppercase mb-2">Cancelación</h4>
                    {appointment.cancelReason && (
                        <p className="text-sm text-destructive mb-1">Motivo: {appointment.cancelReason}</p>
                    )}
                    {appointment.cancelledAt && (
                        <p className="text-xs text-muted-foreground">{formatDateTime(appointment.cancelledAt)}</p>
                    )}
                </div>
            )}

            <Link
                to={`/clientes/${appointment.client._id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
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
                    className="p-2 text-muted-foreground hover:text-destructive transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer">
                    <FiTrash2 className="text-lg" />
                </button>
            )}
            {onEdit && (
                <button onClick={onEdit}
                    aria-label="Editar turno"
                    title="Editar turno"
                    className="p-2 text-muted-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer">
                    <FiEdit2 className="text-lg" />
                </button>
            )}
            {onComplete && (
                <button onClick={onComplete}
                    className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer">
                    <FiCheck /> Completar y Registrar
                </button>
            )}
        </>
    );
}
