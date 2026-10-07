import api from '../libs/axios';
import type { Client, Paginated } from '../types';

export interface ClientFormData {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    medicalNotes?: string;
}

export interface ClientPageParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface ClientOption {
    _id: string;
    firstName: string;
    lastName?: string;
    phone?: string;
}

export interface ClientOptionsParams {
    search?: string;
    limit?: number;
    ids?: string[];
}

/** GET /api/clientes — Página de clientes activos (paginado server-side) */
export const getClientsPage = async (
    { page = 1, limit = 7, search }: ClientPageParams = {}
): Promise<Paginated<Client>> => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    const response = await api.get<Paginated<Client>>('/clientes', { params });
    return response.data;
};

/** GET /api/clientes/opciones — Lista slim para selects (búsqueda server-side o resolución por ids) */
export const getClientOptions = async (
    { search, limit, ids }: ClientOptionsParams = {}
): Promise<ClientOption[]> => {
    const params: Record<string, string | number> = {};
    if (search) params.search = search;
    if (limit) params.limit = limit;
    if (ids && ids.length > 0) params.ids = ids.join(',');
    const response = await api.get<ClientOption[]>('/clientes/opciones', { params });
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
    email?: string;
    medicalNotes?: string;
}

/** POST /api/clientes/carga-masiva — Carga masiva de clientes */
export const createBulkClients = async (data: BulkClientData[]): Promise<{ message: string }> => {
    const response = await api.post('/clientes/carga-masiva', data);
    return response.data;
};
