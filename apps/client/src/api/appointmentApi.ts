import api from '../libs/axios';
import type { Appointment, ServiceRecord } from '../types';

export interface AppointmentFormData {
    client: string;
    service: string;
    professional: string;
    startTime: string;
    notes?: string;
}

export interface AppointmentQueryParams {
    startDate?: string;
    endDate?: string;
    professional?: string;
    status?: string;
}

export const getAppointments = async (params?: AppointmentQueryParams): Promise<Appointment[]> => {
    const { data } = await api.get('/turnos', { params });
    return data;
};

export const getAppointmentById = async (id: string): Promise<Appointment> => {
    const { data } = await api.get(`/turnos/${id}`);
    return data;
};

export const createAppointment = async (data: AppointmentFormData): Promise<Appointment> => {
    const { data: result } = await api.post('/turnos', data);
    return result;
};

export const updateAppointment = async (id: string, data: Partial<AppointmentFormData>): Promise<Appointment> => {
    const { data: result } = await api.put(`/turnos/${id}`, data);
    return result;
};

export const cancelAppointment = async (id: string, cancelReason?: string): Promise<Appointment> => {
    const { data: result } = await api.patch(`/turnos/${id}/cancel`, { cancelReason });
    return result;
};

export const getClientAppointments = async (clientId: string, status?: string): Promise<Appointment[]> => {
    const { data } = await api.get(`/turnos/client/${clientId}`, { params: { status } });
    return data;
};

export const completeAppointment = async (id: string, data: {
    notes?: string;
    productsUsed?: { product: string; quantity: number }[];
    nextTouchupDate?: string;
}): Promise<{ serviceRecord: ServiceRecord; appointment: Appointment; touchupAppointment?: Appointment }> => {
    const { data: result } = await api.post(`/turnos/${id}/complete`, data);
    return result;
};

export const getPendingRegistration = async (): Promise<Appointment[]> => {
    const { data } = await api.get('/turnos/pending-registration');
    return data;
};
