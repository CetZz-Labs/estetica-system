import api from '../libs/axios';

export interface OnboardingData {
    businessName: string;
    responsibleName?: string;
}

export interface OnboardingResponse {
    tenant: {
        _id: string;
        businessName: string;
    };
    admin: {
        _id: string;
        email: string;
        tenantId: string;
        role: string;
    };
}

/** POST /api/onboarding — Crea el tenant y el admin para el usuario recién registrado en Clerk */
export const completeOnboarding = async (data: OnboardingData): Promise<OnboardingResponse> => {
    const response = await api.post('/onboarding', data);
    return response.data;
};
