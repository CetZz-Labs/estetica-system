export const MAX_REPORT_RANGE_DAYS = 366;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parsea 'YYYY-MM-DD' estricto (rechaza 2026-02-30). Devuelve ms UTC de esa fecha a las 00:00 UTC o null. */
export const parseDateOnly = (value: unknown): number | null => {
    if (typeof value !== 'string') return null;
    const m = DATE_RE.exec(value);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const ms = Date.UTC(y, mo - 1, d);
    const dt = new Date(ms);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return ms;
};

const formatDateOnly = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Cantidad de días inclusivos del rango, o null si es inválido (formato, from>to). */
export const getRangeDays = (from: unknown, to: unknown): number | null => {
    const f = parseDateOnly(from);
    const t = parseDateOnly(to);
    if (f === null || t === null || f > t) return null;
    return Math.round((t - f) / DAY_MS) + 1;
};

/** Valida el rango; devuelve mensaje de error o null si es válido. */
export const validateReportRange = (from: unknown, to: unknown): string | null => {
    if (parseDateOnly(from) === null || parseDateOnly(to) === null) {
        return 'Las fechas deben tener formato YYYY-MM-DD válido';
    }
    const days = getRangeDays(from, to);
    if (days === null) return 'La fecha "from" no puede ser posterior a "to"';
    if (days > MAX_REPORT_RANGE_DAYS) return `El rango máximo es de ${MAX_REPORT_RANGE_DAYS} días`;
    return null;
};

/** Lista cada día calendario 'YYYY-MM-DD' entre from y to inclusive, ascendente. */
export const listDays = (from: string, to: string): string[] => {
    const f = parseDateOnly(from);
    const t = parseDateOnly(to);
    if (f === null || t === null || f > t) return [];
    const days: string[] = [];
    for (let ms = f; ms <= t; ms += DAY_MS) days.push(formatDateOnly(ms));
    return days;
};

/** Suma n días a una fecha 'YYYY-MM-DD'. */
export const addDays = (date: string, n: number): string => {
    const ms = parseDateOnly(date);
    if (ms === null) throw new Error('Fecha inválida');
    return formatDateOnly(ms + n * DAY_MS);
};

const tzOffsetMs = (instant: number, timezone: string): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(new Date(instant));
    const g = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
    return asUtc - Math.floor(instant / 1000) * 1000;
};

/** Instante UTC correspondiente a la medianoche de 'YYYY-MM-DD' en la zona horaria dada. */
export const startOfDayInTimezone = (date: string, timezone: string): Date => {
    const ms = parseDateOnly(date);
    if (ms === null) throw new Error('Fecha inválida');
    let guess = ms - tzOffsetMs(ms, timezone);
    guess = ms - tzOffsetMs(guess, timezone);
    return new Date(guess);
};
