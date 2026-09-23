/**
 * Normaliza un teléfono argentino guardado en `Client.phone` (formato libre, sin validación
 * en el schema) al E.164 esperado por los links `wa.me` (54 9 <código de área><número>, sin '+').
 *
 * Limitación conocida (UX-78, no se resuelve acá): números guardados en el formato viejo
 * "código de área + 15 + número" (ej. "011 15 1234-5678") producen un link incorrecto porque
 * no hay forma confiable de saber dónde termina el código de área para quitar el "15" infijo.
 * Riesgo aceptado: el envío es manual y el admin ve el chat de WhatsApp antes de mandar nada.
 */
export function toWhatsAppPhone(rawPhone: string): string | null {
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return null;

    let d = digits;
    if (d.startsWith('0')) d = d.slice(1);
    if (d.startsWith('54')) {
        d = d.slice(2);
        if (d.startsWith('0')) d = d.slice(1);
    }
    if (!d.startsWith('9')) d = '9' + d;

    return '54' + d;
}
