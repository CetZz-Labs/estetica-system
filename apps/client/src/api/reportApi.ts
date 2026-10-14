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
