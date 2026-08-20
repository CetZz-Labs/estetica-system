import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiBox } from "react-icons/fi";
import Select, { type StylesConfig } from "react-select"; // ⭐️ Importamos react-select

import { getProducts } from "../api/productApi";
import { getClients } from "../api/clientApi";
import { getServices } from "../api/serviceApi";
import { getProfessionals } from "../api/professionalApi";
import { createServiceRecord, type ServiceRecordPayload } from "../api/serviceRecordApi";
import { completeAppointment, getAppointments } from "../api/appointmentApi";
import { getDisponibilidad } from "../api/disponibilidadApi";
import type { BusinessHours } from "../api/disponibilidadApi";
import { handleApiError } from "../api/errorHandler";
import type { Product, Client, Service, Professional, Appointment } from "../types";
import Modal from "./ui/Modal";
import { getAvailableSlots, getLocalDayRangeISO } from "../utils/timeSlots";
import { getTodayDateString, getYesterdayDateString } from "../utils/dates";

interface SelectOption {
    value: string;
    label: string;
    isDisabled?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    preselectedClientId?: string;
    preselectedServiceId?: string;
    preselectedProfessionalId?: string;
    appointmentId?: string;
    preselectedServiceDate?: string;
    /** Modo "visita pasada": permite serviceDate estrictamente anterior a hoy y envía isBackfill: true (UX-69). */
    pastVisitMode?: boolean;
}

// ⭐️ Constante para estilar los React-Select para que coincidan con tu tema "Maison"
const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#fff9f6', // bg-background
        borderColor: state.isFocused ? '#80a890' : '#E5E7EB', // focus:ring-ring (verde seco)
        borderRadius: '0.5rem', // rounded-lg
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 2px #80a890' : 'none',
        '&:hover': {
            borderColor: '#D1D5DB'
        }
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#111827' : state.isFocused ? '#F3F4F6' : 'white',
        color: state.isSelected ? 'white' : '#374151',
        cursor: 'pointer'
    })
};

interface RegistroFormValues extends Omit<ServiceRecordPayload, "nextTouchupDate"> {
    touchupDate: string;
    touchupTime: string;
}

export default function RegistroModal({ isOpen, onClose, preselectedClientId, preselectedServiceId, preselectedProfessionalId, appointmentId, preselectedServiceDate, pastVisitMode = false }: Props) {
    const queryClient = useQueryClient();

    const { data: inventoryProducts } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => getProducts(),
        enabled: isOpen
    });

    const { data: clients } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: () => getClients(),
        enabled: isOpen
    });

    const { data: services } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: () => getServices(),
        enabled: isOpen
    });

    const { data: professionals } = useQuery<Professional[]>({
        queryKey: ['professionals', 'active'],
        queryFn: () => getProfessionals(),
        enabled: isOpen
    });

    const { data: businessHoursData } = useQuery<BusinessHours>({
        queryKey: ['business-hours'],
        queryFn: getDisponibilidad,
        enabled: isOpen
    });

    // ⭐️ Formateamos los datos para que react-select los entienda ({ label, value })
    const clientOptions = clients?.map(c => ({ value: c._id, label: `${c.firstName} ${c.lastName ?? ''}`.trim() })) || [];
    const serviceOptions = services?.map(s => ({ value: s._id, label: s.name })) || [];
    const professionalOptions = professionals?.map(p => ({ value: p._id, label: p.name })) || [];
    const productOptions = inventoryProducts?.map(p => ({
        value: p._id,
        label: `${p.name} (${p.brand}) - Stock: ${p.stock}`,
        isDisabled: p.stock === 0 // Deshabilitamos los que no tienen stock
    })) || [];

    // Estado para el selector independiente de Insumos
    const [selectedProductOption, setSelectedProductOption] = useState<{ value: string, label: string } | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');

    const { register, control, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<RegistroFormValues>({
        defaultValues: {
            client: preselectedClientId || '',
            service: preselectedServiceId || '',
            professional: preselectedProfessionalId || '',
            serviceDate: preselectedServiceDate || (pastVisitMode ? getYesterdayDateString() : new Date().toISOString().split('T')[0]),
            notes: '',
            touchupDate: '',
            touchupTime: '',
            productsUsed: []
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "productsUsed" });

    const watchedServiceId = watch('service');
    const watchedServiceDate = watch('serviceDate');
    const watchedProfessional = watch('professional');
    const watchedTouchupDate = watch('touchupDate');
    const watchedTouchupTime = watch('touchupTime');
    const selectedService = services?.find(s => s._id === watchedServiceId);
    const hasSuggestedTouchup = (selectedService?.defaultTouchupDays ?? 0) > 0 && !!watchedServiceDate;

    // Turnos del profesional en la fecha elegida para el retoque — insumo para calcular
    // los horarios libres, independiente de la fecha del servicio que se está registrando.
    const { data: touchupDayAppointments } = useQuery<Appointment[]>({
        queryKey: ['appointments', 'day', watchedTouchupDate, watchedProfessional],
        queryFn: () => {
            const { start, end } = getLocalDayRangeISO(watchedTouchupDate);
            return getAppointments({
                startDate: start,
                endDate: end,
                ...(watchedProfessional ? { professional: watchedProfessional } : {}),
            });
        },
        enabled: isOpen && !!watchedTouchupDate,
        placeholderData: keepPreviousData,
    });

    const touchupDurationMin = selectedService?.duration ?? 60;

    const availableTouchupSlots = useMemo(() => {
        if (!watchedTouchupDate) return [];
        return getAvailableSlots({
            dateStr: watchedTouchupDate,
            professionalId: watchedProfessional || undefined,
            durationMin: touchupDurationMin,
            businessHours: businessHoursData,
            dayAppointments: touchupDayAppointments,
        });
    }, [watchedTouchupDate, watchedProfessional, touchupDurationMin, businessHoursData, touchupDayAppointments]);

    const touchupTimeOptions = useMemo(() => {
        const slots = [...availableTouchupSlots];
        if (watchedTouchupTime && !slots.includes(watchedTouchupTime)) {
            slots.push(watchedTouchupTime);
            slots.sort();
        }
        return slots.map((t) => ({ value: t, label: t }));
    }, [availableTouchupSlots, watchedTouchupTime]);

    const handleUseSuggestedDate = () => {
        if (!selectedService || !watchedServiceDate) return;
        const [year, month, day] = watchedServiceDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + (selectedService.defaultTouchupDays || 0));
        const pad = (n: number) => String(n).padStart(2, '0');
        const suggestedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        setValue('touchupDate', suggestedDate);
        setValue('touchupTime', '09:00');
    };

    const handleCloseModal = () => {
        setSelectedProductOption(null);
        setQuantityToAdd('');
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            reset({
                client: preselectedClientId || '',
                service: preselectedServiceId || '',
                professional: preselectedProfessionalId || '',
                serviceDate: preselectedServiceDate || (pastVisitMode ? getYesterdayDateString() : new Date().toISOString().split('T')[0]),
                notes: '',
                touchupDate: '',
                touchupTime: '',
                productsUsed: []
            });
        }
    }, [isOpen, preselectedClientId, preselectedServiceId, preselectedProfessionalId, preselectedServiceDate, pastVisitMode, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (data: ServiceRecordPayload) => {
            if (appointmentId) {
                await completeAppointment(appointmentId, data);
            } else {
                await createServiceRecord(data);
            }
        },
        onSuccess: () => {
            toast.success('Servicio registrado. Stock actualizado.', {
                style: { background: '#fff9f6', color: '#6b8e7b', borderColor: '#6b8e7b' }
            });
            queryClient.invalidateQueries({ queryKey: ['recent-movements'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-touchups'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['pending-registration'] });
            queryClient.invalidateQueries({ queryKey: ['client-history'] });

            handleCloseModal();
        },
        onError: (error) => handleApiError(error, 'Error al registrar la visita')
    });

    const onSubmit = (data: RegistroFormValues) => {
        const { touchupDate, touchupTime, ...rest } = data;
        const nextTouchupDate = touchupDate && touchupTime
            ? new Date(`${touchupDate}T${touchupTime}`).toISOString()
            : undefined;
        const payload: ServiceRecordPayload = {
            ...rest,
            ...(nextTouchupDate ? { nextTouchupDate } : {}),
            ...(pastVisitMode ? { isBackfill: true } : {}),
        };
        mutate(payload);
    };

    const handleAddProduct = () => {
        if (!selectedProductOption || !quantityToAdd) return;

        if (fields.some(f => f.product === selectedProductOption.value)) {
            toast.error('Este insumo ya está en la lista. Eliminalo y agregalo con la cantidad total.');
            return;
        }
        append({ product: selectedProductOption.value, quantity: Number(quantityToAdd) });
        setSelectedProductOption(null);
        setQuantityToAdd('');
    };

    const footer = (
        <>
            <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                Cancelar
            </button>
            <button type="submit" form="registroForm" disabled={isPending} className="bg-primary hover:bg-accent hover:text-accent-foreground disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm">
                {isPending ? 'Guardando...' : 'Guardar y Descontar Stock'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCloseModal}
            title={pastVisitMode ? "Registrar Visita Pasada" : "Registrar Visita"}
            subtitle={pastVisitMode ? "Cargá un servicio que se te olvidó asentar." : "Asentá el servicio y consumos del cliente."}
            maxWidth="max-w-3xl"
            containerClassName="flex flex-col max-h-[90vh]"
            footer={footer}
        >
            <form id="registroForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* ⭐️ Selector Inteligente de Cliente */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Cliente *</label>
                        <Controller
                            name="client"
                            control={control}
                            rules={{ required: 'Seleccionar un cliente es obligatorio' }}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={clientOptions}
                                    placeholder="Buscar cliente..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el cliente"}
                                    value={clientOptions.find(c => c.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {errors.client && <span className="text-[10px] text-destructive">{errors.client.message}</span>}
                    </div>

                    {/* ⭐️ Selector Inteligente de Servicio */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Servicio *</label>
                        <Controller
                            name="service"
                            control={control}
                            rules={{ required: 'Seleccionar un servicio es obligatorio' }}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={serviceOptions}
                                    placeholder="Buscar servicio..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el servicio"}
                                    value={serviceOptions.find(s => s.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {errors.service && <span className="text-[10px] text-destructive">{errors.service.message}</span>}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional *</label>
                    <Controller
                        name="professional"
                        control={control}
                        rules={{ required: 'Seleccionar una profesional es obligatorio' }}
                        render={({ field }) => (
                            <Select
                                {...field}
                                options={professionalOptions}
                                placeholder="Buscar profesional..."
                                styles={selectStyles}
                                noOptionsMessage={() => "No hay profesionales activas"}
                                value={professionalOptions.find(p => p.value === field.value) || null}
                                onChange={(val) => field.onChange(val?.value)}
                            />
                        )}
                    />
                    {errors.professional && <span className="text-[10px] text-destructive">{errors.professional.message}</span>}
                </div>

                <div className={`grid grid-cols-1 ${pastVisitMode ? '' : 'md:grid-cols-2'} gap-5`}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Fecha del Servicio *</label>
                        <input
                            type="date"
                            min={pastVisitMode || appointmentId ? undefined : getTodayDateString()}
                            max={pastVisitMode ? getYesterdayDateString() : undefined}
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${errors.serviceDate ? 'border-destructive' : 'border-border'}`}
                            {...register('serviceDate', {
                                required: 'Requerido',
                                validate: (value) => {
                                    if (!pastVisitMode) return true;
                                    return value < getTodayDateString() || 'La fecha debe ser anterior a hoy';
                                }
                            })}
                        />
                        {errors.serviceDate && <span className="text-[10px] text-destructive">{errors.serviceDate.message}</span>}
                    </div>
                    {!pastVisitMode && (
                        <div className="flex flex-col gap-1.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200 md:-mt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                    Próximo Retoque <span className="text-gray-400 font-normal normal-case ml-1">Opcional</span>
                                </label>
                                {hasSuggestedTouchup && (
                                    <button
                                        type="button"
                                        onClick={handleUseSuggestedDate}
                                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                        Usar sugerida (+{selectedService!.defaultTouchupDays}d)
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" min={getTodayDateString()} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" {...register('touchupDate')} />
                                <Controller
                                    name="touchupTime"
                                    control={control}
                                    rules={{
                                        validate: (value) => {
                                            if (!!value !== !!watchedTouchupDate) {
                                                return 'Completá fecha y hora, o dejá ambas vacías';
                                            }
                                            return true;
                                        }
                                    }}
                                    render={({ field }) => (
                                        <Select
                                            options={touchupTimeOptions}
                                            placeholder="Hora..."
                                            styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                                            menuPortalTarget={document.body}
                                            noOptionsMessage={() => "Sin horarios disponibles"}
                                            isDisabled={!watchedTouchupDate}
                                            value={touchupTimeOptions.find(t => t.value === field.value) || null}
                                            onChange={(val) => field.onChange(val?.value)}
                                        />
                                    )}
                                />
                            </div>
                            {errors.touchupTime && <span className="text-[10px] text-destructive">{errors.touchupTime.message}</span>}
                        </div>
                    )}
                </div>

                <div className="border border-border rounded-lg p-5 bg-white">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FiBox className="text-gray-400" /> Insumos Consumidos (Stock)</h3>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        {/* ⭐️ Selector Inteligente de Insumos (No usa Controller porque es independiente del form principal) */}
                        <div className="w-full sm:flex-1">
                            <Select
                                options={productOptions}
                                placeholder="Buscar insumo..."
                                styles={selectStyles}
                                noOptionsMessage={() => "Insumo no encontrado o sin stock"}
                                value={selectedProductOption}
                                onChange={(val) => setSelectedProductOption(val as { value: string, label: string } | null)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <input type="number" min="1" placeholder="Cant." className="flex-1 sm:w-24 px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" value={quantityToAdd} onChange={(e) => setQuantityToAdd(e.target.value ? Number(e.target.value) : '')} />
                            <button type="button" onClick={handleAddProduct} disabled={!selectedProductOption || !quantityToAdd} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"><FiPlus /></button>
                        </div>
                    </div>

                    {fields.length > 0 ? (
                        <ul className="space-y-2">
                            {fields.map((field, index) => {
                                const det = inventoryProducts?.find(p => p._id === field.product);
                                return (
                                    <li key={field.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">{det?.name || 'Insumo'}</span>
                                            <span className="text-xs text-gray-500">{field.quantity} unidades/ml</span>
                                        </div>
                                        <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><FiTrash2 size={16} /></button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">No se agregaron insumos a este servicio.</p>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                        Notas del Servicio <span className="text-gray-400 font-normal normal-case">Opcional</span>
                    </label>
                    <textarea rows={2} placeholder="Ej: Fórmula del color, observaciones del cabello..." className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none" {...register('notes')} />
                </div>
            </form>
        </Modal>
    );
}