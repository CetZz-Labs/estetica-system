import { AxiosError } from 'axios';
import api from '../libs/axios';
import type { Professional } from '../types';

export interface ProfessionalFormData {
    name: string;
    color: string;
    linkedAdmin?: string;
    inviteEmail?: string;
}

export interface LinkableAdmin {
    _id: string;
    email: string;
    role: string;
}

/** Turno futuro devuelto por el guard del DELETE (409). */
export interface FutureAppointment {
    _id: string;
    client: string;
    service: string;
    startTime: string;
}

/**
 * Error tipado que propaga el conflicto 409 del DELETE para que la vista
 * pueda listar los turnos a reasignar y ofrecer la confirmación forzada.
 */
export class ProfessionalDeleteConflict extends Error {
    futureAppointments: FutureAppointment[];

    constructor(message: string, futureAppointments: FutureAppointment[]) {
        super(message);
        this.name = 'ProfessionalDeleteConflict';
        this.futureAppointments = futureAppointments;
    }
}

interface DeleteConflictResponse {
    error?: string;
    futureAppointments?: FutureAppointment[];
}

/** GET /api/profesionales — Activos por defecto; ?includeInactive=true → todos */
export const getProfessionals = async (includeInactive = false): Promise<Professional[]> => {
    const { data } = await api.get('/profesionales', {
        params: includeInactive ? { includeInactive: true } : {},
    });
    return data;
};

/** GET /api/profesionales/linkable-admins — Usuarios vinculables (select opcional) */
export const getLinkableAdmins = async (): Promise<LinkableAdmin[]> => {
    const { data } = await api.get('/profesionales/linkable-admins');
    return data;
};

/** POST /api/profesionales — Crea un nuevo profesional */
export const createProfessional = async (payload: ProfessionalFormData): Promise<Professional> => {
    const { data } = await api.post('/profesionales', payload);
    return data;
};

/** PUT /api/profesionales/:id — Actualiza (incluye reactivar con isActive:true) */
export const updateProfessional = async (
    id: string,
    payload: Partial<ProfessionalFormData & { isActive: boolean }>,
): Promise<Professional> => {
    const { data } = await api.put(`/profesionales/${id}`, payload);
    return data;
};

/**
 * DELETE /api/profesionales/:id — Soft delete con guard de turnos futuros.
 * Si el backend responde 409 con `futureAppointments` y no se mandó `confirm`,
 * relanza un `ProfessionalDeleteConflict` para que la vista muestre el aviso.
 */
export const deleteProfessional = async (id: string, confirm = false): Promise<void> => {
    try {
        await api.delete(`/profesionales/${id}`, { data: confirm ? { confirm: true } : {} });
    } catch (error) {
        const axiosError = error as AxiosError<DeleteConflictResponse>;
        if (axiosError.response?.status === 409) {
            const data = axiosError.response.data;
            throw new ProfessionalDeleteConflict(
                data?.error || 'La profesional tiene turnos futuros asignados.',
                data?.futureAppointments ?? [],
            );
        }
        throw error;
    }
};
