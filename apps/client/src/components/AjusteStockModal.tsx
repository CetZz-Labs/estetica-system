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
                style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
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
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                form="ajusteStockForm"
                type="submit"
                disabled={isPending || isInvalidStock}
                className="bg-maison-text hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
            <div className="mb-6 flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm">
                <span className="text-sm font-medium text-gray-500">Stock Actual</span>
                <span className="text-xl font-serif">{product.stock} <span className="text-sm font-sans text-gray-400 font-normal">unidades</span></span>
            </div>

            <form id="ajusteStockForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-2 gap-3">
                    <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${type === 'add' ? 'border-maison-primary bg-maison-primary/5 ring-1 ring-maison-primary' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        <input type="radio" value="add" className="sr-only" {...register('type')} />
                        <FiArrowUpRight className={`text-2xl mb-1 ${type === 'add' ? 'text-maison-primary' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${type === 'add' ? 'text-maison-primary' : 'text-gray-600'}`}>Ingreso (+)</span>
                    </label>

                    <label className={`relative flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${type === 'subtract' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        <input type="radio" value="subtract" className="sr-only" {...register('type')} />
                        <FiArrowDownRight className={`text-2xl mb-1 ${type === 'subtract' ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${type === 'subtract' ? 'text-red-600' : 'text-gray-600'}`}>Egreso / Merma (-)</span>
                    </label>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Cantidad a mover *</label>
                        <input
                            type="number"
                            min="1"
                            className={`w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-lg font-medium text-center ${errors.amount ? 'border-maison-red' : 'border-gray-200'}`}
                            {...register('amount', {
                                valueAsNumber: true,
                                required: 'Requerido',
                                min: { value: 1, message: 'Debe ser al menos 1' }
                            })}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                            Motivo <span className="text-gray-400 font-normal normal-case">Opcional</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Compra a proveedor, Producto dañado..."
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                            {...register('reason')}
                        />
                    </div>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${isInvalidStock ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <span className="text-sm font-medium">Stock resultante proyectado:</span>
                    <span className={`text-xl font-bold ${isInvalidStock ? 'text-red-600' : 'text-maison-text'}`}>
                        {finalStock}
                    </span>
                </div>

            </form>
        </Modal>
    );
}