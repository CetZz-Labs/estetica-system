import api from '../libs/axios';
import type { ServiceRecord } from '../types';

export interface ServiceRecordPayload {
    client: string;
    service: string;
    serviceDate: string;
    notes?: string;
    nextTouchupDate?: string;
    productsUsed: { product: string; quantity: number }[];
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

/** GET /api/registros/cliente/:clientId — Historial de visitas de un cliente */
export const getClientRecords = async (clientId: string): Promise<ServiceRecord[]> => {
    const response = await api.get(`/registros/cliente/${clientId}`);
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

/** GET /api/dashboard/stats — Estadísticas del dashboard */
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};
