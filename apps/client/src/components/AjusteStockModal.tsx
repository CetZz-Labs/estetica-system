import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiArrowDownRight, FiArrowUpRight, FiActivity } from "react-icons/fi";

import { adjustStock } from "../api/productApi";
import { handleApiError } from "../api/errorHandler";
import type { Product } from "../types";
import Modal from "./ui/Modal";

interface AjusteStockFormData {
    type: 'add' | 'subtract';
    amount: number;
    reason?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export default function AjusteStockModal({ isOpen, onClose, product }: Props) {

    const queryClient = useQueryClient();

    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<AjusteStockFormData>({
        defaultValues: { type: 'add', amount: 1, reason: '' }
    });

    const type = useWatch({ control, name: 'type' });
    const amount = useWatch({ control, name: 'amount' });

    useEffect(() => {
        if (isOpen) {
            reset({ type: 'add', amount: 1, reason: '' });
        }
    }, [isOpen, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: AjusteStockFormData) => {
            if (!product) throw new Error("No hay producto seleccionado");
            const quantity = data.type === 'add' ? data.amount : -Math.abs(data.amount);
            return adjustStock(product._id, { quantity, reason: data.reason });
        },
        onSuccess: () => {
            toast.success('Stock actualizado exitosamente', {
                style: { background: '#EEF0E6', color: '#71774F', borderColor: '#8C9178' }
            });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            onClose();
        },
        onError: (error) => handleApiError(error, 'Error al actualizar el stock')
    });

    const onSubmit = (data: AjusteStockFormData) => {
        if (!product) return;
        if (data.type === 'subtract' && product.stock - data.amount < 0) {
            toast.error('La cantidad a restar no puede ser mayor al stock actual');
            return;
        }
        mutate(data);
    };

    if (!product) return null;

    const numericAmount = isNaN(amount) ? 0 : amount;
    const finalStock = type === 'add' ? product.stock + numericAmount : product.stock - numericAmount;
    const isInvalidStock = finalStock < 0;

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-ctrl text-sm font-semibold text-muted hover:text-text transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                form="ajusteStockForm"
                type="submit"
                disabled={isPending || isInvalidStock}
                className="bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-ctrl text-sm font-semibold transition-opacity cursor-pointer"
            >
                {isPending ? 'Procesando...' : 'Confirmar Ajuste'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ajuste de Stock"
            subtitle={product.name}
            icon={<FiActivity />}
            footer={footer}
        >
            <div className="mb-6 flex items-center justify-between bg-surface-2 border border-border px-4 py-3 rounded-ctrl">
                <span className="text-sm font-medium text-muted">Stock Actual</span>
                <span className="text-xl font-serif text-text">{product.stock} <span className="text-sm font-sans text-muted font-normal">unidades</span></span>
            </div>

            <form id="ajusteStockForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-2 gap-3">
                    <label className={`relative flex flex-col items-center p-4 border rounded-ctrl cursor-pointer transition-colors ${type === 'add' ? 'border-sage bg-sage-bg' : 'border-border hover:border-[var(--dotted)] bg-surface'}`}>
                        <input type="radio" value="add" className="sr-only" {...register('type')} />
                        <FiArrowUpRight className={`text-2xl mb-1 ${type === 'add' ? 'text-sage-text' : 'text-muted'}`} aria-hidden />
                        <span className={`text-sm font-semibold ${type === 'add' ? 'text-sage-text' : 'text-text-2'}`}>Ingreso (+)</span>
                    </label>

                    <label className={`relative flex flex-col items-center p-4 border rounded-ctrl cursor-pointer transition-colors ${type === 'subtract' ? 'border-alert-text bg-alert-bg' : 'border-border hover:border-[var(--dotted)] bg-surface'}`}>
                        <input type="radio" value="subtract" className="sr-only" {...register('type')} />
                        <FiArrowDownRight className={`text-2xl mb-1 ${type === 'subtract' ? 'text-alert-text' : 'text-muted'}`} aria-hidden />
                        <span className={`text-sm font-semibold ${type === 'subtract' ? 'text-alert-text' : 'text-text-2'}`}>Egreso / Merma (-)</span>
                    </label>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Cantidad a mover *</label>
                        <input
                            type="number"
                            min="1"
                            className={`w-full px-3.5 py-3 bg-bg border rounded-ctrl focus:outline-none focus:border-accent-rose transition-colors text-lg font-medium text-center text-text ${errors.amount ? 'border-alert-text' : 'border-border'}`}
                            {...register('amount', {
                                valueAsNumber: true,
                                required: 'Requerido',
                                min: { value: 1, message: 'Debe ser al menos 1' }
                            })}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase flex justify-between">
                            Motivo <span className="text-muted font-normal normal-case">Opcional</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Compra a proveedor, Producto dañado..."
                            className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                            {...register('reason')}
                        />
                    </div>
                </div>

                <div className={`p-4 rounded-ctrl border flex justify-between items-center transition-colors ${isInvalidStock ? 'bg-alert-bg border-alert-text text-alert-text' : 'bg-surface-2 border-border text-text-2'}`}>
                    <span className="text-sm font-medium">Stock resultante proyectado:</span>
                    <span className={`text-xl font-bold ${isInvalidStock ? 'text-alert-text' : 'text-text'}`}>
                        {finalStock}
                    </span>
                </div>

            </form>
        </Modal>
    );
}