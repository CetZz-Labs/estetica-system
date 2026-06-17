import api from '../libs/axios';
import type { Service } from '../types';

export interface ServiceFormData {
    name: string;
    defaultTouchupDays: number;
    duration?: number;
}

/** GET /api/servicios — Lista todos los servicios activos */
export const getServices = async (): Promise<Service[]> => {
    const response = await api.get('/servicios');
    return response.data;
};

/** POST /api/servicios — Crea un nuevo servicio */
export const createService = async (data: ServiceFormData): Promise<Service> => {
    const response = await api.post('/servicios', data);
    return response.data;
};

/** PUT /api/servicios/:id — Actualiza un servicio existente */
export const updateService = async (id: string, data: ServiceFormData): Promise<Service> => {
    const response = await api.put(`/servicios/${id}`, data);
    return response.data;
};

/** DELETE /api/servicios/:id — Soft delete de un servicio */
export const deleteService = async (id: string): Promise<void> => {
    await api.delete(`/servicios/${id}`);
};
