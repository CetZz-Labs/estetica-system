import { describe, it, expect } from 'vitest';
import { parseDateOnly, getRangeDays, validateReportRange, listDays, addDays, startOfDayInTimezone } from '../utils/reportRange';

describe('reportRange', () => {
    it('parseDateOnly rechaza formatos y fechas inexistentes', () => {
        expect(parseDateOnly('2026-02-30')).toBeNull();
        expect(parseDateOnly('2026-1-1')).toBeNull();
        expect(parseDateOnly(undefined)).toBeNull();
        expect(parseDateOnly('2026-02-28')).not.toBeNull();
    });

    it('getRangeDays cuenta inclusivo', () => {
        expect(getRangeDays('2026-01-01', '2026-01-01')).toBe(1);
        expect(getRangeDays('2026-01-01', '2026-01-31')).toBe(31);
        expect(getRangeDays('2026-02-01', '2026-01-01')).toBeNull();
    });

    it('validateReportRange aplica tope de 366 días', () => {
        expect(validateReportRange('2026-01-01', '2026-12-31')).toBeNull();
        expect(validateReportRange('2024-01-01', '2024-12-31')).toBeNull(); // 366 (bisiesto)
        expect(validateReportRange('2025-01-01', '2026-01-02')).not.toBeNull(); // 367
        expect(validateReportRange('2026-02-01', '2026-01-01')).not.toBeNull();
        expect(validateReportRange('x', '2026-01-01')).not.toBeNull();
    });

    it('listDays genera cada día en orden y cruza meses/años', () => {
        expect(listDays('2025-12-30', '2026-01-02')).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
        expect(listDays('2026-02-02', '2026-02-01')).toEqual([]);
        expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    });

    it('startOfDayInTimezone devuelve medianoche local del tenant', () => {
        expect(startOfDayInTimezone('2026-03-10', 'America/Argentina/Buenos_Aires').toISOString()).toBe('2026-03-10T03:00:00.000Z');
        expect(startOfDayInTimezone('2026-03-10', 'UTC').toISOString()).toBe('2026-03-10T00:00:00.000Z');
        // DST: Nueva York en horario de verano (UTC-4) y estándar (UTC-5)
        expect(startOfDayInTimezone('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z');
        expect(startOfDayInTimezone('2026-01-01', 'America/New_York').toISOString()).toBe('2026-01-01T05:00:00.000Z');
    });
});
