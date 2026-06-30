// 1. FUNCION AUXILIAR (El truco de magia)
// Convertimos "2026-05-05T00:00:00.000Z" -> "2026/05/05"
// Al usar barras (/) en lugar de guiones (-), JavaScript automáticamente
// lo parsea en la zona horaria local a las 00:00:00, anulando el desfase de UTC-3.
const createSafeLocalDate = (dateString: string) => {
    const datePart = dateString.split('T')[0].replace(/-/g, '/');
    return new Date(datePart);
};

// 2. Formateador actualizado
export const formatDate = (dateString: string) => {
    const safeDate = createSafeLocalDate(dateString);
    return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(safeDate);
};

// 3. Calculadora de estado actualizada
export const getTimelineStatus = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Forzamos 'hoy' a las 00:00:00 locales

    // Usamos nuestra fecha segura sin desfasaje
    const target = createSafeLocalDate(dateString);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return {
            label: `Atrasado ${Math.abs(diffDays)}d`,
            dotColor: 'bg-maison-red',
            pillClass: 'bg-red-50 text-maison-red border border-red-100',
        };
    }
    if (diffDays === 0) {
        return {
            label: 'Hoy',
            dotColor: 'bg-maison-red',
            pillClass: 'bg-red-50 text-maison-red border border-red-100',
        };
    }
    if (diffDays === 1) {
        return {
            label: 'Mañana',
            dotColor: 'bg-maison-orange',
            pillClass: 'bg-orange-50 text-maison-orange border border-orange-100',
        };
    }
    if (diffDays <= 7) {
        return {
            label: `En ${diffDays} días`,
            dotColor: 'bg-maison-orange',
            pillClass: 'bg-orange-50 text-maison-orange border border-orange-100',
        };
    }
    if (diffDays <= 21) {
        return {
            label: `En ${diffDays} días`,
            dotColor: 'bg-maison-green',
            pillClass: 'bg-green-50 text-maison-green border border-green-100',
        };
    }

    return {
        label: `En ${diffDays} días`,
        dotColor: 'bg-gray-400',
        pillClass: 'bg-gray-50 text-gray-500 border border-gray-200',
    };
};

export const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const timePart = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${datePart} · ${timePart}`;
};

/**
 * Formatea una fecha date-only ("YYYY-MM-DD") forzando timeZone UTC para evitar
 * el desfase de un día en zonas UTC-N (ej. Argentina UTC-3).
 * Usar siempre para fechas capturadas con <input type="date">, vencimientos y retoques.
 */
export const formatCalendarDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(dateString));
};