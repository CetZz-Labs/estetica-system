import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { FiUsers, FiScissors, FiCalendar, FiPlus, FiCheck, FiX, FiAlertTriangle, FiTrash2, FiUser, FiClock, FiExternalLink, FiEdit2 } from 'react-icons/fi';
import { toast } from 'sonner';

import { getDashboardStats, getUpcomingTouchups, getRecentRecords, updateServiceRecord } from '../api/serviceRecordApi';
import { getPendingRegistration, cancelAppointment, getUpcomingAppointments } from '../api/appointmentApi';
import type { ServiceRecord, Appointment } from '../types';
import type { DashboardStats } from '../api/serviceRecordApi';
import { formatDate, getTimelineStatus, formatDateTime, getTodayDateString } from '../utils/dates';
import { handleApiError } from '../api/errorHandler';
import RegistroModal from '../components/RegistroModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import AppointmentDetail, { AppointmentDetailFooter } from '../components/AppointmentDetail';
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
    const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<Appointment | null>(null);
    const [selectedRetoqueDetail, setSelectedRetoqueDetail] = useState<ServiceRecord | null>(null);
    const [isEditingTouchupDate, setIsEditingTouchupDate] = useState(false);
    const [touchupDateInput, setTouchupDateInput] = useState('');
    const [touchupTimeInput, setTouchupTimeInput] = useState('');
    const originalTouchupIsoRef = useRef('');

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
        setSelectedRetoqueDetail(null);
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

    const openRetoqueDetail = (registro: ServiceRecord) => {
        setSelectedRetoqueDetail(registro);
        setIsEditingTouchupDate(false);
    };

    const closeRetoqueDetail = () => {
        setSelectedRetoqueDetail(null);
        setIsEditingTouchupDate(false);
    };

    const { mutate: saveTouchupDate, isPending: isSavingTouchupDate } = useMutation({
        mutationFn: (vars: { id: string; nextTouchupDate: string }) =>
            updateServiceRecord(vars.id, { nextTouchupDate: vars.nextTouchupDate }),
        onSuccess: (_updatedRecord, variables) => {
            toast.success('Fecha de retoque actualizada');
            setSelectedRetoqueDetail((prev) => (prev ? { ...prev, nextTouchupDate: variables.nextTouchupDate } : prev));
            setIsEditingTouchupDate(false);
            queryClient.invalidateQueries({ queryKey: ['upcoming-touchups'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        },
        onError: (error) => handleApiError(error, 'Error al actualizar la fecha de retoque')
    });

    const handleStartEditTouchupDate = () => {
        if (!selectedRetoqueDetail?.nextTouchupDate) return;
        const current = new Date(selectedRetoqueDetail.nextTouchupDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        setTouchupDateInput(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`);
        setTouchupTimeInput(`${pad(current.getHours())}:${pad(current.getMinutes())}`);
        originalTouchupIsoRef.current = selectedRetoqueDetail.nextTouchupDate;
        setIsEditingTouchupDate(true);
    };

    const handleCancelEditTouchupDate = () => {
        setIsEditingTouchupDate(false);
    };

    const handleSaveTouchupDate = () => {
        if (!selectedRetoqueDetail || !touchupDateInput || !touchupTimeInput) return;
        const newIso = new Date(`${touchupDateInput}T${touchupTimeInput}`).toISOString();
        // Evita reenviar un valor sin cambios: si el retoque ya está atrasado, el backend
        // rechazaría el mismo valor con 400 (UX-27) aunque el usuario no haya modificado nada.
        if (newIso === originalTouchupIsoRef.current) {
            setIsEditingTouchupDate(false);
            return;
        }
        saveTouchupDate({ id: selectedRetoqueDetail._id, nextTouchupDate: newIso });
    };

    const { mutate: cancelAppointmentMutate } = useMutation({
        mutationFn: (id: string) => cancelAppointment(id),
        onSuccess: () => {
            toast.success('Turno cancelado');
            queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
        },
        onError: (error) => handleApiError(error, 'Error al cancelar el turno')
    });

    const confirmCancelAppointment = (id: string) => {
        toast('¿Cancelar este turno?', {
            action: { label: 'Confirmar', onClick: () => cancelAppointmentMutate(id) },
            cancel: { label: 'No', onClick: () => {} },
            duration: 5000
        });
    };

    const handleCancelAppointment = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        confirmCancelAppointment(id);
    };

    const handleCompleteFromDashboard = (appt: Appointment) => {
        setSelectedAppointmentDetail(null);
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

            {/* Columns - Retoques | Turnos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Timeline - Próximos retoques */}
                <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                        <div><h4 className="text-xl font-serif">Próximos retoques</h4><p className="text-sm text-gray-400 mt-1">Los 7 más próximos · ordenados por fecha</p></div>
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
                                    <div key={registro._id} className="relative ml-6 group">
                                        <div className={`absolute -left-11.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ${status.dotColor} ring-4 ring-white`}></div>
                                        <button
                                            type="button"
                                            onClick={() => openRetoqueDetail(registro)}
                                            className="w-full flex justify-between items-center bg-white border border-maison-border rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors text-left cursor-pointer"
                                        >
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
                                        </button>
                                        <div className="absolute -right-3 -top-3 flex gap-1 opacity-100 transition-all">
                                            <button
                                                onClick={(e) => handleCancelTouchup(e, registro._id)}
                                                title="Cancelar este retoque"
                                                className="w-8 h-8 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center text-gray-400 hover:text-maison-red hover:border-maison-red transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiX size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTouchupCheck(registro.client._id, registro.service._id); }}
                                                title="Registrar visita de retoque"
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

                {/* Próximos Turnos */}
                <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-xl font-serif">Próximos turnos</h4>
                            <p className="text-sm text-gray-400 mt-1">Los 7 más próximos · ordenados por fecha</p>
                        </div>
                    </div>
                    {isDashboardLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse p-3 border border-maison-border rounded-xl">
                                    <div className="w-3 h-3 bg-gray-200 rounded-full mt-1.5 shrink-0"></div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                        <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : proximosTurnos?.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4">No hay turnos próximos.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {proximosTurnos?.map(appt => {
                                return (
                                    <div key={appt._id} className="flex items-center gap-3 p-3 bg-white border border-maison-border rounded-xl hover:border-gray-300 transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedAppointmentDetail(appt)}
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                                        >
                                            <div
                                                className="shrink-0 w-3 h-3 rounded-full border border-maison-border"
                                                style={{ backgroundColor: appt.professional?.color || '#9CA3AF' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-maison-text text-sm truncate">
                                                    {appt.client.firstName} {appt.client.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{appt.service?.name ?? 'Sin servicio'}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {formatDateTime(appt.startTime)}
                                                </p>
                                            </div>
                                        </button>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={(e) => handleCancelAppointment(e, appt._id)}
                                                title="Cancelar turno"
                                                className="w-8 h-8 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center text-gray-400 hover:text-maison-red hover:border-maison-red transition-all cursor-pointer shadow-sm"
                                            >
                                                <FiX size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleCompleteFromDashboard(appt)}
                                                title="Confirmar y completar"
                                                className="w-8 h-8 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center text-gray-400 hover:text-maison-green hover:border-maison-green transition-all cursor-pointer shadow-sm"
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
            <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm">
                <h4 className="text-xl font-serif">Últimos movimientos</h4>
                <p className="text-sm text-gray-400 mt-1 mb-8">Servicios recientemente registrados</p>
                {isDashboardLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
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
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5 pl-1">
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

            <Modal
                isOpen={selectedAppointmentDetail !== null}
                onClose={() => setSelectedAppointmentDetail(null)}
                title="Detalle del Turno"
                maxWidth="max-w-lg"
                footer={selectedAppointmentDetail && (
                    <AppointmentDetailFooter
                        appointment={selectedAppointmentDetail}
                        onCancel={() => { confirmCancelAppointment(selectedAppointmentDetail._id); setSelectedAppointmentDetail(null); }}
                        onComplete={() => handleCompleteFromDashboard(selectedAppointmentDetail)}
                    />
                )}
            >
                {selectedAppointmentDetail && <AppointmentDetail appointment={selectedAppointmentDetail} />}
            </Modal>

            <Modal
                isOpen={selectedRetoqueDetail !== null}
                onClose={closeRetoqueDetail}
                title="Detalle del Retoque"
                maxWidth="max-w-lg"
                footer={selectedRetoqueDetail && selectedRetoqueDetail.touchupStatus === 'pending' && (
                    <>
                        <button
                            onClick={() => { setConfirmCancelId(selectedRetoqueDetail._id); closeRetoqueDetail(); }}
                            aria-label="Cancelar retoque"
                            title="Cancelar retoque"
                            className="p-2 text-gray-400 hover:text-maison-red transition-colors cursor-pointer"
                        >
                            <FiTrash2 className="text-lg" />
                        </button>
                        <button
                            onClick={() => handleTouchupCheck(selectedRetoqueDetail.client._id, selectedRetoqueDetail.service._id)}
                            className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <FiCheck /> Registrar Visita
                        </button>
                    </>
                )}
            >
                {selectedRetoqueDetail && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                            <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                                <FiUser className="text-lg" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-maison-text">{selectedRetoqueDetail.client.firstName} {selectedRetoqueDetail.client.lastName}</p>
                                {selectedRetoqueDetail.client.phone && (
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedRetoqueDetail.client.phone}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                            <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                                <FiScissors className="text-lg" />
                            </div>
                            <p className="text-sm font-medium text-maison-text">{selectedRetoqueDetail.service.name}</p>
                        </div>

                        {selectedRetoqueDetail.professional && (
                            <div className="flex items-center gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                                <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500">
                                    <FiUser className="text-lg" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full border border-maison-border shrink-0" style={{ backgroundColor: selectedRetoqueDetail.professional.color }} aria-hidden />
                                    <p className="text-sm font-medium text-maison-text">{selectedRetoqueDetail.professional.name}</p>
                                </div>
                            </div>
                        )}

                        {selectedRetoqueDetail.nextTouchupDate && (
                            <div className="flex items-start gap-3 p-3 bg-maison-bg rounded-xl border border-maison-border">
                                <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500 shrink-0">
                                    <FiClock className="text-lg" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditingTouchupDate ? (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                                <input
                                                    type="date"
                                                    min={getTodayDateString()}
                                                    value={touchupDateInput}
                                                    onChange={(e) => setTouchupDateInput(e.target.value)}
                                                    aria-label="Fecha del próximo retoque"
                                                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                                                />
                                                <input
                                                    type="time"
                                                    value={touchupTimeInput}
                                                    onChange={(e) => setTouchupTimeInput(e.target.value)}
                                                    aria-label="Hora del próximo retoque"
                                                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveTouchupDate}
                                                    disabled={!touchupDateInput || !touchupTimeInput || isSavingTouchupDate}
                                                    className="px-3 py-1.5 bg-maison-primary hover:bg-black text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <FiCheck size={14} /> Guardar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEditTouchupDate}
                                                    disabled={isSavingTouchupDate}
                                                    className="px-3 py-1.5 text-gray-500 hover:text-maison-text rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-maison-text">Retoque: {formatDate(selectedRetoqueDetail.nextTouchupDate)}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">Visita original: {formatDate(selectedRetoqueDetail.serviceDate)}</p>
                                </div>
                                {!isEditingTouchupDate && (
                                    <button
                                        type="button"
                                        onClick={handleStartEditTouchupDate}
                                        aria-label="Editar fecha de retoque"
                                        title="Editar fecha de retoque"
                                        className="p-1.5 text-gray-400 hover:text-maison-primary transition-colors cursor-pointer shrink-0"
                                    >
                                        <FiEdit2 className="text-lg" />
                                    </button>
                                )}
                            </div>
                        )}

                        {selectedRetoqueDetail.productsUsed && selectedRetoqueDetail.productsUsed.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Productos utilizados</h4>
                                <ul className="space-y-1.5">
                                    {selectedRetoqueDetail.productsUsed.map((pu, idx) => {
                                        const productName = typeof pu.product === 'object' ? pu.product.name : 'Producto';
                                        return (
                                            <li key={idx} className="flex justify-between items-center text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                                <span className="text-maison-text">{productName}</span>
                                                <span className="text-gray-500 font-medium">x{pu.quantity}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {selectedRetoqueDetail.notes && (
                            <div>
                                <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Notas</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">{selectedRetoqueDetail.notes}</p>
                            </div>
                        )}

                        <Link
                            to={`/clientes/${selectedRetoqueDetail.client._id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-maison-primary hover:underline"
                        >
                            <FiExternalLink /> Ir a ficha del cliente
                        </Link>
                    </div>
                )}
            </Modal>

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