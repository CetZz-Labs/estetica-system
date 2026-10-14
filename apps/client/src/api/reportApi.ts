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
