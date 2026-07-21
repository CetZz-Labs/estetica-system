import type { ReactElement } from 'react';
import { FiCheck, FiX, FiCheckCircle, FiAlertTriangle, FiClock } from 'react-icons/fi';

import type { Appointment } from '../types';

// UX-33-B: colores remapeados a los tokens nativos Shear (docs/design.md §8). Turnos.tsx y
// AppointmentDetail.tsx consumen esta misma paleta y heredan el cambio — pendiente de revisión
// visual en esos archivos durante UX-34.
const STATUS_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: 'var(--color-rose-bg)', border: 'var(--color-rose-text)', text: 'var(--color-rose-text)' },
    cancelled: { bg: 'var(--color-alert-bg)', border: 'var(--color-alert-text)', text: 'var(--color-alert-text)' },
    completed: { bg: 'var(--color-sage-bg)', border: 'var(--color-sage-text)', text: 'var(--color-sage-text)' },
    pending: { bg: 'var(--color-gold-bg)', border: 'var(--color-gold-text)', text: 'var(--color-gold-text)' },
    overdue: { bg: 'var(--color-alert-bg)', border: 'var(--color-alert-text)', text: 'var(--color-alert-text)' },
};

/** Paleta de color asociada al estado (render) de un turno. Reutilizada por el calendario y el detalle. */
export function getStatusPalette(status: string): { bg: string; border: string; text: string } {
    return STATUS_PALETTE[status] || STATUS_PALETTE.pending;
}

/** Etiqueta legible en español para el estado (render) de un turno. */
export function getStatusLabel(status: string): string {
    switch (status) {
        case 'pending': return 'Pendiente';
        case 'confirmed': return 'Confirmado';
        case 'cancelled': return 'Cancelado';
        case 'completed': return 'Completado';
        case 'overdue': return 'Atrasado';
        default: return status;
    }
}

/** Icono asociado al estado (render) de un turno. */
export function getStatusIcon(status: string): ReactElement {
    switch (status) {
        case 'confirmed': return <FiCheck />;
        case 'cancelled': return <FiX />;
        case 'completed': return <FiCheckCircle />;
        case 'overdue': return <FiAlertTriangle />;
        default: return <FiClock />;
    }
}

/** Un turno "pending" cuyo horario de fin ya pasó se considera atrasado. */
export function isOverduePending(appointment: Appointment): boolean {
    return appointment.status === 'pending' && new Date(appointment.endTime) < new Date();
}

/** Estado "de render": igual al status real, salvo que se recalcula a "overdue" cuando corresponde. */
export function getRenderStatus(appointment: Appointment): string {
    return isOverduePending(appointment) ? 'overdue' : appointment.status;
}
