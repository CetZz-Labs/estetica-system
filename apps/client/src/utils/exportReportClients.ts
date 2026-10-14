import type { InactiveClient } from '../api/reportApi';
import { formatCalendarDate, getTodayDateString } from './dates';
import { downloadXlsx } from './exportXlsx';

/** Genera y descarga el .xlsx con la lista de clientes inactivos mostrada. */
export const exportInactiveClients = (items: InactiveClient[]): void => {
    downloadXlsx(`clientes-inactivos_${getTodayDateString()}.xlsx`, [
        {
            name: 'Clientes inactivos',
            rows: [
                ['Cliente', 'Última visita', 'Días sin visita', 'Visitas'],
                ...items.map((c) => [c.name, formatCalendarDate(c.lastVisit), c.daysSince, c.visits]),
            ],
        },
    ]);
};
