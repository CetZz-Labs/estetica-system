import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface Props {
    /** Valor inicial al montar (desde el item ya cargado por `useFieldArray`/`reset()`); undefined si no hay dato aún (arranca en 100). */
    defaultValue: number | undefined;
    /** Resultado de `register('productsUsed.${index}.usedPercent', { valueAsNumber: true })` del formulario dueño. */
    registration: UseFormRegisterReturn;
    /**
     * Notifica al formulario dueño que el usuario interactuó con el slider (flag touched, P19).
     * Opcional: RegistroModal (UX-90) ya no lo usa porque siempre envía el valor actual de la barra.
     */
    onTouched?: () => void;
    /**
     * Tope superior del rango. UX-90: pool disponible acotado = `maxUsable(stock, level, k)` (abierto +
     * `k` envases nuevos, sin superar el stock). El componente es agnóstico: solo lo aplica al `max` nativo.
     */
    max?: number;
    /** Piso del rango (default 0). RegistroModal pasa 1 porque el backend exige `usedPercent >= 1`. */
    min?: number;
    /** Texto del label asociado al input (default conserva el de EditRegistroModal). */
    label?: string;
    /**
     * Valor "vivo" (típicamente el `watch()` del formulario dueño) para resincronizar el label numérico
     * cuando el campo cambia por una vía distinta al `onChange` del slider (p.ej. `setValue` al recortar
     * por un tope menor). El input sigue no controlado (defaultValue + register).
     */
    value?: number;
    /** Nombre accesible del input (p.ej. incluye el producto: "% usado de Shampoo"); por defecto se usa el label visible. */
    ariaLabel?: string;
}

/**
 * Slider de "% usado en esta visita" para un item de `productsUsed`. Presentacional (sin estado de
 * formulario ni mutation); reusado por RegistroModal y EditRegistroModal.
 *
 * El label numérico usa un `useState` local sincronizado en `onChange` (no `watch()`, para evitar el lint
 * `react-hooks/incompatible-library`) y se acota en CADA render a `[min, max]` — sin `useEffect` +
 * `setState` (lint `react-hooks/set-state-in-effect`): si el tope baja, el `<input type="range">`
 * nativo recorta su valor sin emitir `onChange`, y el clamp de render mantiene el label coherente.
 * El formulario dueño es responsable de recortar también el valor enviado (ver onSubmit).
 */
export default function RemainingLevelSlider({ defaultValue, registration, onTouched, max, min = 0, label = '% usado en esta visita (opcional)', value, ariaLabel }: Props) {
    const hasInitialValue = typeof defaultValue === 'number' && !Number.isNaN(defaultValue);
    const effectiveMax = typeof max === 'number' && !Number.isNaN(max) ? max : 100;
    const clamp = (n: number) => Math.max(min, Math.min(n, effectiveMax));
    const initialValue = clamp(hasInitialValue ? defaultValue : 100);
    const [displayValue, setDisplayValue] = useState<number>(initialValue);
    const shownValue = clamp(typeof value === 'number' && !Number.isNaN(value) ? value : displayValue);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <label htmlFor={`${registration.name}-range`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                {label}
            </label>
            <div className="flex items-center gap-3 flex-1">
                <input
                    id={`${registration.name}-range`}
                    type="range"
                    min={min}
                    max={effectiveMax}
                    aria-label={ariaLabel}
                    // defaultValue (no value): input no controlado (patrón `register` de RHF).
                    defaultValue={initialValue}
                    className="flex-1 cursor-pointer accent-primary"
                    {...registration}
                    onChange={(e) => {
                        registration.onChange(e);
                        setDisplayValue(Number(e.target.value));
                        onTouched?.();
                    }}
                />
                <span className="text-xs font-semibold text-gray-600 w-12 text-right shrink-0">
                    {shownValue}%
                </span>
            </div>
        </div>
    );
}
