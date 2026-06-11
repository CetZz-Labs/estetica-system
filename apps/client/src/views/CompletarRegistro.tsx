import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FiAlertCircle } from 'react-icons/fi';
import { completeOnboarding } from '../api/onboardingApi';
import { handleApiError } from '../api/errorHandler';

export default function CompletarRegistro() {
    const { isLoaded, userId } = useAuth();
    const navigate = useNavigate();
    const [businessName, setBusinessName] = useState('');
    const [responsibleName, setResponsibleName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text">
                Cargando...
            </div>
        );
    }

    if (!userId) {
        return <Navigate to="/registro" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!businessName.trim()) {
            setError('El nombre del negocio es obligatorio');
            return;
        }

        setIsSubmitting(true);
        try {
            await completeOnboarding({
                businessName: businessName.trim(),
                responsibleName: responsibleName.trim() || undefined,
            });
            toast.success('¡Tu negocio fue registrado exitosamente!');
            navigate('/');
        } catch (err) {
            handleApiError(err, 'No pudimos completar el registro del negocio');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-maison-bg p-4">
            <div className="w-full max-w-md bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8">
                <div className="text-center mb-8">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Maison · CRM</p>
                    <h1 className="font-serif text-2xl sm:text-3xl text-maison-text">
                        Completá el registro
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Contanos los datos de tu negocio para terminar la configuración.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="businessName" className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                            Nombre del negocio *
                        </label>
                        <input
                            id="businessName"
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Maison Belle"
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="responsibleName" className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                            Nombre del responsable
                        </label>
                        <input
                            id="responsibleName"
                            type="text"
                            value={responsibleName}
                            onChange={(e) => setResponsibleName(e.target.value)}
                            placeholder="Ej: Ana Pérez"
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-maison-red font-medium">
                            <FiAlertCircle /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-maison-primary hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm cursor-pointer"
                    >
                        {isSubmitting ? 'Guardando...' : 'Completar registro'}
                    </button>
                </form>
            </div>
        </div>
    );
}
