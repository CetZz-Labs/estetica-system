/**
 * Convierte un Date a su día calendario ("YYYY-MM-DD") en una zona horaria dada.
 * Mismo patrón que `checkBusinessHours` en `appointmentController.ts`: usar
 * `toLocaleDateString('en-CA', { timeZone })` en vez de `setHours(0,0,0,0)`,
 * que ancla implícitamente el "día actual" a la zona horaria del proceso Node
 * (UTC en la mayoría de los despliegues), no a la del negocio (`tenant.timezone`).
 */
export const toLocalDateString = (date: Date, timezone: string): string => {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
};

/**
 * Determina si `date` cae en un día calendario anterior al de `referenceDate`,
 * ambos evaluados en `timezone` (la del tenant, no la del proceso servidor).
 * El mismo día calendario nunca se considera "pasado", aunque la hora exacta
 * de `date` ya haya pasado respecto a `referenceDate`.
 */
export const isBeforeCalendarDay = (date: Date, referenceDate: Date, timezone: string): boolean => {
    const dateStr = toLocalDateString(date, timezone);
    const referenceStr = toLocalDateString(referenceDate, timezone);
    return dateStr < referenceStr;
};
