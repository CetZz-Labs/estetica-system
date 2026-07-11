import type { ReactElement } from 'react';
import { FiCheck, FiX, FiCheckCircle, FiAlertTriangle, FiClock } from 'react-icons/fi';

import type { Appointment } from '../types';

const STATUS_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: 'var(--color-ring-subtle)', border: 'var(--color-ring)', text: 'var(--color-ring)' },
    cancelled: { bg: 'var(--color-destructive-subtle)', border: 'var(--color-destructive)', text: 'var(--color-destructive)' },
    completed: { bg: 'var(--color-muted)', border: 'var(--color-border)', text: 'var(--color-muted-foreground)' },
    pending: { bg: 'var(--color-muted)', border: 'var(--color-border)', text: 'var(--color-muted-foreground)' },
    overdue: { bg: 'var(--color-destructive-subtle)', border: 'var(--color-destructive)', text: 'var(--color-destructive)' },
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
