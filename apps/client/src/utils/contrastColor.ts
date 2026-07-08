const MAISON_TEXT = '#2C2A29';
const WHITE = '#FFFFFF';

/**
 * Umbral de brillo percibido (0-255) recomendado por las guías de accesibilidad
 * históricas del W3C (AERT — https://www.w3.org/TR/AERT/#color-contrast):
 * por debajo de 128, el fondo se considera "oscuro" y requiere texto claro.
 */
const BRIGHTNESS_THRESHOLD = 128;

/**
 * Calcula el color de texto (blanco o el oscuro del sistema `maison-text`) que mantiene
 * mejor contraste sobre un color de fondo hexadecimal arbitrario (ej. el color elegido
 * libremente por el usuario al crear un profesional).
 *
 * Fórmula elegida: brillo percibido YIQ `(R*299 + G*587 + B*114) / 1000` (guía W3C AERT).
 * Se prefiere sobre la luminancia relativa WCAG 2.1 completa (que exige corrección gamma
 * por canal antes de ponderar) porque acá solo hace falta decidir entre dos opciones de
 * texto fijas, no calcular un ratio de contraste exacto.
 */
export function getContrastTextColor(hexColor: string): string {
    const clean = hexColor.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= BRIGHTNESS_THRESHOLD ? MAISON_TEXT : WHITE;
}
