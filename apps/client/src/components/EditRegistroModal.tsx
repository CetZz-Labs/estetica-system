import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiBox, FiUser, FiCalendar } from "react-icons/fi";
import type { StylesConfig } from "react-select";

import { getProductOptions, type ProductOption } from "../api/productApi";
import { updateServiceRecord } from "../api/serviceRecordApi";
import { handleApiError } from "../api/errorHandler";
import type { ServiceRecord } from "../types";
import { formatCalendarDate } from "../utils/dates";
import Modal from "./ui/Modal";
import RemainingLevelSlider from "./ui/RemainingLevelSlider";
import ProductAsyncSelect, { type ProductSelectOption } from "./ui/ProductAsyncSelect";

interface SelectOption {
    value: string;
    label: string;
    isDisabled?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    record: ServiceRecord | null;
}

interface EditRegistroFormValues {
    notes: string;
    /**
     * `usedPercent`/`usedPercentTouched` son campos internos del formulario (nunca viajan tal cual a
     * la API): la barra representa "% usado en esta visita" (UX-88), no el `remainingLevel` que
     * espera el backend. `usedPercentTouched` distingue "el usuario movió el slider" de "el input
     * <range> nunca tocado, en 0 por defecto en el DOM" para no enviar un dato falso (fix UX-81). Se
     * limpia al construir el payload de `updateServiceRecord`, donde se recalcula `remainingLevel`.
     * Para items con dato histórico, `reset()` hace el cálculo INVERSO (`usedPercent = available -
     * remainingLevel guardado`) y precarga `usedPercentTouched: true`, así se re-envía el valor
     * original aunque no se vuelva a tocar el slider en esta edición.
     */
    productsUsed: { product: string; quantity: number; usedPercent?: number; usedPercentTouched?: boolean; usedExistingUnit?: boolean }[];
}

// Mismo estilo "Maison" que RegistroModal.tsx para mantener consistencia visual entre modales.
const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#fff9f6',
        borderColor: state.isFocused ? '#80a890' : '#E5E7EB',
        borderRadius: '0.5rem',
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 2px #80a890' : 'none',
        '&:hover': {
            borderColor: '#D1D5DB'
        }
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#111827' : state.isFocused ? '#F3F4F6' : 'white',
        color: state.isSelected ? 'white' : '#374151',
        cursor: 'pointer'
    })
};

export default function EditRegistroModal({ isOpen, onClose, record }: Props) {
    const queryClient = useQueryClient();

    // Ids de los insumos ya registrados en la visita: se resuelven en UNA query (max 50, tope del
    // backend) para conocer currentUnitLevel (checkbox de envase abierto y max del slider).
    const recordProductIds = useMemo(() => {
        if (!record) return [] as string[];
        const ids = (record.productsUsed || []).map(p =>
            typeof p.product === 'object' && p.product !== null ? p.product._id : p.product
        );
        return Array.from(new Set(ids)).slice(0, 50);
    }, [record]);

    const { data: resolvedOptions } = useQuery<ProductOption[]>({
        queryKey: ['products', 'options', 'ids', recordProductIds],
        queryFn: () => getProductOptions({ ids: recordProductIds }),
        enabled: isOpen && recordProductIds.length > 0
    });

    // Estado para el selector independiente de Insumos (fuera del form, igual que RegistroModal.tsx).
    const [selectedProductOption, setSelectedProductOption] = useState<ProductSelectOption | null>(null);
    // Insumos agregados en esta sesion de edicion (datos de UI; no viajan a la API).
    const [addedInfo, setAddedInfo] = useState<Record<string, ProductOption>>({});

    const productInfo = useMemo(() => {
        const map: Record<string, ProductOption> = {};
        (resolvedOptions || []).forEach(p => { map[p._id] = p; });
        return { ...map, ...addedInfo };
    }, [resolvedOptions, addedInfo]);
    const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');

    const { register, control, handleSubmit, reset, setValue, watch } = useForm<EditRegistroFormValues>({
        defaultValues: {
            notes: '',
            productsUsed: []
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "productsUsed" });

    const handleCloseModal = () => {
        setSelectedProductOption(null);
        setQuantityToAdd('');
        setAddedInfo({});
        onClose();
    };

    useEffect(() => {
        if (isOpen && record) {
            const resolvedMap: Record<string, ProductOption> = {};
            (resolvedOptions || []).forEach(p => { resolvedMap[p._id] = p; });
            reset({
                notes: record.notes || '',
                // Cálculo INVERSO (UX-88): el `remainingLevel` guardado (% que queda) se convierte de
                // vuelta a "% usado" para precargar la barra, con la misma fórmula de `available` que
                // usa el onSubmit — así un submit sin tocar el slider recalcula el mismo remainingLevel
                // original (round-trip sin corromper el dato).
                productsUsed: (record.productsUsed || []).map(p => {
                    const productId = typeof p.product === 'object' && p.product !== null ? p.product._id : p.product;
                    const det = resolvedMap[productId];
                    const available = p.usedExistingUnit === true ? (det?.currentUnitLevel ?? 100) : 100;
                    const usedPercent = typeof p.remainingLevel === 'number'
                        ? Math.max(0, Math.min(100, available - p.remainingLevel))
                        : undefined;
                    return {
                        product: productId,
                        quantity: p.quantity,
                        usedExistingUnit: p.usedExistingUnit ?? false,
                        ...(typeof usedPercent === 'number' ? { usedPercent, usedPercentTouched: true } : {}),
                    };
                })
            });
        }
    }, [isOpen, record, reset, resolvedOptions]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: EditRegistroFormValues) => updateServiceRecord(record!._id, {
            notes: data.notes,
            // La barra pide "% usado en esta visita" (UX-88); el backend sigue esperando
            // `remainingLevel` (% que queda). Convertimos acá, justo antes de armar el payload, con la
            // misma fórmula que el reset() inverso de arriba. Omitimos la clave si el usuario no tocó
            // el slider en esta edición (fix UX-81): los items con dato histórico llegan con
            // usedPercentTouched: true desde el reset(), así que su valor original se sigue reenviando.
            productsUsed: data.productsUsed.map(({ usedPercentTouched, usedPercent, ...item }) => {
                const det = productInfo[item.product];
                const available = item.usedExistingUnit === true
                    ? (det?.currentUnitLevel ?? 100)
                    : 100;
                const remainingLevel = usedPercentTouched && typeof usedPercent === 'number'
                    ? Math.max(0, Math.min(100, available - usedPercent))
                    : undefined;
                return {
                    ...item,
                    ...(remainingLevel !== undefined ? { remainingLevel } : {}),
                };
            })
        }),
        onSuccess: () => {
            toast.success('Visita actualizada. Stock reconciliado.');
            queryClient.invalidateQueries({ queryKey: ['service-records'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCloseModal();
        },
        onError: (error) => handleApiError(error, 'Error al actualizar la visita')
    });

    const onSubmit = (data: EditRegistroFormValues) => {
        if (!record) return;
        mutate(data);
    };

    const handleAddProduct = () => {
        if (!selectedProductOption || !quantityToAdd) return;

        if (fields.some(f => f.product === selectedProductOption.value)) {
            toast.error('Este insumo ya está en la lista. Eliminalo y agregalo con la cantidad total.');
            return;
        }
        setAddedInfo(prev => ({ ...prev, [selectedProductOption.value]: selectedProductOption.product }));
        append({ product: selectedProductOption.value, quantity: Number(quantityToAdd), usedExistingUnit: false });
        setSelectedProductOption(null);
        setQuantityToAdd('');
    };

    const footer = (
        <>
            <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                Cancelar
            </button>
            <button type="submit" form="editRegistroForm" disabled={isPending} className="bg-primary hover:bg-accent hover:text-accent-foreground disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm">
                {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </>
    );

    if (!record) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleCloseModal} title="Editar Visita" subtitle="Ajustá notas e insumos consumidos. El stock se reconcilia automáticamente." maxWidth="max-w-3xl" containerClassName="flex flex-col max-h-[90vh]" footer={footer}>
            <form id="editRegistroForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Datos de solo lectura: el backend no acepta editar cliente/servicio/fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Cliente</span>
                        <span className="flex items-center gap-1.5 text-sm text-gray-700">
                            <FiUser className="text-gray-400 shrink-0" aria-hidden />
                            {`${record.client.firstName} ${record.client.lastName ?? ''}`.trim()}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Servicio</span>
                        <span className="text-sm text-gray-700">{record.service.name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Fecha</span>
                        <span className="flex items-center gap-1.5 text-sm text-gray-700">
                            <FiCalendar className="text-gray-400 shrink-0" aria-hidden />
                            {formatCalendarDate(record.serviceDate)}
                        </span>
                    </div>
                </div>

                <div className="border border-border rounded-lg p-5 bg-white">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FiBox className="text-gray-400" /> Insumos Consumidos (Stock)</h3>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="w-full sm:flex-1">
                            <ProductAsyncSelect
                                styles={selectStyles as unknown as StylesConfig<ProductSelectOption, false>}
                                value={selectedProductOption}
                                onChange={setSelectedProductOption}
                            />
                        </div>

                        <div className="flex gap-3">
                            <input type="number" min="1" placeholder="Cant." className="flex-1 sm:w-24 px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" value={quantityToAdd} onChange={(e) => setQuantityToAdd(e.target.value ? Number(e.target.value) : '')} />
                            <button type="button" onClick={handleAddProduct} disabled={!selectedProductOption || !quantityToAdd} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"><FiPlus /></button>
                        </div>
                    </div>

                    {fields.length > 0 ? (
                        <ul className="space-y-2">
                            {fields.map((field, index) => {
                                const det = productInfo[field.product];
                                // Rango dinámico del slider (UX-89): mismo criterio que RegistroModal.tsx —
                                // usa watch() (acepta el warning de lint react-hooks/incompatible-library,
                                // ya presente en otros 3 archivos del proyecto) para poder recortar el valor
                                // al tildar el checkbox sin dejar el slider en un estado inconsistente.
                                const watchedUsedPercent = watch(`productsUsed.${index}.usedPercent`);
                                const watchedUsedExistingUnit = watch(`productsUsed.${index}.usedExistingUnit`);
                                const maxUsable = watchedUsedExistingUnit === true && typeof det?.currentUnitLevel === 'number'
                                    ? det.currentUnitLevel
                                    : 100;
                                return (
                                    <li key={field.id} className="flex flex-col gap-2 py-2 px-3 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div className="flex justify-between items-center gap-2">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-sm font-medium text-gray-700">{det?.name || 'Insumo'}</span>
                                                <span className="text-xs text-gray-500">{field.quantity} unidades/ml</span>
                                            </div>
                                            <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><FiTrash2 size={16} /></button>
                                        </div>
                                        <RemainingLevelSlider
                                            defaultValue={field.usedPercent}
                                            registration={register(`productsUsed.${index}.usedPercent`, { valueAsNumber: true })}
                                            onTouched={() => setValue(`productsUsed.${index}.usedPercentTouched`, true)}
                                            max={maxUsable}
                                            value={watchedUsedPercent}
                                        />
                                        {typeof det?.currentUnitLevel === 'number' && (
                                            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={field.usedExistingUnit}
                                                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-gray-300 text-primary focus:ring-ring cursor-pointer accent-primary"
                                                    {...register(`productsUsed.${index}.usedExistingUnit`, {
                                                        onChange: (e) => {
                                                            // Al tildar, si el % usado ya cargado supera el nuevo tope
                                                            // disponible (det.currentUnitLevel), se recorta para no dejar
                                                            // el slider en un estado visualmente inconsistente (UX-89).
                                                            if (e.target.checked && typeof det?.currentUnitLevel === 'number'
                                                                && typeof watchedUsedPercent === 'number' && watchedUsedPercent > det.currentUnitLevel) {
                                                                setValue(`productsUsed.${index}.usedPercent`, det.currentUnitLevel);
                                                            }
                                                        },
                                                    })}
                                                />
                                                <span className="min-w-0">Usar el envase ya abierto (queda {det.currentUnitLevel}%) — no descuenta stock</span>
                                            </label>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">No se agregaron insumos a este servicio.</p>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                        Notas del Servicio <span className="text-gray-400 font-normal normal-case">Opcional</span>
                    </label>
                    <textarea rows={2} placeholder="Ej: Fórmula del color, observaciones del cabello..." className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none" {...register('notes')} />
                </div>
            </form>
        </Modal>
    );
}
