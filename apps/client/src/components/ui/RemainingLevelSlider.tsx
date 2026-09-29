import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface Props {
    /** Valor inicial (0-100) al montar (desde el item ya cargado por `useFieldArray`/`reset()`); undefined si no hay dato aún. */
    defaultValue: number | undefined;
    /** Resultado de `register('productsUsed.${index}.remainingLevel', { valueAsNumber: true })` del formulario dueño. */
    registration: UseFormRegisterReturn;
    /**
     * Notifica al formulario dueño que el usuario interactuó explícitamente con el slider (fix UX-81).
     * Un `<input type="range">` nativo siempre tiene un valor numérico en el DOM (nunca "vacío"), así
     * que el formulario dueño necesita esta señal aparte del valor en sí para distinguir "el usuario
     * informó 0%" de "nunca tocó el control" y así omitir `remainingLevel` del payload en este último caso.
     */
    onTouched?: () => void;
}

/**
 * Slider opcional de "% restante estimado del envase" para un item de `productsUsed`.
 * Puramente presentacional (no trae su propio estado de formulario ni mutation) — reusado por
 * RegistroModal.tsx y EditRegistroModal.tsx para no duplicar el mismo control dos veces (UX-81).
 *
 * Gotcha: el label numérico se refleja con un `useState` local sincronizado a mano en el
 * `onChange` (en vez de `watch()` de react-hook-form) para no disparar el lint
 * `react-hooks/incompatible-library` en un archivo que hoy no usaba `watch()` — ver
 * impl_UX-81-frontend.md.
 */
export default function RemainingLevelSlider({ defaultValue, registration, onTouched }: Props) {
    const hasInitialValue = typeof defaultValue === 'number' && !Number.isNaN(defaultValue);
    const [displayValue, setDisplayValue] = useState<number | undefined>(hasInitialValue ? defaultValue : undefined);

    return (
        <div className="flex items-center gap-3">
            <label htmlFor={`${registration.name}-range`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                % restante estimado (opcional)
            </label>
            <input
                id={`${registration.name}-range`}
                type="range"
                min={0}
                max={100}
                // defaultValue (no value): input no controlado (patrón `register` de RHF).
                defaultValue={hasInitialValue ? defaultValue : 0}
                className="flex-1 cursor-pointer accent-primary"
                {...registration}
                onChange={(e) => {
                    registration.onChange(e);
                    setDisplayValue(Number(e.target.value));
                    onTouched?.();
                }}
            />
            <span className="text-xs font-semibold text-gray-600 w-9 text-right shrink-0">
                {typeof displayValue === 'number' ? `${displayValue}%` : '—'}
            </span>
        </div>
    );
}
