import { useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '@clerk/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FiCheckCircle, FiAlertCircle, FiLogIn } from 'react-icons/fi';
import { validateInvitation, acceptInvitation, type InvitationInfo } from '../api/invitacionApi';
import { handleApiError } from '../api/errorHandler';

export default function AceptarInvitacion() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isLoaded, userId } = useAuth();
    const token = searchParams.get('token') ?? '';

    const { data: info, isLoading, isError } = useQuery<InvitationInfo>({
        queryKey: ['invitation-validate', token],
        queryFn: () => validateInvitation(token),
        enabled: !!token,
        retry: false,
    });

    const { mutate: accept, isPending } = useMutation({
        mutationFn: () => acceptInvitation(token),
        onSuccess: () => {
            toast.success('¡Te uniste al equipo exitosamente!');
            navigate('/dashboard', { replace: true });
        },
        onError: (error) => handleApiError(error, 'Error al aceptar la invitación'),
    });

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text">
                <div className="text-center space-y-3">
                    <FiAlertCircle size={40} className="mx-auto text-maison-red" />
                    <p className="font-medium">Token de invitación inválido.</p>
                </div>
            </div>
        );
    }

    if (isLoading || !isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg">
                <div className="w-48 h-6 bg-gray-200 animate-pulse rounded-lg" />
            </div>
        );
    }

    if (isError || !info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text">
                <div className="text-center space-y-3 max-w-sm px-6">
                    <FiAlertCircle size={40} className="mx-auto text-maison-red" />
                    <p className="font-semibold font-serif text-xl">Invitación no válida</p>
                    <p className="text-gray-500 text-sm">El link expiró o ya fue utilizado.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text p-6">
            <div className="bg-maison-card border border-maison-border rounded-2xl p-8 max-w-sm w-full shadow-sm space-y-6">
                <div className="text-center space-y-1">
                    <h1 className="font-serif text-2xl font-bold">Shaer</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Invitación al equipo</p>
                </div>

                <div className="space-y-2 text-center">
                    <p className="text-gray-600 text-sm">Te invitaron a unirte como</p>
                    <p className="font-semibold text-lg">{info.professionalName}</p>
                    <p className="text-gray-500 text-sm">en <span className="font-medium text-maison-text">{info.tenantName}</span></p>
                </div>

                {!userId ? (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400 text-center">Iniciá sesión con <strong>{info.inviteEmail}</strong> para continuar.</p>
                        <a
                            href={`/login?redirect_url=${encodeURIComponent(`/unirse?token=${token}`)}`}
                            className="flex items-center justify-center gap-2 w-full bg-maison-primary hover:bg-black text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                            <FiLogIn /> Iniciar sesión
                        </a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400 text-center">Al confirmar, tu cuenta quedará vinculada a este equipo.</p>
                        <button
                            type="button"
                            onClick={() => accept()}
                            disabled={isPending}
                            className="flex items-center justify-center gap-2 w-full bg-maison-primary hover:bg-black disabled:bg-gray-400 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                            <FiCheckCircle /> {isPending ? 'Procesando...' : 'Confirmar y unirme'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
