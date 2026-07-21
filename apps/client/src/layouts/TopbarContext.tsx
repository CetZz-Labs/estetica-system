/* eslint-disable react-refresh/only-export-components -- UX-32 exige colocar Provider + hook
   `useTopbar` en el mismo archivo (nombre exacto TopbarContext.tsx); esto solo desactiva el
   fast-refresh de este archivo puntual, no afecta el comportamiento en producción. */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface TopbarConfig {
    title: string;
    primaryAction?: { label: string; onClick: () => void };
    searchSlot?: ReactNode;
}

interface TopbarContextValue {
    config: TopbarConfig;
    setConfig: (config: TopbarConfig) => void;
}

const DEFAULT_TOPBAR_CONFIG: TopbarConfig = { title: '' };

const TopbarContext = createContext<TopbarContextValue | null>(null);

interface TopbarProviderProps {
    children: ReactNode;
}

export function TopbarProvider({ children }: TopbarProviderProps) {
    const [config, setConfigState] = useState<TopbarConfig>(DEFAULT_TOPBAR_CONFIG);

    const setConfig = useCallback((next: TopbarConfig) => {
        setConfigState(next);
    }, []);

    return (
        <TopbarContext.Provider value={{ config, setConfig }}>
            {children}
        </TopbarContext.Provider>
    );
}

function useTopbarContext(): TopbarContextValue {
    const ctx = useContext(TopbarContext);
    if (!ctx) {
        throw new Error('useTopbar debe usarse dentro de <TopbarProvider>');
    }
    return ctx;
}

/**
 * Hook de topbar (AppLayout.tsx — UX-32).
 *
 * - Vistas: llamar `useTopbar({ title: 'Clientes', primaryAction: { label: '+ Nuevo', onClick } })`
 *   en la primera línea del componente. El efecto interno sincroniza el config al contexto y lo
 *   limpia al desmontar la vista.
 * - AppLayout: llamar `useTopbar()` sin argumentos para LEER el config actual sin setearlo.
 *
 * Nota de implementación: el efecto solo se re-dispara cuando cambian `title`,
 * `primaryAction.label` o `searchSlot` (no ante cualquier re-render de la vista), para evitar
 * loops de render cuando `onClick` es una función inline recreada en cada render. Limitación
 * conocida y aceptada: si una vista necesita refrescar el `onClick` capturando un valor nuevo
 * SIN cambiar `title`/`primaryAction.label`/`searchSlot`, el topbar no lo reflejará hasta que
 * alguno de esos tres cambie — agregar esa dependencia explícita a la lista de abajo si una
 * futura feature (UX-33/34) lo necesita.
 */
export function useTopbar(config?: TopbarConfig): TopbarConfig {
    const { config: currentConfig, setConfig } = useTopbarContext();

    useEffect(() => {
        if (!config) {
            return;
        }
        setConfig(config);
        return () => {
            setConfig(DEFAULT_TOPBAR_CONFIG);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.title, config?.primaryAction?.label, config?.searchSlot, setConfig]);

    return currentConfig;
}
