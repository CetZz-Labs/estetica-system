import { AxiosError } from 'axios';
import { toast } from 'sonner';

/**
 * Estructura de un error individual de express-validator.
 * Corresponde al formato devuelto por `validationResult(req).array()`.
 */
interface ValidationError {
    type: string;
    msg: string;
    path: string;
    location: string;
    value?: unknown;
}

/**
 * Estructura de la respuesta de error del backend.
 *
 * Posibles formatos:
 *  - express-validator: `{ errors: ValidationError[] }` (status 400)
 *  - Controllers:       `{ error: string }` (status 4xx/5xx)
 *  - Controllers:       `{ error: string, details: string }` (status 500 con detalle)
 */
interface ApiErrorResponse {
    error?: string;
    errors?: ValidationError[];
    details?: string;
    message?: string;
}

/**
 * Extrae el mensaje de error legible desde una respuesta del backend.
 *
 * Prioridades:
 *  1. Array de errores de express-validator → muestra cada uno como toast
 *  2. Campo `error` del controller → lo devuelve como string
 *  3. Fallback genérico
 */
export function handleApiError(error: unknown, fallbackMessage = 'Ocurrió un error inesperado'): void {
    // Caso 1: Error de Axios con respuesta del backend
    if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as ApiErrorResponse;

        // 1a. express-validator: array de errores
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            data.errors.forEach((err) => toast.error(err.msg));
            return;
        }

        // 1b. Error del controller: campo `error`
        if (data.error) {
            toast.error(data.error);
            return;
        }

        // 1c. Mensaje genérico del backend
        if (data.message) {
            toast.error(data.message);
            return;
        }
    }

    // Caso 2: Error de red / sin respuesta
    if (isAxiosError(error) && !error.response) {
        toast.error('Error de conexión. Verificá tu red e intentá de nuevo.');
        return;
    }

    // Caso 3: Fallback
    toast.error(fallbackMessage);
}

/**
 * Type guard para AxiosError.
 * Evita usar `any` y mantiene el tipado seguro.
 */
function isAxiosError(error: unknown): error is AxiosError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        (error as AxiosError).isAxiosError === true
    );
}
