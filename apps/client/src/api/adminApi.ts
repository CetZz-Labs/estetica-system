import api from '../libs/axios';
import type { AdminInfo } from '../types';

export const getMe = async (): Promise<AdminInfo> => {
    const { data } = await api.get('/admin');
    return data;
};
