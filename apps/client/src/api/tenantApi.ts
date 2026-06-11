import api from '../libs/axios';

export interface TenantSettings {
    _id?: string;
    name: string;
    logo?: string;
    timezone: string;
    currency: string;
    isActive?: boolean;
}

export const getTenant = async (): Promise<{ tenant: TenantSettings }> => {
    const response = await api.get('/negocio');
    return response.data;
};

export const updateTenant = async (data: Partial<TenantSettings>): Promise<{ tenant: TenantSettings }> => {
    const response = await api.put('/negocio', data);
    return response.data;
};
