import api from '../libs/axios';
import type { Client } from '../types';

export interface ClientFormData {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
}

/** GET /api/clientes — Lista todos los clientes activos */
export const getClients = async (): Promise<Client[]> => {
    const response = await api.get('/clientes');
    return response.data;
};

/** GET /api/clientes/:id — Obtiene un cliente por ID */
export const getClientById = async (id: string): Promise<Client> => {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
};

/** POST /api/clientes — Crea un nuevo cliente */
export const createClient = async (data: ClientFormData): Promise<Client> => {
    const response = await api.post('/clientes', data);
    return response.data;
};

/** PUT /api/clientes/:id — Actualiza un cliente existente */
export const updateClient = async (id: string, data: ClientFormData): Promise<Client> => {
    const response = await api.put(`/clientes/${id}`, data);
    return response.data;
};

/** DELETE /api/clientes/:id — Soft delete de un cliente */
export const deleteClient = async (id: string): Promise<void> => {
    await api.delete(`/clientes/${id}`);
};

export interface BulkClientData {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
}

/** POST /api/clientes/carga-masiva — Carga masiva de clientes */
export const createBulkClients = async (data: BulkClientData[]): Promise<{ message: string }> => {
    const response = await api.post('/clientes/carga-masiva', data);
    return response.data;
};
