import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FiAlertCircle, FiClock, FiTrash2 } from 'react-icons/fi';

import {
    getDisponibilidad,
    updateDisponibilidad,
    type DaySchedule,
    type BlockedDate,
    type BusinessHours,
} from '../api/disponibilidadApi';
import { handleApiError } from '../api/errorHandler';
import { formatCalendarDate } from '../utils/dates';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Mostrar en orden Lunes–Sábado–Domingo
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_SCHEDULE: DaySchedule[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    isOpen: day >= 1 && day <= 6,
    openTime: '09:00',
    closeTime: '18:00',
}));

export default function Disponibilidad() {
    const queryClient = useQueryClient();

    // Local "dirty" state — null means "no edits yet, use remote data"
    const [localSchedule, setLocalSchedule] = useState<DaySchedule[] | null>(null);
    const [localBlockedDates, setLocalBlockedDates] = useState<BlockedDate[] | null>(null);
    const [newBlockedDate, setNewBlockedDate] = useState('');
    const [newBlockedReason, setNewBlockedReason] = useState('');

    const { data, isLoading, isError } = useQuery<BusinessHours>({
        queryKey: ['business-hours'],
        queryFn: getDisponibilidad,
    });

    // Effective values: local edits take precedence, then remote data, then defaults
    const schedule: DaySchedule[] = localSchedule ?? (data?.schedule?.length ? data.schedule : DEFAULT_SCHEDULE);
    const blockedDates: BlockedDate[] = localBlockedDates ?? (data?.blockedDates ?? []);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: Partial<BusinessHours>) => updateDisponibilidad(payload),
        onSuccess: () => {
            toast.success('Disponibilidad guardada');
            // Clear local edits — query refetch provides the new source of truth
            setLocalSchedule(null);
            setLocalBlockedDates(null);
            queryClient.invalidateQueries({ queryKey: ['business-hours'] });
        },
        onError: (error) => handleApiError(error, 'Error al guardar la disponibilidad'),
    });

    const toggleDay = (dayNum: number) => {
        setLocalSchedule(
            schedule.map((d) => (d.day === dayNum ? { ...d, isOpen: !d.isOpen } : d))
        );
    };

    const updateTime = (dayNum: number, field: 'openTime' | 'closeTime', value: string) => {
        setLocalSchedule(
            schedule.map((d) => (d.day === dayNum ? { ...d, [field]: value } : d))
        );
    };

    const addBlockedDate = () => {
        if (!newBlockedDate) return;
        const already = blockedDates.some((b) => b.date === newBlockedDate);
        if (already) {
            toast.error('Esa fecha ya está marcada como no laborable');
            return;
        }
        setLocalBlockedDates([
            ...blockedDates,
            { date: newBlockedDate, reason: newBlockedReason || undefined },
        ]);
        setNewBlockedDate('');
        setNewBlockedReason('');
    };

    const removeBlockedDate = (date: string) => {
        setLocalBlockedDates(blockedDates.filter((b) => b.date !== date));
    };

    const handleSave = () => {
        mutate({ schedule, blockedDates });
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto animate-pulse">
                <div className="mb-8 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-56"></div>
                </div>
                <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-6 w-10 bg-gray-200 rounded-full"></div>
                            <div className="h-9 bg-gray-200 rounded-xl w-24"></div>
                            <div className="h-4 w-3 bg-gray-200 rounded"></div>
                            <div className="h-9 bg-gray-200 rounded-xl w-24"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <div className="bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiAlertCircle className="text-2xl text-maison-red" />
                    </div>
                    <p className="text-sm text-maison-red">
                        No pudimos cargar la disponibilidad en este momento. Por favor, intenta de nuevo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Configuración</p>
                <h1 className="font-serif text-2xl text-maison-text">Disponibilidad</h1>
            </div>

            {/* Sección 1 — Horario de atención */}
            <section className="bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <FiClock className="text-gray-400 text-lg" />
                    <h2 className="font-serif text-xl text-maison-text">Horario de atención</h2>
                </div>

                <div className="space-y-4">
                    {DAY_ORDER.map((dayNum) => {
                        const dayData = schedule.find((d) => d.day === dayNum) ?? {
                            day: dayNum,
                            isOpen: false,
                            openTime: '09:00',
                            closeTime: '18:00',
                        };

                        return (
                            <div key={dayNum} className="flex flex-wrap items-center gap-3 sm:gap-4">
                                {/* Nombre del día */}
                                <span className="w-24 text-sm font-medium text-maison-text shrink-0">
                                    {DAY_NAMES[dayNum]}
                                </span>

                                {/* Toggle */}
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={dayData.isOpen}
                                    aria-label={`${dayData.isOpen ? 'Desactivar' : 'Activar'} ${DAY_NAMES[dayNum]}`}
                                    onClick={() => toggleDay(dayNum)}
                                    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${dayData.isOpen ? 'bg-maison-primary' : 'bg-gray-300'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dayData.isOpen ? 'translate-x-4' : ''}`}
                                    />
                                </button>

                                {/* Inputs de tiempo */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={dayData.openTime}
                                        disabled={!dayData.isOpen}
                                        onChange={(e) => updateTime(dayNum, 'openTime', e.target.value)}
                                        className={`px-3 py-2 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-opacity ${!dayData.isOpen ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                    <span className="text-gray-400 text-sm select-none">→</span>
                                    <input
                                        type="time"
                                        value={dayData.closeTime}
                                        disabled={!dayData.isOpen}
                                        onChange={(e) => updateTime(dayNum, 'closeTime', e.target.value)}
                                        className={`px-3 py-2 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-opacity ${!dayData.isOpen ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Sección 2 — Días no laborables */}
            <section className="bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
                <h2 className="font-serif text-xl text-maison-text mb-6">Días no laborables</h2>

                {/* Formulario inline para agregar */}
                <div className="flex flex-wrap items-end gap-3 mb-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={newBlockedDate}
                            onChange={(e) => setNewBlockedDate(e.target.value)}
                            className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                            Motivo <span className="text-gray-400 font-normal normal-case">(opcional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Feriado nacional"
                            value={newBlockedReason}
                            onChange={(e) => setNewBlockedReason(e.target.value)}
                            className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={addBlockedDate}
                        disabled={!newBlockedDate}
                        className="bg-maison-primary hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer shadow-sm"
                    >
                        Agregar
                    </button>
                </div>

                {/* Lista de fechas bloqueadas */}
                {blockedDates.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        No hay días no laborables configurados.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {[...blockedDates]
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((blocked) => (
                                <li
                                    key={blocked.date}
                                    className="flex items-center justify-between gap-3 px-4 py-3 bg-maison-bg border border-maison-border rounded-xl"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium text-maison-text">
                                            {formatCalendarDate(blocked.date)}
                                        </span>
                                        {blocked.reason && (
                                            <span className="text-xs text-gray-500">{blocked.reason}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeBlockedDate(blocked.date)}
                                        aria-label={`Eliminar día no laborable ${formatCalendarDate(blocked.date)}`}
                                        className="p-1.5 text-gray-400 hover:text-maison-red transition-colors cursor-pointer rounded-lg hover:bg-red-50"
                                    >
                                        <FiTrash2 className="text-sm" />
                                    </button>
                                </li>
                            ))}
                    </ul>
                )}
            </section>

            {/* Botón Guardar */}
            <div className="pb-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="bg-maison-primary hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                    {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
}
