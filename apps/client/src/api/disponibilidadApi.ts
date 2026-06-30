import api from '../libs/axios';

export interface DaySchedule {
    day: number;       // 0=Dom, 1=Lun, ..., 6=Sáb
    isOpen: boolean;
    openTime: string;  // "HH:MM"
    closeTime: string; // "HH:MM"
}

export interface BlockedDate {
    date: string;      // "YYYY-MM-DD"
    reason?: string;
}

export interface BusinessHours {
    schedule: DaySchedule[];
    blockedDates: BlockedDate[];
}

export const getDisponibilidad = async (): Promise<BusinessHours> => {
    const { data } = await api.get('/disponibilidad');
    return data;
};

export const updateDisponibilidad = async (payload: Partial<BusinessHours>): Promise<BusinessHours> => {
    const { data } = await api.put('/disponibilidad', payload);
    return data;
};
