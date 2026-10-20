import api from '../libs/axios';

export interface AppointmentsReportTotals {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
}

export interface AppointmentsByDay {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface AppointmentsByWeekday {
    weekday: number; // 1 = Lunes ... 7 = Domingo
    count: number;
}

export interface AppointmentsReport {
    range: { from: string; to: string };
    totals: AppointmentsReportTotals;
    byDay: AppointmentsByDay[];
    byWeekday: AppointmentsByWeekday[];
}

export const getAppointmentsReport = async (from: string, to: string): Promise<AppointmentsReport> => {
    const { data } = await api.get('/reportes/turnos', { params: { from, to } });
    return data;
};

export interface OccupancyCell {
    weekday: number; // 1 = Lunes ... 7 = Domingo
    hour: number; // 0..23
    count: number;
}

export interface OccupancyReport {
    range: { from: string; to: string };
    total: number;
    heatmap: OccupancyCell[];
    peak: OccupancyCell | null;
}

export interface TopService {
    serviceId: string;
    name: string;
    count: number;
}

export interface ProfessionalVisits {
    professionalId: string | null;
    name: string;
    color: string | null;
    count: number;
}

export interface ServicesReport {
    range: { from: string; to: string };
    totals: { visits: number; clientsServed: number };
    topServices: TopService[];
    byProfessional: ProfessionalVisits[];
}

export const getOccupancyReport = async (from: string, to: string): Promise<OccupancyReport> => {
    const { data } = await api.get('/reportes/ocupacion', { params: { from, to } });
    return data;
};

export const getServicesReport = async (from: string, to: string): Promise<ServicesReport> => {
    const { data } = await api.get('/reportes/servicios', { params: { from, to } });
    return data;
};

export interface TopProduct {
    productId: string;
    name: string;
    brand: string;
    usages: number;
    unitsConsumed: number;
    stock: number;
}

export interface LowStockItem {
    productId: string;
    name: string;
    brand: string;
    stock: number;
}

export interface ProductsReport {
    range: { from: string; to: string };
    totals: { productsUsed: number; usages: number; unitsConsumed: number };
    topProducts: TopProduct[];
    lowStock: { threshold: number; total: number; items: LowStockItem[] };
}

export const getProductsReport = async (from: string, to: string): Promise<ProductsReport> => {
    const { data } = await api.get('/reportes/productos', { params: { from, to } });
    return data;
};

export interface InactiveClient {
    clientId: string;
    name: string;
    lastVisit: string; // YYYY-MM-DD
    daysSince: number;
    visits: number;
}

export interface ClientsReport {
    range: { from: string; to: string };
    totals: { clientsServed: number; newClients: number; returningClients: number; returnRate: number }; // returnRate 0..1
    avgVisitIntervalDays: number | null;
    inactive: { thresholdDays: number; total: number; items: InactiveClient[] };
}

export const getClientsReport = async (from: string, to: string): Promise<ClientsReport> => {
    const { data } = await api.get('/reportes/clientes', { params: { from, to } });
    return data;
};
