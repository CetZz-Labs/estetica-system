import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { FiUsers, FiScissors, FiCalendar, FiPlus, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'sonner';

import { getDashboardStats, getUpcomingTouchups, getRecentRecords, updateServiceRecord } from '../api/serviceRecordApi';
import { getPendingRegistration } from '../api/appointmentApi';
import type { ServiceRecord, Appointment } from '../types';
import type { DashboardStats } from '../api/serviceRecordApi';
import { formatDate, getTimelineStatus } from '../utils/dates';
import { handleApiError } from '../api/errorHandler';
import RegistroModal from '../components/RegistroModal';
import { Link } from 'react-router';

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
};

export default function Dashboard() {
    const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
    const { isLoaded, user } = useUser();
    const displayName = user?.username || user?.firstName || user?.fullName || '';

    const [prefillClient, setPrefillClient] = useState<string | undefined>(undefined);
    const [prefillService, setPrefillService] = useState<string | undefined>(undefined);

    const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: getDashboardStats
    });

    const { data: retoques, isLoading: isLoadingRetoques } = useQuery<ServiceRecord[]>({
        queryKey: ['upcoming-touchups'],
        queryFn: getUpcomingTouchups
    });

    const { data: recientes, isLoading: isLoadingRecientes } = useQuery<ServiceRecord[]>({
        queryKey: ['recent-movements'],
        queryFn: getRecentRecords
    });

    const { data: pendingRegistration } = useQuery<Appointment[]>({
        queryKey: ['pending-registration'],
        queryFn: getPendingRegistration,
        refetchInterval: 30000,
    });

    const handleOpenNewVisit = () => {
        setPrefillClient(undefined);
        setPrefillService(undefined);
        setIsRegistroModalOpen(true);
    };

    const handleTouchupCheck = (clientId: string, serviceId: string) => {
        setPrefillClient(clientId);
        setPrefillService(serviceId);
        setIsRegistroModalOpen(true);
    };

    const queryClient = useQueryClient();

    const { mutate: cancelTouchup } = useMutation({
        mutationFn: (id: string) => updateServiceRecord(id, { touchupStatus: 'cancelled' }),
        onSuccess: () => {
            toast.success('Retoque cancelado');
            queryClient.invalidateQueries({ queryKey: ['upcoming-touchups'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        },
        onError: (error) => handleApiError(error, 'Error al cancelar el retoque')
    });

    const handleCancelTouchup = (e: React.MouseEvent, recordId: string) => {
        e.stopPropagation();
        if (window.confirm('¿Cancelar este retoque?')) {
            cancelTouchup(recordId);
        }
    };

    const isDashboardLoading = isLoadingStats || isLoadingRetoques || isLoadingRecientes;

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Panel Principal</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">
                        {isLoaded ? `${getGreeting()}${displayName ? `, ${displayName}` : ''} ✿` : getGreeting()}
                    </h3>
                </div>
                <div className="flex gap-3">
                    <Link to="/clientes" className="bg-white border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2.5 sm:px-5 rounded-full text-sm font-medium transition-colors shadow-sm">Directorio</Link>

                    <button onClick={handleOpenNewVisit} className="bg-maison-primary hover:bg-black text-white px-4 py-2.5 sm:px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
                        <FiPlus /> <span>Nueva Visita</span>
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {isDashboardLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4 animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                            <div className="space-y-2 flex-1 mt-1"><div className="h-3 bg-gray-200 rounded w-1/2"></div><div className="h-8 bg-gray-200 rounded w-1/4 mt-2"></div></div>
                        </div>
                    ))
                ) : (
                    <>
                        <div className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4">
                            <div className="bg-maison-bg p-3 rounded-xl border border-maison-border"><FiUsers className="text-xl text-gray-600" /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Total de Clientes</h4><span className="text-3xl font-serif">{stats?.totalClients || 0}</span></div>
                        </div>
                        <div className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4">
                            <div className="bg-maison-bg p-3 rounded-xl border border-maison-border"><FiScissors className="text-xl text-gray-600" /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Servicios Realizados</h4><span className="text-3xl font-serif">{stats?.servicesDone || 0}</span></div>
                        </div>
                        <div className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4">
                            <div className="bg-maison-bg p-3 rounded-xl border border-maison-border"><FiCalendar className="text-xl text-gray-600" /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Próximos Retoques</h4><span className="text-3xl font-serif">{stats?.upcomingTouchups || 0}</span></div>
                        </div>
                    </>
                )}
            </div>

            {!isDashboardLoading && pendingRegistration && pendingRegistration.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 bg-amber-100 rounded-xl border border-amber-200 shrink-0">
                        <FiAlertTriangle className="text-xl text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-amber-800">Turnos pendientes de registrar</h4>
                        <p className="text-xs text-amber-700 mt-1 mb-3">
                            {pendingRegistration.length} turno{pendingRegistration.length !== 1 ? 's' : ''} completado{pendingRegistration.length !== 1 ? 's' : ''} sin visita registrada.
                        </p>
                        <a href="/turnos" className="inline-block text-xs font-semibold text-amber-800 underline hover:text-amber-900 transition-colors">
                            Ir a la agenda
                        </a>
                    </div>
                </div>
            )}

            {/* Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline */}
                <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                        <div><h4 className="text-xl font-serif">Próximos retoques</h4><p className="text-sm text-gray-400 mt-1">Historial de retoques pendientes</p></div>
                    </div>
                    {isDashboardLoading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 animate-pulse ml-4">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                                    <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-3 bg-gray-200 rounded w-1/2"></div></div>
                                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : retoques?.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4">No hay retoques pendientes.</p>
                    ) : (
                        <div className="relative pl-3 border-l-2 border-maison-border space-y-4 py-2 ml-2">
                            {retoques?.map((registro) => {
                                if (!registro.nextTouchupDate) return null;
                                const status = getTimelineStatus(registro.nextTouchupDate);
                                const initials = registro.client.firstName.charAt(0).toUpperCase();
                                return (
                                    <div key={registro._id} className="relative flex justify-between items-center bg-white border border-maison-border rounded-xl p-4 shadow-sm ml-6 hover:border-gray-300 transition-colors group">
                                        <div className={`absolute -left-11.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${status.dotColor} ring-4 ring-white`}></div>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-maison-bg border border-maison-border flex items-center justify-center font-serif text-lg text-maison-text shadow-sm">{initials}</div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-maison-text truncate">{registro.client.firstName} {registro.client.lastName}</p>
                                                <p className="text-sm text-gray-500 mt-0.5 truncate">{registro.service.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end shrink-0 ml-2">
                                            <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full mb-1.5 ${status.pillClass}`}>{status.label}</span>
                                            <p className="text-xs text-gray-400 font-medium">{formatDate(registro.nextTouchupDate)}</p>
                                        </div>

                                        <div className="absolute -right-3 -top-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => handleCancelTouchup(e, registro._id)}
                                                title="Cancelar este retoque"
                                                className="w-8 h-8 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center text-gray-400 hover:text-maison-red hover:border-maison-red transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiX size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleTouchupCheck(registro.client._id, registro.service._id)}
                                                title="Registrar nueva visita para este retoque"
                                                className="w-8 h-8 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center text-gray-400 hover:text-maison-green hover:border-maison-green transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiCheck size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent */}
                <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm flex flex-col">
                    <h4 className="text-xl font-serif">Últimos movimientos</h4>
                    <p className="text-sm text-gray-400 mt-1 mb-8">Servicios recientemente registrados</p>
                    {isDashboardLoading ? (
                        <div className="space-y-5 flex-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex justify-between items-center animate-pulse">
                                    <div className="space-y-2 flex-1"><div className="h-3 bg-gray-200 rounded w-1/2"></div><div className="h-2 bg-gray-200 rounded w-1/3"></div></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : recientes?.length === 0 ? (
                        <p className="text-gray-500 text-sm">No hay servicios recientes.</p>
                    ) : (
                        <ul className="space-y-6 pl-1 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {recientes?.map((registro) => (
                                <li key={registro._id} className="relative pl-5 group">
                                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-maison-text transition-colors"></span>
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-maison-text text-sm truncate">{registro.client.firstName} {registro.client.lastName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{registro.service.name}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-400 font-medium tracking-wide shrink-0">{formatDate(registro.createdAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <RegistroModal
                isOpen={isRegistroModalOpen}
                onClose={() => setIsRegistroModalOpen(false)}
                preselectedClientId={prefillClient}
                preselectedServiceId={prefillService}
            />
        </div>
    );
}