import api from '../libs/axios';

export interface InvitationInfo {
    professionalName: string;
    tenantName: string;
    inviteEmail: string;
}

export const validateInvitation = async (token: string): Promise<InvitationInfo> => {
    const { data } = await api.get('/invitacion/validate', { params: { token } });
    return data;
};

export const acceptInvitation = async (token: string): Promise<void> => {
    await api.post('/invitacion/aceptar', { token });
};
