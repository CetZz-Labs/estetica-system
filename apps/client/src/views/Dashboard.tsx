import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { FiUsers, FiScissors, FiPlus, FiCheck, FiX, FiAlertTriangle, FiZap } from 'react-icons/fi';
import { toast } from 'sonner';

import { getDashboardStats, getUpcomingTouchups, getRecentRecords, updateServiceRecord } from '../api/serviceRecordApi';
import { getPendingRegistration, cancelAppointment, getUpcomingAppointments } from '../api/appointmentApi';
import type { ServiceRecord, Appointment } from '../types';
import type { DashboardStats } from '../api/serviceRecordApi';
import { formatDate, getTimelineStatus, formatDateTime } from '../utils/dates';
import { handleApiError } from '../api/errorHandler';
import RegistroModal from '../components/RegistroModal';
import ConfirmModal from '../components/ui/ConfirmModal';
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

    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
    const [prefillClient, setPrefillClient] = useState<string | undefined>(undefined);
    const [prefillService, setPrefillService] = useState<string | undefined>(undefined);
    const [completedAppointmentId, setCompletedAppointmentId] = useState<string | undefined>(undefined);
    const [prefillProfessional, setPrefillProfessional] = useState<string | undefined>(undefined);
    const [prefillServiceDate, setPrefillServiceDate] = useState<string | undefined>(undefined);

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

    const { data: proximosTurnos, isLoading: isLoadingTurnos } = useQuery<Appointment[]>({
        queryKey: ['upcoming-appointments'],
        queryFn: getUpcomingAppointments
    });

    const handleOpenNewVisit = () => {
        setCompletedAppointmentId(undefined);
        setPrefillClient(undefined);
        setPrefillService(undefined);
        setPrefillProfessional(undefined);
        setPrefillServiceDate(undefined);
        setIsRegistroModalOpen(true);
    };

    const handleTouchupCheck = (clientId: string, serviceId: string) => {
        setCompletedAppointmentId(undefined);
        setPrefillClient(clientId);
        setPrefillService(serviceId);
        setPrefillProfessional(undefined);
        setPrefillServiceDate(undefined);
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
        setConfirmCancelId(recordId);
    };

    const { mutate: cancelAppointmentMutate } = useMutation({
        mutationFn: (id: string) => cancelAppointment(id),
        onSuccess: () => {
            toast.success('Turno cancelado');
            queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
        },
        onError: (error) => handleApiError(error, 'Error al cancelar el turno')
    });

    const handleCancelAppointment = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        toast('¿Cancelar este turno?', {
            action: { label: 'Confirmar', onClick: () => cancelAppointmentMutate(id) },
            cancel: { label: 'No', onClick: () => {} },
            duration: 5000
        });
    };

    const handleCompleteFromDashboard = (appt: Appointment) => {
        setCompletedAppointmentId(appt._id);
        setPrefillClient(appt.client._id);
        setPrefillService(appt.service?._id);
        setPrefillProfessional(appt.professional?._id);
        setPrefillServiceDate(new Date(appt.startTime).toISOString().split('T')[0]);
        setIsRegistroModalOpen(true);
    };

    const handleCloseRegistroModal = () => {
        setIsRegistroModalOpen(false);
        setCompletedAppointmentId(undefined);
        setPrefillClient(undefined);
        setPrefillService(undefined);
        setPrefillProfessional(undefined);
        setPrefillServiceDate(undefined);
    };

    const isDashboardLoading = isLoadingStats || isLoadingRetoques || isLoadingRecientes || isLoadingTurnos;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-10">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2 uppercase">Panel Principal</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-foreground">
                        {isLoaded ? `${getGreeting()}${displayName ? `, ${displayName}` : ''} ✿` : getGreeting()}
                    </h3>
                </div>
                <div className="flex gap-3">
                    <Link to="/clientes" className="bg-card border border-border hover:border-primary/40 text-muted-foreground px-4 py-2.5 sm:px-5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm">Directorio</Link>
                    <button onClick={handleOpenNewVisit} className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 sm:px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer">
                        <FiPlus /> <span>Nueva Visita</span>
                    </button>
                </div>
            </header>

            {/* Stats */}
            {(() => {
                const breakdown = retoques?.reduce(
                    (acc, r) => {
                        if (!r.nextTouchupDate) return acc;
                        const status = getTimelineStatus(r.nextTouchupDate);
                        if (status.dotColor === 'bg-destructive') acc.overdue++;
                        else if (status.dotColor === 'bg-warning') acc.upcoming++;
                        else acc.scheduled++;
                        return acc;
                    },
                    { overdue: 0, upcoming: 0, scheduled: 0 }
                ) ?? { overdue: 0, upcoming: 0, scheduled: 0 };

                const hasOverdue = breakdown.overdue > 0;

                return (
                    <>
                        {/* Hero KPI */}
                        <div className={`bg-card border border-border rounded-lg p-6 mb-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-default ${hasOverdue ? 'border-t-2 border-t-destructive' : 'border-t-2 border-t-primary/30'}`}>
                            {isDashboardLoading ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-muted rounded"></div><div className="h-3 bg-muted rounded w-32"></div></div>
                                    <div className="h-12 bg-muted rounded w-20"></div>
                                    <div className="flex gap-6"><div className="h-4 bg-muted rounded w-24"></div><div className="h-4 bg-muted rounded w-28"></div><div className="h-4 bg-muted rounded w-28"></div></div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`p-1.5 rounded-lg ${hasOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                                            <FiZap className={`text-base ${hasOverdue ? 'text-destructive' : 'text-primary'}`} />
                                        </div>
                                        <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Retoques pendientes</h4>
                                    </div>
                                    <p className="text-5xl font-serif text-foreground mb-5 leading-none">{retoques?.length || 0}</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                        {breakdown.overdue > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0"></span>
                                                <span className="text-destructive font-semibold">{breakdown.overdue}</span>
                                                <span className="text-muted-foreground">Vencido{breakdown.overdue !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        {breakdown.upcoming > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0"></span>
                                                <span className="text-warning font-semibold">{breakdown.upcoming}</span>
                                                <span className="text-muted-foreground">Esta semana</span>
                                            </div>
                                        )}
                                        {breakdown.scheduled > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-ring shrink-0"></span>
                                                <span className="text-ring font-semibold">{breakdown.scheduled}</span>
                                                <span className="text-muted-foreground">Programados</span>
                                            </div>
                                        )}
                                        {retoques?.length === 0 && (
                                            <span className="text-muted-foreground text-sm">Sin retoques pendientes</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Secondary Strip */}
                        <div className="bg-card border border-border rounded-lg px-6 py-4 mb-10 flex items-center gap-6 shadow-sm">
                            {isLoadingStats ? (
                                <div className="flex items-center gap-6 w-full animate-pulse">
                                    <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-muted rounded"></div><div className="h-3 bg-muted rounded w-24"></div><div className="h-5 bg-muted rounded w-10"></div></div>
                                    <div className="w-px h-5 bg-border"></div>
                                    <div className="flex items-center gap-2.5"><div className="w-4 h-4 bg-muted rounded"></div><div className="h-3 bg-muted rounded w-32"></div><div className="h-5 bg-muted rounded w-10"></div></div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <FiUsers className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Clientes totales</span>
                                        <span className="font-serif text-foreground text-lg font-medium">{stats?.totalClients || 0}</span>
                                    </div>
                                    <div className="w-px h-5 bg-border"></div>
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <FiScissors className="text-muted-foreground" />
                                        <span className="text-muted-foreground">Servicios realizados</span>
                                        <span className="font-serif text-foreground text-lg font-medium">{stats?.servicesDone || 0}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* Pending Registration Alert */}
            {!isDashboardLoading && pendingRegistration && pendingRegistration.length > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-5 mb-8 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 bg-warning/20 rounded-lg shrink-0">
                        <FiAlertTriangle className="text-xl text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-warning-foreground">Turnos pendientes de registrar</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                            {pendingRegistration.length} turno{pendingRegistration.length !== 1 ? 's' : ''} completado{pendingRegistration.length !== 1 ? 's' : ''} sin visita registrada.
                        </p>
                        <a href="/turnos" className="inline-block text-xs font-semibold text-warning-foreground underline hover:text-warning transition-colors">
                            Ir a la agenda
                        </a>
                    </div>
                </div>
            )}

            {/* Columns - Retoques | Turnos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Timeline - Próximos retoques */}
                <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm hover:border-t-primary/60 transition-all duration-200">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h4 className="text-xl font-serif font-semibold text-foreground">Próximos retoques</h4>
                            <p className="text-sm text-muted-foreground mt-1">Los 7 más próximos · ordenados por fecha</p>
                        </div>
                    </div>
                    {isDashboardLoading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 animate-pulse ml-4">
                                    <div className="w-10 h-10 bg-muted rounded-full shrink-0"></div>
                                    <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-3 bg-muted rounded w-1/2"></div></div>
                                    <div className="w-16 h-6 bg-muted rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : retoques?.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No hay retoques pendientes.</p>
                    ) : (
                        <div className="relative pl-3 border-l-2 border-border space-y-4 py-2 ml-2">
                            {retoques?.map((registro) => {
                                if (!registro.nextTouchupDate) return null;
                                const status = getTimelineStatus(registro.nextTouchupDate);
                                const initials = registro.client.firstName.charAt(0).toUpperCase();
                                return (
                                    <div key={registro._id} className="relative flex justify-between items-center bg-card border border-border rounded-lg p-4 shadow-sm ml-6 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                                        <div className={`absolute -left-11.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${status.dotColor} ring-4 ring-card`}></div>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-serif text-lg text-primary">{initials}</div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground truncate">{registro.client.firstName} {registro.client.lastName}</p>
                                                <p className="text-sm text-muted-foreground mt-0.5 truncate">{registro.service.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end shrink-0 ml-2">
                                            <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full mb-1.5 ${status.pillClass}`}>{status.label}</span>
                                            <p className="text-xs text-muted-foreground font-medium">{formatDate(registro.nextTouchupDate)}</p>
                                        </div>
                                        <div className="absolute -right-3 -top-3 flex gap-1 opacity-100 transition-all">
                                            <button
                                                onClick={(e) => handleCancelTouchup(e, registro._id)}
                                                title="Cancelar este retoque"
                                                className="w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive-subtle hover:text-destructive hover:border-destructive transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiX size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTouchupCheck(registro.client._id, registro.service._id); }}
                                                title="Registrar visita de retoque"
                                                className="w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-ring-subtle hover:text-ring hover:border-ring transition-all cursor-pointer shadow-sm"
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

                {/* Próximos Turnos */}
                <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm hover:border-t-primary/60 transition-all duration-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-xl font-serif font-semibold text-foreground">Próximos turnos</h4>
                            <p className="text-sm text-muted-foreground mt-1">Los 7 más próximos · ordenados por fecha</p>
                        </div>
                    </div>
                    {isDashboardLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse p-3 border border-border rounded-lg">
                                    <div className="w-3 h-3 bg-muted rounded-full mt-1.5 shrink-0"></div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-muted rounded w-2/3"></div>
                                        <div className="h-2.5 bg-muted rounded w-1/2"></div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <div className="w-8 h-8 bg-muted rounded-full"></div>
                                        <div className="w-8 h-8 bg-muted rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : proximosTurnos?.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No hay turnos próximos.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {proximosTurnos?.map(appt => {
                                return (
                                    <div key={appt._id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/30 transition-all duration-200">
                                        <div
                                            className="shrink-0 w-1 h-8 rounded-full"
                                            style={{ backgroundColor: appt.professional?.color || '#9CA3AF' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground text-sm truncate">
                                                {appt.client.firstName} {appt.client.lastName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{appt.service?.name ?? 'Sin servicio'}</p>
                                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                                                {formatDateTime(appt.startTime)}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={(e) => handleCancelAppointment(e, appt._id)}
                                                title="Cancelar turno"
                                                className="w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive-subtle hover:text-destructive hover:border-destructive transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiX size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleCompleteFromDashboard(appt)}
                                                title="Confirmar y completar"
                                                className="w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-ring-subtle hover:text-ring hover:border-ring transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiCheck size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Últimos movimientos — full width */}
            <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm hover:border-t-primary/60 transition-all duration-200">
                <h4 className="text-xl font-serif font-semibold text-foreground">Últimos movimientos</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Servicios recientemente registrados</p>
                {isDashboardLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse bg-muted/40 rounded-lg p-3">
                                <div className="w-2 h-2 bg-muted rounded-full shrink-0"></div>
                                <div className="space-y-1.5 flex-1"><div className="h-3 bg-muted rounded w-2/3"></div><div className="h-2 bg-muted rounded w-1/2"></div></div>
                                <div className="h-2.5 bg-muted rounded w-14 shrink-0"></div>
                            </div>
                        ))}
                    </div>
                ) : recientes?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay servicios recientes.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {recientes?.map((registro) => (
                            <div key={registro._id} className="flex items-center gap-3 bg-muted/30 hover:bg-muted/50 rounded-lg px-3 py-2.5 transition-colors group cursor-default">
                                <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary shrink-0 transition-colors"></span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground text-sm truncate">{registro.client.firstName} {registro.client.lastName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{registro.service.name}</p>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium tracking-wide shrink-0">{formatDate(registro.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <RegistroModal
                isOpen={isRegistroModalOpen}
                onClose={handleCloseRegistroModal}
                preselectedClientId={prefillClient}
                preselectedServiceId={prefillService}
                preselectedProfessionalId={prefillProfessional}
                preselectedServiceDate={prefillServiceDate}
                appointmentId={completedAppointmentId}
            />
            <ConfirmModal
                isOpen={confirmCancelId !== null}
                onClose={() => setConfirmCancelId(null)}
                onConfirm={() => { if (confirmCancelId) { cancelTouchup(confirmCancelId); setConfirmCancelId(null); } }}
                title="Cancelar retoque"
                message="¿Confirmás que querés cancelar este retoque?"
                confirmLabel="Cancelar retoque"
            />
        </div>
    );
}
