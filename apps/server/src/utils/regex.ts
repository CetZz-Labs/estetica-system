// Utilidades puras de regex (sin dependencias de Express/Mongoose). UX-92.

export const escapeRegex = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
