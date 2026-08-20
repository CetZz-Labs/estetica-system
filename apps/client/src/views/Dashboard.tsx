import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { FiScissors, FiCheck, FiX, FiAlertTriangle, FiTrash2, FiUser, FiClock, FiExternalLink, FiEdit2, FiPackage, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'sonner';

import { getDashboardStats, getUpcomingTouchups, getRecentRecords, updateServiceRecord, getServiceRecords } from '../api/serviceRecordApi';
import { getPendingRegistration, cancelAppointment, getUpcomingAppointments } from '../api/appointmentApi';
import { getProducts } from '../api/productApi';
import type { ServiceRecord, Appointment, Product, Paginated } from '../types';
import type { DashboardStats } from '../api/serviceRecordApi';
import { formatDate, getTimelineStatus, formatDateTime, getTodayDateString } from '../utils/dates';
import { handleApiError } from '../api/errorHandler';
import { useTopbar } from '../layouts/TopbarContext';
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

/** Umbral de stock bajo — mismo valor hardcodeado que Inventario.tsx (no existe un campo `minStock` en el modelo Product). */
const LOW_STOCK_THRESHOLD = 5;

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Tono visual Shear derivado del `dotColor` "legacy" que devuelve `getTimelineStatus`
 * (utils/dates.ts, fuera de alcance de este sub-lote). Mapeo local para no tocar ese archivo.
 */
const getTouchupTone = (legacyDotColor: string): { dot: string; badgeBg: string; badgeText: string } => {
    if (legacyDotColor === 'bg-destructive') return { dot: 'bg-alert-text', badgeBg: 'bg-alert-bg', badgeText: 'text-alert-text' };
    if (legacyDotColor === 'bg-warning') return { dot: 'bg-gold', badgeBg: 'bg-gold-bg', badgeText: 'text-gold-text' };
    if (legacyDotColor === 'bg-ring') return { dot: 'bg-sage', badgeBg: 'bg-sage-bg', badgeText: 'text-sage-text' };
    return { dot: 'bg-dotted', badgeBg: 'bg-surface-2', badgeText: 'text-muted' };
};

/**
 * Color de categoría de servicio (docs/design.md §4) a partir del nombre del servicio.
 * El modelo `Service` no persiste una categoría explícita — heurística por palabra clave,
 * documentada en impl_UX-33-B.md para que Turnos.tsx (UX-34) reutilice el mismo criterio.
 */
const getServiceCategoryDot = (serviceName?: string): string => {
    const name = (serviceName ?? '').toLowerCase();
    if (/color|tinte|pestañ|cejas|maquilla/.test(name)) return 'bg-accent-rose';
    if (/corte|peinad|facial|depila/.test(name)) return 'bg-sage';
    if (/uñ|mani|pedi/.test(name)) return 'bg-gold';
    return 'bg-dotted';
};

/** Lunes y domingo (YYYY-MM-DD) de la semana calendario actual, en horario local. */
const getCurrentWeekRange = (): { from: string; to: string } => {
    const now = new Date();
    const diffToMonday = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: toStr(monday), to: toStr(sunday) };
};

interface KpiCardProps {
    label: string;
    value: number;
    sublineText: string;
    tone: 'sage' | 'muted' | 'alert';
    isLoading: boolean;
}

function KpiCard({ label, value, sublineText, tone, isLoading }: KpiCardProps) {
    const toneClass = tone === 'alert' ? 'text-alert-text' : tone === 'sage' ? 'text-sage' : 'text-muted';

    if (isLoading) {
        return (
            <div className="bg-surface border border-border rounded-card p-6 animate-pulse space-y-3">
                <div className="h-3 bg-surface-2 rounded w-2/3" />
                <div className="h-9 bg-surface-2 rounded w-1/2" />
                <div className="h-3 bg-surface-2 rounded w-1/3" />
            </div>
        );
    }

    return (
        <div className="bg-surface border border-border rounded-card p-6">
            <p className="text-muted text-[11.5px] font-semibold uppercase tracking-wide mb-3">{label}</p>
            <p className="font-serif text-[34px] font-semibold text-text leading-none mb-2">{value}</p>
            <p className={`text-[12.5px] ${toneClass}`}>{sublineText}</p>
        </div>
    );
}

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

    const handleOpenNewVisit = () => {
        setCompletedAppointmentId(undefined);
        setPrefillClient(undefined);
        setPrefillService(undefined);
        setPrefillProfessional(undefined);
        setPrefillServiceDate(undefined);
        setIsRegistroModalOpen(true);
    };

    useTopbar({
        title: `${getGreeting()}${isLoaded && displayName ? `, ${displayName}` : ''}`,
        primaryAction: { label: '+ Nueva visita', onClick: handleOpenNewVisit },
    });

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

    // Reutiliza la misma queryKey ['products'] que Inventario.tsx (misma función de API,
    // sin lógica nueva) para que TanStack Query comparta caché entre ambas vistas.
    const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: getProducts,
    });

    const weekRange = getCurrentWeekRange();
    const { data: weekRecordsPage, isLoading: isLoadingWeek } = useQuery<Paginated<ServiceRecord>>({
        queryKey: ['service-records-week', weekRange.from, weekRange.to],
        queryFn: () => getServiceRecords({ page: 1, limit: 200, dateFrom: weekRange.from, dateTo: weekRange.to }),
    });

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

    // Desglose de retoques por urgencia — reutiliza el status "legacy" de utils/dates.ts
    // (fuera de alcance de este sub-lote) solo para clasificar, sin usar sus clases de color.
    const breakdown = (retoques ?? []).reduce(
        (acc, r) => {
            if (!r.nextTouchupDate) return acc;
            const status = getTimelineStatus(r.nextTouchupDate);
            if (status.dotColor === 'bg-destructive') acc.overdue++;
            else if (status.dotColor === 'bg-warning') acc.upcoming++;
            else acc.scheduled++;
            return acc;
        },
        { overdue: 0, upcoming: 0, scheduled: 0 }
    );
    const totalRetoques = retoques?.length ?? 0;
    const retoquesTone: KpiCardProps['tone'] = breakdown.overdue > 0 ? 'alert' : totalRetoques > 0 ? 'muted' : 'sage';
    const retoquesSubline = breakdown.overdue > 0
        ? `${breakdown.overdue} atrasado${breakdown.overdue !== 1 ? 's' : ''}`
        : totalRetoques > 0
            ? `${totalRetoques} programado${totalRetoques !== 1 ? 's' : ''}`
            : 'Sin retoques pendientes';

    const totalTurnos = proximosTurnos?.length ?? 0;
    const turnosTone: KpiCardProps['tone'] = (pendingRegistration?.length ?? 0) > 0 ? 'alert' : 'muted';
    const turnosSubline = (pendingRegistration?.length ?? 0) > 0
        ? `${pendingRegistration?.length} sin registrar`
        : totalTurnos > 0
            ? 'Agenda al día'
            : 'Sin turnos próximos';

    // Panel "Poco stock" (§7.7) — consume la misma función de API que Inventario.tsx.
    const lowStockProducts = (products ?? [])
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);

    // Bloque destacado wine (§7.5). No existe campo de precio en Service/ServiceRecord
    // (EP-19 "Reporte de ingresos estimados" sigue pending) — se usa la cantidad real de
    // servicios registrados esta semana en vez de inventar una cifra monetaria.
    const weekRecords = weekRecordsPage?.data ?? [];
    const totalThisWeek = weekRecordsPage?.meta.total ?? 0;
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    weekRecords.forEach((r) => {
        const jsDay = new Date(r.serviceDate).getUTCDay();
        dayCounts[(jsDay + 6) % 7] += 1;
    });
    const maxDayCount = Math.max(...dayCounts, 1);
    const todayIdx = (new Date().getDay() + 6) % 7;

    return (
        <div className="max-w-6xl mx-auto">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Retoques pendientes" value={totalRetoques} sublineText={retoquesSubline} tone={retoquesTone} isLoading={isDashboardLoading} />
                <KpiCard label="Clientes totales" value={stats?.totalClients ?? 0} sublineText="Directorio activo" tone="muted" isLoading={isLoadingStats} />
                <KpiCard label="Servicios realizados" value={stats?.servicesDone ?? 0} sublineText="Historial acumulado" tone="muted" isLoading={isLoadingStats} />
                <KpiCard label="Turnos próximos" value={totalTurnos} sublineText={turnosSubline} tone={turnosTone} isLoading={isDashboardLoading} />
            </div>

            {/* Alerta de turnos pendientes de registrar */}
            {!isDashboardLoading && pendingRegistration && pendingRegistration.length > 0 && (
                <div className="bg-alert-bg border border-alert-text/20 rounded-card p-5 mb-6 flex items-start gap-4">
                    <div className="p-2.5 bg-surface rounded-ctrl shrink-0">
                        <FiAlertTriangle className="text-xl text-alert-text" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-alert-text">Turnos pendientes de registrar</h4>
                        <p className="text-[12.5px] text-text-2 mt-1 mb-2">
                            {pendingRegistration.length} turno{pendingRegistration.length !== 1 ? 's' : ''} completado{pendingRegistration.length !== 1 ? 's' : ''} sin visita registrada.
                        </p>
                        <Link to="/turnos" className="inline-block text-xs font-semibold text-alert-text underline hover:opacity-80 transition-opacity">
                            Ir a la agenda
                        </Link>
                    </div>
                </div>
            )}

            {/* Turnos del día + panel lateral (poco stock / servicios de la semana) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-card p-6">
                    <div className="mb-2">
                        <h4 className="text-xl font-serif font-semibold text-text">Próximos turnos</h4>
                        <p className="text-[12.5px] text-muted mt-1">Los 7 más próximos · ordenados por fecha</p>
                    </div>
                    {isLoadingTurnos ? (
                        <div className="space-y-3 mt-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 py-3.5 border-b border-border-soft animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-surface-2 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 bg-surface-2 rounded w-1/3" />
                                        <div className="h-3 bg-surface-2 rounded w-1/2" />
                                    </div>
                                    <div className="h-5 bg-surface-2 rounded-pill w-20" />
                                </div>
                            ))}
                        </div>
                    ) : totalTurnos === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-muted">
                            <FiCheckCircle size={28} aria-hidden />
                            <p className="text-sm">No hay turnos próximos.</p>
                        </div>
                    ) : (
                        <div>
                            {proximosTurnos?.map((appt) => (
                                <div key={appt._id} className="flex items-center justify-between gap-3 py-3.5 border-b border-border-soft last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAppointmentDetail(appt)}
                                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${getServiceCategoryDot(appt.service?.name)}`} aria-hidden />
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-text text-sm truncate">
                                                {`${appt.client.firstName} ${appt.client.lastName ?? ''}`.trim()}
                                            </span>
                                            <span className="block text-[12.5px] text-text-3 truncate">
                                                {appt.service?.name ?? 'Sin servicio'}{appt.professional ? ` · ${appt.professional.name}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[12.5px] text-muted whitespace-nowrap hidden sm:inline">{formatDateTime(appt.startTime)}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleCancelAppointment(e, appt._id)}
                                            title="Cancelar turno"
                                            aria-label="Cancelar turno"
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-alert-bg hover:text-alert-text transition-colors cursor-pointer"
                                        >
                                            <FiX size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCompleteFromDashboard(appt)}
                                            title="Confirmar y completar"
                                            aria-label="Confirmar y completar"
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-sage-bg hover:text-sage transition-colors cursor-pointer"
                                        >
                                            <FiCheck size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {/* Poco stock */}
                    <div className="bg-surface border border-border rounded-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FiPackage className="text-alert-text" aria-hidden />
                                <h4 className="text-xl font-serif font-semibold text-text">Poco stock</h4>
                            </div>
                            <Link to="/inventario" className="text-[13px] font-semibold text-accent hover:opacity-80 transition-opacity">
                                Productos →
                            </Link>
                        </div>
                        {isLoadingProducts ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-3.5 bg-surface-2 rounded w-2/3" />
                                        <div className="h-1 bg-surface-2 rounded-full w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : lowStockProducts.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-6 text-sage text-center">
                                <FiCheckCircle size={24} aria-hidden />
                                <p className="text-sm">Todo el stock está en niveles saludables.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {lowStockProducts.map((product) => {
                                    const pct = Math.min(100, (product.stock / LOW_STOCK_THRESHOLD) * 100);
                                    return (
                                        <div key={product._id}>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="font-semibold text-text text-sm truncate">{product.name}</span>
                                                <span className="text-sm font-semibold text-alert-text shrink-0">{product.stock} u.</span>
                                            </div>
                                            <p className="text-muted text-[12px] mb-2">Mínimo sugerido: {LOW_STOCK_THRESHOLD} u.</p>
                                            <div className="h-1 rounded-full bg-dotted overflow-hidden">
                                                <div className="h-full rounded-full bg-alert-text" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Bloque destacado — único fondo wine sólido de la vista (docs/design.md §7.5) */}
                    <div className="bg-wine rounded-card p-6">
                        <p className="text-[11.5px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-accent-tint)' }}>
                            Servicios de la semana
                        </p>
                        {isLoadingWeek ? (
                            <div className="h-9 bg-white/10 rounded w-1/2 mt-2 animate-pulse" />
                        ) : (
                            <p className="font-serif text-white text-[34px] font-semibold leading-none mt-2 mb-2">{totalThisWeek}</p>
                        )}
                        <p className="text-[12.5px]" style={{ color: 'var(--color-accent-tint)' }}>
                            {totalThisWeek} servicio{totalThisWeek !== 1 ? 's' : ''} registrado{totalThisWeek !== 1 ? 's' : ''} esta semana
                        </p>
                        <div className="flex items-end gap-2 mt-5" style={{ height: '56px' }}>
                            {DAY_LABELS.map((label, idx) => {
                                const heightPct = Math.max(10, (dayCounts[idx] / maxDayCount) * 100);
                                const isToday = idx === todayIdx;
                                return (
                                    <div key={label} className="flex-1 h-full flex flex-col justify-end">
                                        <div
                                            className="w-full rounded-t-sm"
                                            style={{
                                                height: `${heightPct}%`,
                                                backgroundColor: isToday ? 'var(--color-accent-tint)' : 'rgba(227,185,198,.45)',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 mt-1.5">
                            {DAY_LABELS.map((label) => (
                                <span key={label} className="flex-1 text-center text-[10px] uppercase tracking-wide" style={{ color: 'rgba(227,185,198,.7)' }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Próximos retoques */}
            <div className="bg-surface border border-border rounded-card p-6 mb-6">
                <div className="mb-2">
                    <h4 className="text-xl font-serif font-semibold text-text">Próximos retoques</h4>
                    <p className="text-[12.5px] text-muted mt-1">Los 7 más próximos · ordenados por fecha</p>
                </div>
                {isLoadingRetoques ? (
                    <div className="space-y-3 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 py-3.5 border-b border-border-soft animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-surface-2 shrink-0" />
                                <div className="w-10 h-10 rounded-full bg-surface-2 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 bg-surface-2 rounded w-1/3" />
                                    <div className="h-3 bg-surface-2 rounded w-1/2" />
                                </div>
                                <div className="h-5 bg-surface-2 rounded-pill w-20" />
                            </div>
                        ))}
                    </div>
                ) : totalRetoques === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-muted">
                        <FiCheckCircle size={28} aria-hidden />
                        <p className="text-sm">No hay retoques pendientes.</p>
                    </div>
                ) : (
                    <div>
                        {retoques?.map((registro) => {
                            if (!registro.nextTouchupDate) return null;
                            const status = getTimelineStatus(registro.nextTouchupDate);
                            const tone = getTouchupTone(status.dotColor);
                            const initials = registro.client.firstName.charAt(0).toUpperCase();
                            return (
                                <div key={registro._id} className="flex items-center justify-between gap-3 py-3.5 border-b border-border-soft last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => openRetoqueDetail(registro)}
                                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} aria-hidden />
                                        <span className="w-10 h-10 shrink-0 rounded-full bg-rose-bg flex items-center justify-center font-serif text-base text-wine">
                                            {initials}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-text text-sm truncate">
                                                {`${registro.client.firstName} ${registro.client.lastName ?? ''}`.trim()}
                                            </span>
                                            <span className="block text-[12.5px] text-text-3 truncate">{registro.service.name}</span>
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2.5 py-1 rounded-pill text-[11.5px] font-semibold whitespace-nowrap ${tone.badgeBg} ${tone.badgeText}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-[11.5px] text-muted whitespace-nowrap hidden sm:inline">{formatDate(registro.nextTouchupDate)}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleCancelTouchup(e, registro._id)}
                                            title="Cancelar este retoque"
                                            aria-label="Cancelar este retoque"
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-alert-bg hover:text-alert-text transition-colors cursor-pointer"
                                        >
                                            <FiX size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleTouchupCheck(registro.client._id, registro.service._id); }}
                                            title="Registrar visita de retoque"
                                            aria-label="Registrar visita de retoque"
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-sage-bg hover:text-sage transition-colors cursor-pointer"
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

            {/* Últimos movimientos */}
            <div className="bg-surface border border-border rounded-card p-6">
                <h4 className="text-xl font-serif font-semibold text-text">Últimos movimientos</h4>
                <p className="text-[12.5px] text-muted mt-1 mb-5">Servicios recientemente registrados</p>
                {isLoadingRecientes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse bg-surface-2 rounded-ctrl p-3">
                                <div className="w-2 h-2 bg-dotted rounded-full shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-3 bg-dotted rounded w-2/3" />
                                    <div className="h-2 bg-dotted rounded w-1/2" />
                                </div>
                                <div className="h-2.5 bg-dotted rounded w-14 shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : recientes?.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted">
                        <FiCheckCircle size={26} aria-hidden />
                        <p className="text-sm">No hay servicios recientes.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {recientes?.map((registro) => (
                            <div key={registro._id} className="flex items-center gap-3 bg-surface-2 rounded-ctrl px-3 py-2.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${getServiceCategoryDot(registro.service.name)}`} aria-hidden />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-text text-sm truncate">{`${registro.client.firstName} ${registro.client.lastName ?? ''}`.trim()}</p>
                                    <p className="text-[12.5px] text-text-3 truncate">{registro.service.name}</p>
                                </div>
                                <span className="text-[11px] text-muted font-medium tracking-wide shrink-0">{formatDate(registro.createdAt)}</span>
                            </div>
                        ))}
                    </div>
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
                            type="button"
                            onClick={() => { setConfirmCancelId(selectedRetoqueDetail._id); closeRetoqueDetail(); }}
                            aria-label="Cancelar retoque"
                            title="Cancelar retoque"
                            className="p-2 text-muted hover:text-alert-text transition-colors cursor-pointer"
                        >
                            <FiTrash2 className="text-lg" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTouchupCheck(selectedRetoqueDetail.client._id, selectedRetoqueDetail.service._id)}
                            className="bg-accent hover:opacity-90 text-white px-5 py-2.5 rounded-ctrl text-sm font-medium flex items-center gap-1.5 transition-opacity cursor-pointer"
                        >
                            <FiCheck /> Registrar Visita
                        </button>
                    </>
                )}
            >
                {selectedRetoqueDetail && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                            <div className="p-2 bg-surface rounded-full border border-border text-muted">
                                <FiUser className="text-lg" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-text">{`${selectedRetoqueDetail.client.firstName} ${selectedRetoqueDetail.client.lastName ?? ''}`.trim()}</p>
                                {selectedRetoqueDetail.client.phone && (
                                    <p className="text-xs text-muted mt-0.5">{selectedRetoqueDetail.client.phone}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                            <div className="p-2 bg-surface rounded-full border border-border text-muted">
                                <FiScissors className="text-lg" />
                            </div>
                            <p className="text-sm font-semibold text-text">{selectedRetoqueDetail.service.name}</p>
                        </div>

                        {selectedRetoqueDetail.professional && (
                            <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                                <div className="p-2 bg-surface rounded-full border border-border text-muted">
                                    <FiUser className="text-lg" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full border border-border shrink-0" style={{ backgroundColor: selectedRetoqueDetail.professional.color }} aria-hidden />
                                    <p className="text-sm font-semibold text-text">{selectedRetoqueDetail.professional.name}</p>
                                </div>
                            </div>
                        )}

                        {selectedRetoqueDetail.nextTouchupDate && (
                            <div className="flex items-start gap-3 p-3 bg-bg rounded-ctrl border border-border">
                                <div className="p-2 bg-surface rounded-full border border-border text-muted shrink-0">
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
                                                    className="px-2.5 py-1.5 bg-surface border border-border rounded-ctrl text-sm text-text"
                                                />
                                                <input
                                                    type="time"
                                                    value={touchupTimeInput}
                                                    onChange={(e) => setTouchupTimeInput(e.target.value)}
                                                    aria-label="Hora del próximo retoque"
                                                    className="px-2.5 py-1.5 bg-surface border border-border rounded-ctrl text-sm text-text"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveTouchupDate}
                                                    disabled={!touchupDateInput || !touchupTimeInput || isSavingTouchupDate}
                                                    className="px-3 py-1.5 bg-accent hover:opacity-90 text-white rounded-ctrl text-xs font-medium flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <FiCheck size={14} /> Guardar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEditTouchupDate}
                                                    disabled={isSavingTouchupDate}
                                                    className="px-3 py-1.5 text-muted hover:text-text rounded-ctrl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-semibold text-text">Retoque: {formatDate(selectedRetoqueDetail.nextTouchupDate)}</p>
                                    )}
                                    <p className="text-xs text-muted mt-1">Visita original: {formatDate(selectedRetoqueDetail.serviceDate)}</p>
                                </div>
                                {!isEditingTouchupDate && (
                                    <button
                                        type="button"
                                        onClick={handleStartEditTouchupDate}
                                        aria-label="Editar fecha de retoque"
                                        title="Editar fecha de retoque"
                                        className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer shrink-0"
                                    >
                                        <FiEdit2 className="text-lg" />
                                    </button>
                                )}
                            </div>
                        )}

                        {selectedRetoqueDetail.productsUsed && selectedRetoqueDetail.productsUsed.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold tracking-widest text-muted uppercase mb-2">Productos utilizados</h4>
                                <ul className="space-y-1.5">
                                    {selectedRetoqueDetail.productsUsed.map((pu, idx) => {
                                        const productName = typeof pu.product === 'object' ? pu.product.name : 'Producto';
                                        return (
                                            <li key={idx} className="flex justify-between items-center text-sm bg-surface-2 border border-border-soft rounded-ctrl px-3 py-2">
                                                <span className="text-text">{productName}</span>
                                                <span className="text-muted font-medium">x{pu.quantity}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {selectedRetoqueDetail.notes && (
                            <div>
                                <h4 className="text-xs font-bold tracking-widest text-muted uppercase mb-2">Notas</h4>
                                <p className="text-sm text-text-2 bg-surface-2 p-3 rounded-ctrl border border-border-soft">{selectedRetoqueDetail.notes}</p>
                            </div>
                        )}

                        <Link
                            to={`/clientes/${selectedRetoqueDetail.client._id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
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
