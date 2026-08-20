import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiBox, FiUser, FiCalendar } from "react-icons/fi";
import Select, { type StylesConfig } from "react-select";

import { getProducts } from "../api/productApi";
import { updateServiceRecord } from "../api/serviceRecordApi";
import { handleApiError } from "../api/errorHandler";
import type { Product, ServiceRecord } from "../types";
import { formatCalendarDate } from "../utils/dates";
import Modal from "./ui/Modal";

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
    productsUsed: { product: string; quantity: number }[];
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

    const { data: inventoryProducts } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => getProducts(),
        enabled: isOpen
    });

    const productOptions = inventoryProducts?.map(p => ({
        value: p._id,
        label: `${p.name} (${p.brand}) - Stock: ${p.stock}`,
        isDisabled: p.stock === 0
    })) || [];

    // Estado para el selector independiente de Insumos (fuera del form, igual que RegistroModal.tsx).
    const [selectedProductOption, setSelectedProductOption] = useState<{ value: string, label: string } | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');

    const { register, control, handleSubmit, reset } = useForm<EditRegistroFormValues>({
        defaultValues: {
            notes: '',
            productsUsed: []
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "productsUsed" });

    const handleCloseModal = () => {
        setSelectedProductOption(null);
        setQuantityToAdd('');
        onClose();
    };

    useEffect(() => {
        if (isOpen && record) {
            reset({
                notes: record.notes || '',
                productsUsed: (record.productsUsed || []).map(p => ({
                    product: typeof p.product === 'object' && p.product !== null ? p.product._id : p.product,
                    quantity: p.quantity
                }))
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
        append({ product: selectedProductOption.value, quantity: Number(quantityToAdd) });
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
                            <Select
                                options={productOptions}
                                placeholder="Buscar insumo..."
                                styles={selectStyles}
                                noOptionsMessage={() => "Insumo no encontrado o sin stock"}
                                value={selectedProductOption}
                                onChange={(val) => setSelectedProductOption(val as { value: string, label: string } | null)}
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
                                const det = inventoryProducts?.find(p => p._id === field.product);
                                return (
                                    <li key={field.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-700">{det?.name || 'Insumo'}</span>
                                            <span className="text-xs text-gray-500">{field.quantity} unidades/ml</span>
                                        </div>
                                        <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><FiTrash2 size={16} /></button>
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
