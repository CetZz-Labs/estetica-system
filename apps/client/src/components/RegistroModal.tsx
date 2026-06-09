import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiBox } from "react-icons/fi";
import Select, { type StylesConfig } from "react-select"; // ⭐️ Importamos react-select

import { getProducts } from "../api/productApi";
import { getClients } from "../api/clientApi";
import { getServices } from "../api/serviceApi";
import { createServiceRecord, type ServiceRecordPayload } from "../api/serviceRecordApi";
import { handleApiError } from "../api/errorHandler";
import type { Product, Client, Service } from "../types";
import Modal from "./ui/Modal";

interface SelectOption {
    value: string;
    label: string;
    isDisabled?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    preselectedClientId?: string;
    preselectedServiceId?: string;
}

// ⭐️ Constante para estilar los React-Select para que coincidan con tu tema "Maison"
const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#FDFBF7', // bg-maison-bg
        borderColor: state.isFocused ? '#E5E7EB' : '#E5E7EB', // focus:ring-gray-200
        borderRadius: '0.75rem', // rounded-xl
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 2px #E5E7EB' : 'none',
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

export default function RegistroModal({ isOpen, onClose, preselectedClientId, preselectedServiceId }: Props) {
    const queryClient = useQueryClient();

    const { data: inventoryProducts } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => getProducts(),
        enabled: isOpen
    });

    const { data: clients } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: () => getClients(),
        enabled: isOpen
    });

    const { data: services } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: () => getServices(),
        enabled: isOpen
    });

    // ⭐️ Formateamos los datos para que react-select los entienda ({ label, value })
    const clientOptions = clients?.map(c => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })) || [];
    const serviceOptions = services?.map(s => ({ value: s._id, label: s.name })) || [];
    const productOptions = inventoryProducts?.map(p => ({
        value: p._id,
        label: `${p.name} (${p.brand}) - Stock: ${p.stock}`,
        isDisabled: p.stock === 0 // Deshabilitamos los que no tienen stock
    })) || [];

    // Estado para el selector independiente de Insumos
    const [selectedProductOption, setSelectedProductOption] = useState<{ value: string, label: string } | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState<number | ''>('');

    const { register, control, handleSubmit, formState: { errors }, reset } = useForm<ServiceRecordPayload>({
        defaultValues: {
            client: preselectedClientId || '',
            service: preselectedServiceId || '',
            serviceDate: new Date().toISOString().split('T')[0],
            notes: '',
            nextTouchupDate: '',
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
        if (isOpen) {
            reset({
                client: preselectedClientId || '',
                service: preselectedServiceId || '',
                serviceDate: new Date().toISOString().split('T')[0],
                notes: '',
                nextTouchupDate: '',
                productsUsed: []
            });
        }
    }, [isOpen, preselectedClientId, preselectedServiceId, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ServiceRecordPayload) => {
            const payload = { ...data };
            if (!payload.nextTouchupDate) delete payload.nextTouchupDate;
            return createServiceRecord(payload);
        },
        onSuccess: () => {
            toast.success('Servicio registrado. Stock actualizado.', {
                style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
            });
            queryClient.invalidateQueries({ queryKey: ['recent-movements'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-touchups'] });

            handleCloseModal();
        },
        onError: (error) => handleApiError(error, 'Error al registrar la visita')
    });

    const onSubmit = (data: ServiceRecordPayload) => mutate(data);

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
            <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                Cancelar
            </button>
            <button type="submit" form="registroForm" disabled={isPending} className="bg-maison-primary hover:bg-black disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm">
                {isPending ? 'Guardando...' : 'Guardar y Descontar Stock'}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleCloseModal} title="Registrar Visita" subtitle="Asentá el servicio y consumos del cliente." maxWidth="max-w-3xl" containerClassName="flex flex-col max-h-[90vh]" footer={footer}>
            <form id="registroForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* ⭐️ Selector Inteligente de Cliente */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Cliente *</label>
                        <Controller
                            name="client"
                            control={control}
                            rules={{ required: 'Seleccionar un cliente es obligatorio' }}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={clientOptions}
                                    placeholder="Buscar cliente..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el cliente"}
                                    value={clientOptions.find(c => c.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {errors.client && <span className="text-[10px] text-maison-red">{errors.client.message}</span>}
                    </div>

                    {/* ⭐️ Selector Inteligente de Servicio */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Servicio *</label>
                        <Controller
                            name="service"
                            control={control}
                            rules={{ required: 'Seleccionar un servicio es obligatorio' }}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    options={serviceOptions}
                                    placeholder="Buscar servicio..."
                                    styles={selectStyles}
                                    noOptionsMessage={() => "No se encontró el servicio"}
                                    value={serviceOptions.find(s => s.value === field.value) || null}
                                    onChange={(val) => field.onChange(val?.value)}
                                />
                            )}
                        />
                        {errors.service && <span className="text-[10px] text-maison-red">{errors.service.message}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Fecha del Servicio *</label>
                        <input type="date" className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.serviceDate ? 'border-maison-red' : 'border-maison-border'}`} {...register('serviceDate', { required: 'Requerido' })} />
                    </div>
                    <div className="flex flex-col gap-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200 md:-mt-2">
                        <label className="text-[11px] font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Próximo Retoque <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <input type="date" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" {...register('nextTouchupDate')} />
                    </div>
                </div>

                <div className="border border-maison-border rounded-xl p-5 bg-white">
                    <h3 className="text-sm font-semibold text-maison-text mb-4 flex items-center gap-2"><FiBox className="text-gray-400" /> Insumos Consumidos (Stock)</h3>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        {/* ⭐️ Selector Inteligente de Insumos (No usa Controller porque es independiente del form principal) */}
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
                            <input type="number" min="1" placeholder="Cant." className="flex-1 sm:w-24 px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" value={quantityToAdd} onChange={(e) => setQuantityToAdd(e.target.value ? Number(e.target.value) : '')} />
                            <button type="button" onClick={handleAddProduct} disabled={!selectedProductOption || !quantityToAdd} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shrink-0"><FiPlus /></button>
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
                    <textarea rows={2} placeholder="Ej: Fórmula del color, observaciones del cabello..." className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none" {...register('notes')} />
                </div>
            </form>
        </Modal>
    );
}