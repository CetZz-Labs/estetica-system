import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiBox, FiUser, FiCalendar, FiInfo, FiAlertTriangle } from "react-icons/fi";
import Select, { type StylesConfig } from "react-select";

import { getProducts } from "../api/productApi";
import { updateServiceRecord } from "../api/serviceRecordApi";
import { handleApiError } from "../api/errorHandler";
import type { Product, ServiceRecord } from "../types";
import { formatCalendarDate } from "../utils/dates";
import { defaultUsed, effectiveUsed, formatStock, fromPool, openLevelOf, poolOf } from "../utils/stockPool";
import Modal from "./ui/Modal";
import RemainingLevelSlider from "./ui/RemainingLevelSlider";

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
     * UX-90 (Opción A): `usedPercent` es el TOTAL de puntos consumidos por el item (100 = un envase) y
     * es lo único que viaja al server por insumo (quantity/remainingLevel/usedExistingUnit los deriva él).
     * El server reconcilia por delta contra el consumo previo del registro, así que se precarga el
     * `usedPercent` guardado (legacy: estimado con `effectiveUsed`) y reenviarlo intacto = delta 0.
     */
    productsUsed: { product: string; usedPercent: number }[];
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

    const { data: inventoryProducts, isLoading: isLoadingProducts, isError: isProductsError } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => getProducts(),
        enabled: isOpen
    });

    const productOptions = inventoryProducts?.map(p => ({
        value: p._id,
        label: `${p.name} (${p.brand}) - Stock: ${formatStock(p.stock, p.currentUnitLevel)}`,
        // Opción A: solo sin cerrados NI abierto (stock 0 con abierto es utilizable).
        isDisabled: p.stock < 1 && openLevelOf(p.currentUnitLevel) === undefined
    })) || [];

    // Consumo previo (puntos) por producto y productos sin dato `usedPercent` (registro legacy).
    // El server suma los items repetidos del mismo producto, por eso se acumula acá también.
    const { oldEffByProduct, legacyProducts } = useMemo(() => {
        const old = new Map<string, number>();
        const legacy = new Set<string>();
        (record?.productsUsed || []).forEach(p => {
            const id = typeof p.product === 'object' && p.product !== null ? p.product._id : p.product;
            old.set(id, (old.get(id) ?? 0) + effectiveUsed(p));
            if (typeof p.usedPercent !== 'number') legacy.add(id);
        });
        return { oldEffByProduct: old, legacyProducts: legacy };
    }, [record]);

    // Pool contra el que valida el server al editar: disponible hoy + lo que este registro ya había consumido.
    // Producto no cargado en el inventario (p.ej. dado de baja): solo se conoce lo previamente consumido.
    const basePoolOf = (productId: string): number => {
        const det = inventoryProducts?.find(p => p._id === productId);
        const old = oldEffByProduct.get(productId) ?? 0;
        return det ? poolOf(det.stock, det.currentUnitLevel) + old : Math.max(old, 1);
    };

    // Estado para el selector independiente de Insumos (fuera del form, igual que RegistroModal.tsx).
    const [selectedProductOption, setSelectedProductOption] = useState<{ value: string, label: string } | null>(null);

    const { register, control, handleSubmit, reset, watch, getValues } = useForm<EditRegistroFormValues>({
        defaultValues: {
            notes: '',
            productsUsed: []
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "productsUsed" });

    const handleCloseModal = () => {
        setSelectedProductOption(null);
        onClose();
    };

    useEffect(() => {
        if (isOpen && record) {
            reset({
                notes: record.notes || '',
                // Se precarga el consumo previo de cada item (mínimo 1: el server exige entero >= 1).
                productsUsed: (record.productsUsed || []).map(p => {
                    const productId = typeof p.product === 'object' && p.product !== null ? p.product._id : p.product;
                    return { product: productId, usedPercent: Math.max(1, effectiveUsed(p)) };
                })
            });
        }
    }, [isOpen, record, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: EditRegistroFormValues) => updateServiceRecord(record!._id, {
            notes: data.notes,
            productsUsed: data.productsUsed
        }),
        onSuccess: () => {
            toast.success('Visita actualizada. Stock reconciliado.');
            queryClient.invalidateQueries({ queryKey: ['service-records'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCloseModal();
        },
        // 409 (el stock cambió mientras se guardaba) llega con mensaje del server: lo muestra el toast, sin duplicar inline.
        onError: (error) => handleApiError(error, 'Error al actualizar la visita')
    });

    const onSubmit = (data: EditRegistroFormValues) => {
        if (!record) return;
        // Se envía `{ product, usedPercent }` entero, >= 1 y recortado al tope vigente (defensa ante tope que bajó).
        mutate({
            notes: data.notes,
            productsUsed: data.productsUsed.map(({ product, usedPercent }) => {
                const raw = Number.isFinite(usedPercent) ? Math.round(usedPercent) : 1;
                return { product, usedPercent: Math.max(1, Math.min(raw, basePoolOf(product))) };
            })
        });
    };

    const handleAddProduct = () => {
        if (!selectedProductOption) return;

        if (fields.some(f => f.product === selectedProductOption.value)) {
            toast.error('Este insumo ya está en la lista. Ajustá su barra de consumo.');
            return;
        }
        const det = inventoryProducts?.find(p => p._id === selectedProductOption.value);
        append({
            product: selectedProductOption.value,
            usedPercent: Math.min(defaultUsed(det?.currentUnitLevel), Math.max(1, basePoolOf(selectedProductOption.value))),
        });
        setSelectedProductOption(null);
    };

    const footer = (
        <>
            <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                Cancelar
            </button>
            <button type="submit" form="editRegistroForm" disabled={isPending} className="bg-primary hover:bg-accent hover:text-accent-foreground disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm">
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
                            <Select
                                options={productOptions}
                                placeholder="Buscar insumo..."
                                styles={selectStyles}
                                noOptionsMessage={() => "Insumo no encontrado"}
                                value={selectedProductOption}
                                onChange={(val) => setSelectedProductOption(val as { value: string, label: string } | null)}
                            />
                        </div>
                        <button type="button" onClick={handleAddProduct} disabled={!selectedProductOption} aria-label="Agregar insumo" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"><FiPlus /></button>
                    </div>

                    {isLoadingProducts ? (
                        <div className="space-y-2" aria-busy="true">
                            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    ) : isProductsError ? (
                        <p className="flex items-center justify-center gap-1.5 text-xs text-destructive py-3 bg-red-50 rounded-lg border border-red-100">
                            <FiAlertTriangle aria-hidden /> No se pudo cargar el inventario. Cerrá y volvé a abrir la edición.
                        </p>
                    ) : fields.length > 0 ? (
                        <ul className="space-y-2">
                            {fields.map((field, index) => {
                                const det = inventoryProducts?.find(p => p._id === field.product);
                                const base = basePoolOf(field.product);
                                const watchedUsed = watch(`productsUsed.${index}.usedPercent`);
                                const current = Number(getValues(`productsUsed.${index}.usedPercent`));
                                const usedNow = Math.max(1, Math.min(Number.isFinite(watchedUsed) ? watchedUsed : current, base));
                                const after = fromPool(base - usedNow);
                                return (
                                    <li key={field.id} className="flex flex-col gap-3 py-3 px-3 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-gray-700">{det?.name || 'Insumo'}</span>
                                                {det && <span className="text-xs text-gray-500">Stock actual: {formatStock(det.stock, det.currentUnitLevel)}</span>}
                                            </div>
                                            <button type="button" aria-label={`Quitar ${det?.name || 'insumo'}`} onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><FiTrash2 size={16} /></button>
                                        </div>
                                        <RemainingLevelSlider
                                            label="% usado en esta visita"
                                            ariaLabel={`% usado de ${det?.name || 'insumo'} en esta visita`}
                                            defaultValue={field.usedPercent}
                                            registration={register(`productsUsed.${index}.usedPercent`, { valueAsNumber: true })}
                                            min={1}
                                            max={base}
                                            value={watchedUsed}
                                        />
                                        <p aria-live="polite" className="flex items-start gap-1.5 text-xs text-gray-600">
                                            <FiInfo className="shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                                            <span className="min-w-0 break-words">
                                                Stock tras guardar: {formatStock(after.stock, after.level)}.
                                                {legacyProducts.has(field.product) && ' Esta visita es anterior al modelo de % usado: el consumo original es una estimación, revisalo.'}
                                            </span>
                                        </p>
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
