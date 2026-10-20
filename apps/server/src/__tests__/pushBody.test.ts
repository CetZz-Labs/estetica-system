import { describe, it, expect } from 'vitest';
import { buildPushBody } from '../services/pushReminderScheduler';

describe('buildPushBody', () => {
    it('pone cada cliente en su propia línea con encabezados sin punto final', () => {
        expect(buildPushBody(['Ana Paz 10:00', 'Luz Gil 11:00'], ['Eva Ruiz'])).toBe(
            'Turnos hoy:\nAna Paz 10:00\nLuz Gil 11:00\nRetoques pendientes:\nEva Ruiz'
        );
    });

    it('omite secciones vacías', () => {
        expect(buildPushBody([], ['Eva Ruiz'])).toBe('Retoques pendientes:\nEva Ruiz');
        expect(buildPushBody([], [])).toBe('');
    });

    it('trunca a 6 nombres con "y N más" en línea final', () => {
        const entries = Array.from({ length: 9 }, (_, i) => `C${i + 1}`);
        expect(buildPushBody(entries, [])).toBe('Turnos hoy:\nC1\nC2\nC3\nC4\nC5\nC6\ny 3 más');
    });
});
