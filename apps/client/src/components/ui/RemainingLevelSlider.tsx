import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface Props {
    /** Valor inicial (0-100) al montar (desde el item ya cargado por `useFieldArray`/`reset()`); undefined si no hay dato aún. */
    defaultValue: number | undefined;
    /** Resultado de `register('productsUsed.${index}.usedPercent', { valueAsNumber: true })` del formulario dueño. */
    registration: UseFormRegisterReturn;
    /**
     * Notifica al formulario dueño que el usuario interactuó explícitamente con el slider (fix UX-81).
     * Un `<input type="range">` nativo siempre tiene un valor numérico en el DOM (nunca "vacío"), así
     * que el formulario dueño necesita esta señal aparte del valor en sí para distinguir "el usuario
     * informó 0%" de "nunca tocó el control" y así omitir el dato del payload en este último caso.
     */
    onTouched?: () => void;
    /**
     * Tope superior del rango (UX-89): `100` para un envase nuevo, o el % efectivamente disponible
     * (`currentUnitLevel`) cuando se reutiliza un envase ya abierto. El componente es agnóstico de la
     * razón del cambio — solo lo aplica al atributo `max` nativo del `<input type="range">`.
     */
    max?: number;
    /**
     * Valor "vivo" opcional (típicamente el mismo `watch()` que ya usa el formulario dueño para el
     * preview de "→ queda X%") para resincronizar el label numérico cuando el campo cambia por una vía
     * distinta al propio `onChange` del slider — p.ej. el recorte automático al tildar "usar envase
     * abierto" (UX-89), que el formulario dueño aplica vía `setValue`. El input en sí sigue siendo no
     * controlado (defaultValue + register); solo el label de texto se resincroniza con este prop.
     */
    value?: number;
}

/**
 * Slider opcional de "% usado en esta visita" para un item de `productsUsed`.
 * Puramente presentacional (no trae su propio estado de formulario ni mutation) — reusado por
 * RegistroModal.tsx y EditRegistroModal.tsx para no duplicar el mismo control dos veces (UX-81).
 * El componente en sí es genérico (0-100 o 0-max, touched flag) y no sabe nada de la fórmula de
 * "% restante" — esa conversión (`remainingLevel = available - usado`, clamp 0-100) vive en el
 * formulario dueño (UX-88), que decide qué representa el valor 0-100 antes de armar el payload.
 *
 * Gotcha: el label numérico se refleja con un `useState` local sincronizado a mano en el
 * `onChange` (en vez de `watch()` de react-hook-form) para no disparar el lint
 * `react-hooks/incompatible-library` en un archivo que hoy no usaba `watch()` — ver
 * impl_UX-81-frontend.md. El prop opcional `value` (UX-89) es la puerta para resincronizar el
 * label desde afuera cuando el formulario dueño recorta el valor vía `setValue` (p.ej. al tildar
 * "usar envase abierto" con un valor previo mayor al nuevo `max`): se prioriza como fuente de
 * verdad del label en cada render (no vía `useEffect` + `setState`, que dispara cascading renders
 * y el lint `react-hooks/set-state-in-effect`), cayendo al estado local si no se provee. El input
 * en sí sigue sin controlar (defaultValue + register); solo el label de texto usa este prop.
 *
 * Fix UX-89 (post-review): el label (`shownValue`) además se acota con `Math.min(..., effectiveMax)`
 * en cada render, sin depender de que el formulario dueño dispare un `setValue`. Cubre el item
 * recién agregado (nunca tocado, `value` prop `undefined`) que arranca en el default de 100% y cuyo
 * `max` baja al tildar "usar envase abierto": el navegador recorta el `<input type="range">` sin
 * emitir `onChange`, así que sin este clamp en el render el label quedaba desincronizado del `max`
 * vigente. El campo enviado en el submit no se ve afectado — sigue dependiendo únicamente de
 * `usedPercentTouched` (P19).
 */
export default function RemainingLevelSlider({ defaultValue, registration, onTouched, max, value }: Props) {
    const hasInitialValue = typeof defaultValue === 'number' && !Number.isNaN(defaultValue);
    const effectiveMax = typeof max === 'number' && !Number.isNaN(max) ? max : 100;
    // Arranca en 100% cuando no hay dato histórico (UX-89): lo habitual es consumir el producto
    // entero en la visita; el caso de excepción (sobró algo) es para lo que existe el slider, así
    // que se lo arrastra hacia abajo en vez de hacia arriba. Puramente visual — el flag
    // `usedPercentTouched` (P19, fix UX-81) sigue dependiendo únicamente de que el usuario
    // interactúe con el control, así que si nadie lo toca, `remainingLevel` sigue sin viajar en el
    // payload aunque la barra se vea en 100%. Se acota al `max` vigente al montar (ej. un envase
    // abierto con currentUnitLevel < 100 ya tildado) para no arrancar en una posición imposible.
    const initialValue = Math.min(hasInitialValue ? defaultValue : 100, effectiveMax);
    const [displayValue, setDisplayValue] = useState<number>(initialValue);
    // Fix UX-89 (review CHANGES_REQUESTED): el label se acota al `max` vigente en CADA render, no
    // solo cuando el formulario dueño dispara un `setValue` explícito. Cubre el caso donde un item
    // recién agregado (nunca tocado, `value` prop en `undefined` porque `watch()` no tiene dato)
    // arranca en el default visual de 100% y el usuario tilda "usar envase abierto" con un `max`
    // menor: el `<input type="range">` nativo recorta su valor interno silenciosamente (sin disparar
    // `onChange`) al bajar `max`, pero sin este `Math.min` el label seguiría leyendo el
    // `displayValue`/100 sin actualizar. Con el clamp acá, el label nunca puede superar `effectiveMax`
    // sin importar si el recorte vino del `value` prop (caso ya tocado, UX-89 original) o del
    // `displayValue` interno (caso nunca tocado). Cuando `max` vuelve a subir (checkbox destildado)
    // no hay recorte adicional: `Math.min` con un tope mayor nunca reduce el valor ya mostrado.
    const shownValue = Math.min(typeof value === 'number' && !Number.isNaN(value) ? value : displayValue, effectiveMax);

    return (
        <div className="flex items-center gap-3">
            <label htmlFor={`${registration.name}-range`} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                % usado en esta visita (opcional)
            </label>
            <input
                id={`${registration.name}-range`}
                type="range"
                min={0}
                max={effectiveMax}
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
            <span className="text-xs font-semibold text-gray-600 w-9 text-right shrink-0">
                {shownValue}%
            </span>
        </div>
    );
}
