import { useEffect, useState } from 'react';

/** Devuelve `value` rezagado `delay` ms (default 300). Útil para búsquedas server-side. */
export default function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
