import api from '../libs/axios';
import type { Paginated, ServiceRecord } from '../types';

export interface ServiceRecordPayload {
    client: string;
    service: string;
    professional: string;
    serviceDate: string;
    notes?: string;
    nextTouchupDate?: string;
    productsUsed: { product: string; quantity: number }[];
    /** Exime la validación de serviceDate >= hoy, y exige que serviceDate sea estrictamente pasada (UX-69). */
    isBackfill?: boolean;
}

export interface DashboardStats {
    totalClients: number;
    servicesDone: number;
    upcomingTouchups: number;
}

/** POST /api/registros — Crea un nuevo registro de servicio */
export const createServiceRecord = async (
    data: Partial<ServiceRecordPayload>
): Promise<ServiceRecord> => {
    const response = await api.post('/registros', data);
    return response.data;
};

export interface ServiceRecordListParams {
    page: number;
    limit: number;
    clientId?: string;
    serviceId?: string;
    professionalId?: string;
    dateFrom?: string;
    dateTo?: string;
}

/** GET /api/registros — Historial completo del tenant, paginado y filtrable */
export const getServiceRecords = async (
    params: ServiceRecordListParams
): Promise<Paginated<ServiceRecord>> => {
    const response = await api.get('/registros', { params });
    return response.data;
};

export interface ClientRecordsParams {
    page: number;
    limit: number;
    dateFrom?: string;
    dateTo?: string;
}

/** GET /api/registros/cliente/:clientId — Historial de visitas de un cliente, paginado y filtrable por fecha */
export const getClientRecords = async (
    clientId: string,
    params: ClientRecordsParams
): Promise<Paginated<ServiceRecord>> => {
    const response = await api.get(`/registros/cliente/${clientId}`, { params });
    return response.data;
};

/** GET /api/registros/retoques — Próximos retoques pendientes */
export const getUpcomingTouchups = async (): Promise<ServiceRecord[]> => {
    const response = await api.get('/registros/retoques');
    return response.data;
};

/** GET /api/registros/recientes — Últimos 10 movimientos */
export const getRecentRecords = async (): Promise<ServiceRecord[]> => {
    const response = await api.get('/registros/recientes');
    return response.data;
};

/** PUT /api/registros/:id — Actualiza un registro (ej: marcar retoque completado) */
export const updateServiceRecord = async (
    id: string,
    data: Partial<ServiceRecord>
): Promise<ServiceRecord> => {
    const response = await api.put(`/registros/${id}`, data);
    return response.data;
};

/** DELETE /api/registros/:id — Elimina un registro de visita y restaura el stock de los productos usados (solo ADMIN) */
export const deleteServiceRecord = async (id: string): Promise<void> => {
    await api.delete(`/registros/${id}`);
};

/** GET /api/dashboard/stats — Estadísticas del dashboard */
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};
