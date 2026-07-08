import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { FiPlus, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import FullCalendar from '@fullcalendar/react';
import type { DatesSetArg, EventClickArg, EventDropArg, EventMountArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import { getAppointments, createAppointment, updateAppointment, cancelAppointment } from '../api/appointmentApi';
import type { AppointmentFormData as AppointmentApiPayload } from '../api/appointmentApi';
import { getClients } from '../api/clientApi';
import { getServices } from '../api/serviceApi';
import { getProfessionals } from '../api/professionalApi';
import { getDisponibilidad } from '../api/disponibilidadApi';
import type { BusinessHours } from '../api/disponibilidadApi';

import { handleApiError } from '../api/errorHandler';
import type { AxiosError } from 'axios';
import type { Appointment, Client, Service, Professional } from '../types';
import Modal from '../components/ui/Modal';
import RegistroModal from '../components/RegistroModal';
import AppointmentDetail, { AppointmentDetailFooter } from '../components/AppointmentDetail';
import { getStatusPalette, getStatusIcon, getRenderStatus } from '../utils/appointmentStatus';
import { getAvailableSlots, getLocalDayRangeISO } from '../utils/timeSlots';
import { getContrastTextColor } from '../utils/contrastColor';
import { formatTime } from '../utils/dates';

const selectStyles: StylesConfig<{ value: string; label: string; }, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#FDFBF7',
        borderColor: state.isFocused ? '#E5E7EB' : '#E5E7EB',
        borderRadius: '0.75rem',
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 2px #E5E7EB' : 'none',
        '&:hover': { borderColor: '#D1D5DB' }
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#111827' : state.isFocused ? '#F3F4F6' : 'white',
        color: state.isSelected ? 'white' : '#374151',
        cursor: 'pointer'
    })
};

function getTodayDateString(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function getProfessionalInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
}

interface AppointmentFormValues {
    client: string;
    service?: string;
    professional?: string;
    date: string;
    time: string;
    notes?: string;
}

export default function Turnos() {
    const queryClient = useQueryClient();

    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [professionalFilter, setProfessionalFilter] = useState('');
    const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
    const [completedAppointmentId, setCompletedAppointmentId] = useState<string | undefined>(undefined);
    const [prefillClient, setPrefillClient] = useState<string | undefined>(undefined);
    const [prefillService, setPrefillService] = useState<string | undefined>(undefined);
    const [prefillProfessional, setPrefillProfessional] = useState<string | undefined>(undefined);
    const [prefillServiceDate, setPrefillServiceDate] = useState<string | undefined>(undefined);
    const originalStartTimeRef = useRef<string>('');

    const { data: appointments, isLoading, isError, isFetching } = useQuery<Appointment[]>({
        queryKey: ['appointments', dateRange.start, dateRange.end, professionalFilter],
        queryFn: () => getAppointments({
            startDate: dateRange.start,
            endDate: dateRange.end,
            ...(professionalFilter ? { professional: professionalFilter } : {})
        }),
        enabled: !!dateRange.start && !!dateRange.end,
        placeholderData: keepPreviousData,
    });

    const { data: clientsData } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: getClients,
    });

    const { data: servicesData } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: getServices,
    });

    const { data: professionalsData } = useQuery<Professional[]>({
        queryKey: ['professionals', 'active'],
        queryFn: () => getProfessionals(),
    });

    const { data: businessHoursData } = useQuery<BusinessHours>({
        queryKey: ['business-hours'],
        queryFn: getDisponibilidad,
    });

    const { mutate: createMutate, isPending: isCreating } = useMutation({
        mutationFn: (data: AppointmentApiPayload) => createAppointment(data),
        onSuccess: () => {
            toast.success('Turno creado exitosamente', {
                style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
            });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setIsFormModalOpen(false);
        },
        onError: (error) => {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 409) {
                toast.error('El horario se superpone con otro turno del mismo profesional.');
                return;
            }
            handleApiError(error, 'Error al crear el turno');
        }
    });

    const { mutate: updateMutate, isPending: isUpdating } = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AppointmentApiPayload> }) => updateAppointment(id, data),
        onSuccess: () => {
            toast.success('Turno actualizado');
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setIsFormModalOpen(false);
            setEditingAppointment(null);
        },
        onError: (error) => {
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 409) {
                toast.error('El horario se superpone con otro turno.');
                return;
            }
            handleApiError(error, 'Error al actualizar el turno');
        }
    });

    const { mutate: cancelMutate, isPending: isCancelling } = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelAppointment(id, reason),
        onSuccess: () => {
            toast.success('Turno cancelado');
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setIsCancelModalOpen(false);
            setIsDetailModalOpen(false);
            setCancelReason('');
        },
        onError: (error) => handleApiError(error, 'Error al cancelar el turno')
    });

    const events = useMemo(() => {
        return (appointments || []).map(a => {
            const palette = getStatusPalette(getRenderStatus(a));
            const professionalColor = a.professional && typeof a.professional === 'object' ? a.professional.color : undefined;
            return {
                id: `appt-${a._id}`,
                title: a.service
                    ? `${a.client.firstName} ${a.client.lastName} - ${a.service.name}`
                    : `${a.client.firstName} ${a.client.lastName}`,
                start: a.startTime,
                end: a.endTime,
                extendedProps: { appointment: a, type: 'appointment' as const, professionalColor },
                backgroundColor: professionalColor || palette.bg,
                borderColor: professionalColor || palette.border,
                textColor: professionalColor ? getContrastTextColor(professionalColor) : palette.text,
                classNames: ['appointment-event', a.status === 'cancelled' ? 'cancelled' : ''].filter(Boolean),
            };
        });
    }, [appointments]);

    const clientOptions = useMemo(() => (clientsData || []).map(c => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })), [clientsData]);
    const serviceOptions = useMemo(() => (servicesData || []).map(s => ({ value: s._id, label: `${s.name} (${s.duration} min)` })), [servicesData]);
    const professionalOptions = useMemo(() => (professionalsData || []).map(p => ({ value: p._id, label: p.name })), [professionalsData]);

    const calendarBusinessHours = useMemo(() => {
        if (!businessHoursData?.schedule?.length) return true;
        return businessHoursData.schedule
            .filter((d) => d.isOpen)
            .map((d) => ({
                daysOfWeek: [d.day],
                startTime: d.openTime,
                endTime: d.closeTime,
            }));
    }, [businessHoursData]);

    const professionals = professionalsData || [];

    const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm<AppointmentFormValues>();

    const watchedDate = watch('date');
    const watchedTime = watch('time');
    const watchedProfessional = watch('professional');

    const { data: dayAppointments } = useQuery<Appointment[]>({
        queryKey: ['appointments', 'day', watchedDate, watchedProfessional],
        queryFn: () => {
            const { start, end } = getLocalDayRangeISO(watchedDate);
            return getAppointments({
                startDate: start,
                endDate: end,
                ...(watchedProfessional ? { professional: watchedProfessional } : {}),
            });
        },
        enabled: isFormModalOpen && !!watchedDate,
        placeholderData: keepPreviousData,
    });

    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setDateRange({ start: arg.start.toISOString(), end: arg.end.toISOString() });
    }, []);

    const handleDateClick = useCallback((clickInfo: DateClickArg) => {
        setEditingAppointment(null);
        const dateStr = clickInfo.dateStr.slice(0, 10);
        let timeStr: string;
        if (clickInfo.dateStr.includes('T')) {
            timeStr = clickInfo.dateStr.slice(11, 16);
        } else {
            const now = new Date();
            timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        originalStartTimeRef.current = '';
        reset({
            client: '',
            service: '',
            professional: '',
            date: dateStr,
            time: timeStr,
            notes: ''
        });
        setIsFormModalOpen(true);
    }, [reset]);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const appointment = clickInfo.event.extendedProps.appointment as Appointment;
        setSelectedAppointment(appointment);
        setIsDetailModalOpen(true);
    }, []);

    const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
        const appointment = dropInfo.event.extendedProps.appointment as Appointment;
        const newStart = dropInfo.event.start;
        if (!newStart) return;

        updateMutate({ id: appointment._id, data: { startTime: newStart.toISOString() } });
    }, [updateMutate]);

    const handleEventDidMount = useCallback((info: EventMountArg) => {
        const appointment = info.event.extendedProps.appointment as Appointment;
        const timeStr = formatTime(appointment.startTime);
        const serviceLabel = appointment.service?.name || 'Sin servicio';
        info.el.setAttribute('data-tooltip-id', 'appointment-tooltip');
        info.el.setAttribute('data-tooltip-content', `${appointment.client.firstName} ${appointment.client.lastName} · ${serviceLabel} · ${timeStr}`);
    }, []);

    const onSubmit = (data: AppointmentFormValues) => {
        const combinedStartTime = `${data.date}T${data.time}`;
        const startTimeUnchanged = editingAppointment
            && originalStartTimeRef.current !== ''
            && combinedStartTime === originalStartTimeRef.current;

        const payload: Partial<AppointmentApiPayload> & { client: string } = {
            client: data.client,
            notes: data.notes,
            ...(startTimeUnchanged ? {} : { startTime: new Date(combinedStartTime).toISOString() }),
            ...(data.service ? { service: data.service } : {}),
            ...(data.professional ? { professional: data.professional } : {}),
        };

        if (editingAppointment) {
            updateMutate({ id: editingAppointment._id, data: payload });
        } else {
            createMutate(payload as AppointmentApiPayload);
        }
    };

    const openEditModal = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        const d = new Date(appointment.startTime);
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        originalStartTimeRef.current = `${dateStr}T${timeStr}`;
        reset({
            client: appointment.client._id,
            service: appointment.service?._id || '',
            professional: appointment.professional?._id || '',
            date: dateStr,
            time: timeStr,
            notes: appointment.notes || ''
        });
        setIsDetailModalOpen(false);
        setIsFormModalOpen(true);
    };

    const openCancelModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setCancelReason('');
        setIsDetailModalOpen(false);
        setIsCancelModalOpen(true);
    };

    const handleCompleteAppointment = (appointment: Appointment) => {
        setCompletedAppointmentId(appointment._id);
        setPrefillClient(appointment.client._id);
        setPrefillService(appointment.service?._id);
        setPrefillProfessional(appointment.professional?._id);
        setPrefillServiceDate(new Date(appointment.startTime).toISOString().split('T')[0]);
        setIsDetailModalOpen(false);
        setIsRegistroModalOpen(true);
    };

    const handleRegistroModalClose = () => {
        setIsRegistroModalOpen(false);
        setCompletedAppointmentId(undefined);
        setPrefillClient(undefined);
        setPrefillService(undefined);
        setPrefillProfessional(undefined);
        setPrefillServiceDate(undefined);
    };

    const handleConfirmCancel = () => {
        if (!selectedAppointment) return;
        cancelMutate({ id: selectedAppointment._id, reason: cancelReason || undefined });
    };

    const formFooter = (
        <>
            <button type="button" onClick={() => { setIsFormModalOpen(false); setEditingAppointment(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                Cancelar
            </button>
            <button form="appointmentForm" type="submit" disabled={isCreating || isUpdating}
                className="bg-maison-primary hover:bg-black disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                {isCreating || isUpdating ? 'Guardando...' : (editingAppointment ? 'Actualizar Turno' : 'Crear Turno')}
            </button>
        </>
    );

    const detailFooter = selectedAppointment && (
        <AppointmentDetailFooter
            appointment={selectedAppointment}
            onCancel={() => openCancelModal(selectedAppointment)}
            onEdit={() => openEditModal(selectedAppointment)}
            onComplete={() => handleCompleteAppointment(selectedAppointment)}
        />
    );

    const cancelFooter = (
        <>
            <button type="button" onClick={() => setIsCancelModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                Volver
            </button>
            <button onClick={handleConfirmCancel} disabled={isCancelling}
                className="bg-maison-red hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
        </>
    );

    const selectedServiceId = watch('service');
    const selectedService = (servicesData || []).find(s => s._id === selectedServiceId);
    const selectedDurationMin = selectedService?.duration ?? 60;

    const availableSlots = useMemo(() => {
        if (!watchedDate) return [];
        return getAvailableSlots({
            dateStr: watchedDate,
            professionalId: watchedProfessional || undefined,
            durationMin: selectedDurationMin,
            businessHours: businessHoursData,
            dayAppointments,
            excludeAppointmentId: editingAppointment?._id,
        });
    }, [watchedDate, watchedProfessional, selectedDurationMin, businessHoursData, dayAppointments, editingAppointment]);

    const timeOptions = useMemo(() => {
        const slots = [...availableSlots];
        if (watchedTime && !slots.includes(watchedTime)) {
            slots.push(watchedTime);
            slots.sort();
        }
        return slots.map((t) => ({ value: t, label: t }));
    }, [availableSlots, watchedTime]);

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Agenda</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Turnos</h3>
                </div>
                <button onClick={() => {
                    setEditingAppointment(null);
                    const now = new Date();
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    originalStartTimeRef.current = '';
                    reset({
                        client: '',
                        service: '',
                        professional: '',
                        date: dateStr,
                        time: timeStr,
                        notes: ''
                    });
                    setIsFormModalOpen(true);
                }}
                    className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto">
                    <FiPlus className="text-lg" /> Nuevo Turno
                </button>
            </header>

            {professionals.length > 1 && (
                <div className="mb-4 flex items-center gap-3">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</label>
                    <select value={professionalFilter} onChange={e => setProfessionalFilter(e.target.value)}
                        className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all cursor-pointer">
                        <option value="">Todas</option>
                        {professionals.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {professionals.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1" aria-label="Referencia de profesionales">
                    {professionals.map((p) => (
                        <div key={p._id} className="flex shrink-0 items-center gap-2">
                            <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-maison-border font-serif text-[0.65rem] shadow-sm"
                                style={{ backgroundColor: p.color, color: getContrastTextColor(p.color) }}
                                aria-hidden="true"
                            >
                                {getProfessionalInitials(p.name)}
                            </span>
                            <span className="whitespace-nowrap text-xs font-medium text-maison-text">{p.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden p-4 animate-pulse">
                    <div className="h-10 bg-gray-200 rounded-lg w-full mb-4" />
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded" />
                        ))}
                    </div>
                </div>
            ) : isError ? (
                <div className="bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiAlertCircle className="text-2xl text-maison-red" />
                    </div>
                    <h4 className="text-lg font-serif text-maison-text mb-2">Error al cargar turnos</h4>
                    <p className="text-sm text-gray-500">No pudimos cargar los turnos en este momento. Por favor, intenta de nuevo.</p>
                </div>
            ) : (
                <div className="relative bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden p-4">
                    <style>{`
                        .fc { font-family: 'Inter', sans-serif; background-color: #FFFFFF; border-radius: 16px; border: none; }
                        .fc .fc-toolbar-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; color: #2C2A29; }
                        .fc .fc-button-primary { background-color: #FFFFFF; border: 1px solid #EAE6DF; color: #4B5563; border-radius: 9999px; padding: 6px 16px; font-size: 0.875rem; font-weight: 500; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; }
                        .fc .fc-button-primary:hover { background-color: #F9FAF8; border-color: #D1D5DB; color: #2C2A29; }
                        .fc .fc-button-primary:disabled { opacity: 0.5; }
                        .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: #1A1A1A; border-color: #1A1A1A; color: #FFFFFF; }
                        .fc .fc-daygrid-day.fc-day-today, .fc .fc-timegrid-col.fc-day-today { background-color: #FDFBF7; }
                        .fc .fc-col-header-cell { background-color: #FDFBF7; }
                        .fc .fc-col-header-cell-cushion { font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; padding: 8px; }
                        .fc .fc-timegrid-slot-label { font-size: 0.75rem; color: #9CA3AF; }
                        .fc .fc-timegrid-now-indicator-line { border-color: #E06B5E; }
                        .fc .fc-timegrid-now-indicator-arrow { border-color: #E06B5E; }
                        .fc-theme-standard td, .fc-theme-standard th { border-color: #EAE6DF; }
                        .fc-theme-standard .fc-scrollgrid { border-color: #EAE6DF; }
                        .fc .fc-daygrid-day-number { font-size: 0.8rem; color: #4B5563; padding: 6px; }
                        .fc .fc-day-today .fc-daygrid-day-number { color: #1A1A1A; font-weight: 600; }
                        .fc .fc-timegrid-axis, .fc .fc-timegrid-slot { border-color: #EAE6DF; }
                        .appointment-event { border-radius: 8px; padding: 2px 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
                        .appointment-event.cancelled { text-decoration: line-through; opacity: 0.7; }
                        .fc .fc-daygrid-event { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .appointment-event-content { display: flex; align-items: center; gap: 4px; overflow: hidden; }
                        .appointment-event-content .event-icon { display: flex; align-items: center; flex-shrink: 0; font-size: 0.85em; }
                        .appointment-event-content .event-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                        .fc-timegrid-event .fc-event-main { overflow: hidden; }
                    `}</style>
                    {isFetching && (
                        <span className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-maison-border rounded-full">
                            Actualizando...
                        </span>
                    )}
                    <FullCalendar
                        plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        slotMinTime="06:00"
                        slotMaxTime="22:00"
                        slotDuration="00:30"
                        allDaySlot={false}
                        locale={esLocale}
                        contentHeight={560}
                        editable={true}
                        eventDurationEditable={false}
                        slotEventOverlap={true}
                        eventOverlap={(stillEvent, movingEvent) => {
                            if (!movingEvent) return true;
                            const stillProf = (stillEvent.extendedProps.appointment as Appointment)?.professional?._id;
                            const movingProf = (movingEvent.extendedProps.appointment as Appointment)?.professional?._id;
                            return !stillProf || !movingProf || stillProf !== movingProf;
                        }}
                        events={events}
                        eventContent={(arg) => {
                            const appointment = arg.event.extendedProps.appointment as Appointment;
                            const startDate = new Date(appointment.startTime);
                            const timeStr = startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                            const isDay = arg.view.type === 'timeGridDay';

                            if (!isDay) {
                                return (
                                    <div className="appointment-event-content">
                                        <span className="event-icon">{getStatusIcon(getRenderStatus(appointment))}</span>
                                        <span className="event-title">{timeStr}</span>
                                    </div>
                                );
                            }

                            const professionalName = appointment.professional && typeof appointment.professional === 'object'
                                ? appointment.professional.name
                                : undefined;
                            return (
                                <div className="appointment-event-content">
                                    <span className="event-icon">{getStatusIcon(getRenderStatus(appointment))}</span>
                                    <span className="event-title">
                                        {timeStr} · {arg.event.title}{professionalName ? ` · ${professionalName}` : ''}
                                    </span>
                                </div>
                            );
                        }}
                        eventDidMount={handleEventDidMount}
                        datesSet={handleDatesSet}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        businessHours={calendarBusinessHours}
                    />
                </div>
            )}

            <Tooltip
                id="appointment-tooltip"
                className="!bg-maison-primary !text-white !text-xs !rounded-lg !py-1.5 !px-3"
                portalRoot={document.body}
                positionStrategy="fixed"
                style={{ zIndex: 9999 }}
            />

            <Modal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setEditingAppointment(null); }}
                title={editingAppointment ? 'Editar Turno' : 'Nuevo Turno'}
                subtitle={editingAppointment ? 'Modificá los datos del turno.' : 'Completá los datos para agendar un turno.'}
                maxWidth="max-w-lg"
                footer={formFooter}
            >
                <form id="appointmentForm" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Cliente *</label>
                        <Controller
                            name="client"
                            control={control}
                            rules={{ required: 'Seleccionar un cliente es obligatorio' }}
                            render={({ field }) => (
                                <Select
                                    options={clientOptions}
                                    placeholder="Buscar cliente..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el cliente"}
                                    value={clientOptions.find(c => c.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {errors.client && <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium"><FiAlertCircle /> {errors.client.message}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Servicio <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <Controller
                            name="service"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    options={serviceOptions}
                                    placeholder="Buscar servicio..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el servicio"}
                                    value={serviceOptions.find(s => s.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {selectedService && (
                            <p className="text-xs text-gray-400 mt-1">Duración estimada: {selectedService.duration} minutos</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Profesional <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <Controller
                            name="professional"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    options={professionalOptions}
                                    placeholder="Buscar profesional..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No hay profesionales activas"}
                                    value={professionalOptions.find(p => p.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Fecha *</label>
                            <input type="date"
                                min={getTodayDateString()}
                                className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.date ? 'border-maison-red' : 'border-maison-border'}`}
                                {...register('date', { required: 'La fecha es obligatoria' })}
                            />
                            {errors.date && <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium"><FiAlertCircle /> {errors.date.message}</span>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Hora *</label>
                            <Controller
                                name="time"
                                control={control}
                                rules={{
                                    required: 'La hora es obligatoria',
                                    validate: (value) => {
                                        const combined = `${watchedDate}T${value}`;
                                        if (originalStartTimeRef.current && combined === originalStartTimeRef.current) {
                                            return true;
                                        }
                                        return new Date(combined) >= new Date() || 'La hora no puede ser anterior al momento actual';
                                    }
                                }}
                                render={({ field }) => (
                                    <Select
                                        options={timeOptions}
                                        placeholder="Seleccionar horario..."
                                        styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                                        menuPortalTarget={document.body}
                                        noOptionsMessage={() => "No hay horarios disponibles para esta fecha"}
                                        value={timeOptions.find(t => t.value === field.value) || null}
                                        onChange={(val) => field.onChange(val?.value)}
                                    />
                                )}
                            />
                            {errors.time && <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium"><FiAlertCircle /> {errors.time.message}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Notas <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <textarea rows={3} placeholder="Ej: Cliente solicita coloración con mechas..."
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                            {...register('notes')}
                        />
                    </div>

                </form>
            </Modal>

            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Detalle del Turno"
                maxWidth="max-w-lg"
                footer={detailFooter}
            >
                {selectedAppointment && <AppointmentDetail appointment={selectedAppointment} />}
            </Modal>

            <Modal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                title="Cancelar Turno"
                subtitle="¿Estás seguro de que querés cancelar este turno?"
                footer={cancelFooter}
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Motivo de cancelación <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <textarea rows={3} placeholder="Ej: Cliente llamó para cancelar..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                        />
                    </div>
                </div>
            </Modal>

            <RegistroModal
                isOpen={isRegistroModalOpen}
                onClose={handleRegistroModalClose}
                preselectedClientId={prefillClient}
                preselectedServiceId={prefillService}
                preselectedProfessionalId={prefillProfessional}
                preselectedServiceDate={prefillServiceDate}
                appointmentId={completedAppointmentId}
            />
        </div>
    );
}
