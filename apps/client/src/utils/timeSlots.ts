import type { Appointment } from '../types';
import type { BusinessHours } from '../api/disponibilidadApi';

export function toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export function fromMinutes(minutes: number): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function toMinutesFromISO(iso: string): number {
    const date = new Date(iso);
    return date.getHours() * 60 + date.getMinutes();
}

function isSameLocalDate(dateStr: string, reference: Date): boolean {
    const pad = (n: number) => String(n).padStart(2, '0');
    const referenceStr = `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}-${pad(reference.getDate())}`;
    return dateStr === referenceStr;
}

/**
 * Rango horario local (00:00 a 23:59:59.999) de un día "YYYY-MM-DD" convertido a ISO.
 * Se arma con la misma interpretación local que usa el resto de la app al crear un
 * turno (`new Date(localString).toISOString()`), no con el day-numbering en UTC que
 * usa `getAvailableSlots` — son dos cálculos distintos e independientes.
 */
export function getLocalDayRangeISO(dateStr: string): { start: string; end: string } {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(`${dateStr}T23:59:59.999`);
    return { start: start.toISOString(), end: end.toISOString() };
}

export interface GetAvailableSlotsParams {
    dateStr: string;
    professionalId?: string;
    durationMin: number;
    businessHours?: BusinessHours;
    dayAppointments?: Appointment[];
    intervalMin?: number;
    excludeAppointmentId?: string;
}

/**
 * Genera los horarios disponibles (formato "HH:MM") para un día, en intervalos fijos,
 * replicando `checkBusinessHours` y el overlap de turnos que valida el backend
 * (`apps/server/src/controllers/appointmentController.ts`). El backend sigue siendo la
 * fuente de verdad final; este cálculo solo reduce los rechazos 400/409 en el formulario.
 */
export function getAvailableSlots({
    dateStr,
    professionalId,
    durationMin,
    businessHours,
    dayAppointments,
    intervalMin = 15,
    excludeAppointmentId,
}: GetAvailableSlotsParams): string[] {
    if (!dateStr || !businessHours?.schedule?.length) return [];

    if (businessHours.blockedDates.some((bd) => bd.date === dateStr)) return [];

    // Mismo day-numbering (0=Dom) que el backend: un string "YYYY-MM-DD" sin sufijo
    // de hora se parsea como medianoche UTC, igual que `new Date(localDateStr)` en
    // `checkBusinessHours`.
    const dayOfWeek = new Date(dateStr).getUTCDay();
    const daySchedule = businessHours.schedule.find((d) => d.day === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) return [];

    const openMin = toMinutes(daySchedule.openTime);
    const closeMin = toMinutes(daySchedule.closeTime);

    const busy = (dayAppointments || [])
        .filter((a) => a.status === 'pending' || a.status === 'confirmed')
        .filter((a) => a._id !== excludeAppointmentId)
        .filter((a) => !professionalId || a.professional?._id === professionalId)
        .map((a) => ({ start: toMinutesFromISO(a.startTime), end: toMinutesFromISO(a.endTime) }));

    const now = new Date();
    const isToday = isSameLocalDate(dateStr, now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const slots: string[] = [];
    for (let start = openMin; start + durationMin <= closeMin; start += intervalMin) {
        const end = start + durationMin;
        const overlaps = !!professionalId && busy.some((b) => start < b.end && end > b.start);
        const isPast = isToday && start < nowMin;
        if (!overlaps && !isPast) slots.push(fromMinutes(start));
    }
    return slots;
}
