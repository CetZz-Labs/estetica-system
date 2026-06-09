import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiAlertCircle, FiInfo } from "react-icons/fi";

import { createProduct, updateProduct, type ProductFormData } from "../api/productApi";
import { handleApiError } from "../api/errorHandler";
import type { Product } from "../types";
import Modal from "./ui/Modal";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: Product | null;
}

export default function ProductoModal({ isOpen, onClose, productToEdit }: Props) {

    const queryClient = useQueryClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<ProductFormData>({
        defaultValues: { name: '', brand: '', stock: 0, description: '' }
    });

    useEffect(() => {
        if (productToEdit && isOpen) {
            reset({ name: productToEdit.name, brand: productToEdit.brand, description: productToEdit.description || '' });
        } else if (isOpen) {
            reset({ name: '', brand: '', stock: 0, description: '' });
        }
    }, [productToEdit, isOpen, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ProductFormData) => {
            if (productToEdit) {
                const { stock, ...updateData } = data;
                return updateProduct(productToEdit._id, updateData);
            }
            return createProduct(data);
        },
        onSuccess: () => {
            toast.success(productToEdit ? 'Producto actualizado exitosamente' : 'Producto registrado exitosamente', {
                style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
            });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            onClose();
        },
        onError: (error) => handleApiError(error, 'Error al guardar el producto')
    });

    const onSubmit = (data: ProductFormData) => mutate(data);

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
                form="productoForm"
                type="submit"
                disabled={isPending}
                className="bg-maison-primary hover:bg-black disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
                {isPending ? 'Guardando...' : (productToEdit ? 'Guardar Cambios' : 'Crear Producto')}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
            subtitle={productToEdit ? 'Modificá los detalles del insumo.' : 'Agregá un nuevo insumo al inventario.'}
            maxWidth="max-w-lg"
            footer={footer}
        >
            <form id="productoForm" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nombre del Producto *</label>
                    <input
                        type="text"
                        placeholder="Ej: Oxidante 20 Vol..."
                        className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.name ? 'border-maison-red' : 'border-maison-border'}`}
                        {...register('name', {
                            required: 'El nombre es requerido',
                            validate: (value) => value.trim() !== '' || 'No puede estar vacío'
                        })}
                    />
                    {errors.name && (
                        <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                            <FiAlertCircle /> {errors.name.message}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Marca *</label>
                        <input
                            type="text"
                            placeholder="Ej: Wella, Olaplex..."
                            className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.brand ? 'border-maison-red' : 'border-maison-border'}`}
                            {...register('brand', {
                                required: 'La marca es requerida',
                                validate: (value) => value.trim() !== '' || 'No puede estar vacío'
                            })}
                        />
                        {errors.brand && (
                            <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                <FiAlertCircle /> {errors.brand.message}
                            </span>
                        )}
                    </div>

                    {!productToEdit && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Stock Inicial *</label>
                            <input
                                type="number"
                                min="0"
                                className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 ${errors.stock ? 'border-maison-red' : 'border-maison-border'}`}
                                {...register('stock', {
                                    required: 'Requerido',
                                    min: { value: 0, message: 'No puede ser negativo' }
                                })}
                            />
                            {errors.stock && (
                                <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                    <FiAlertCircle /> {errors.stock.message}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {productToEdit && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-blue-700 text-xs">
                        <FiInfo className="text-blue-500 mt-0.5 shrink-0" size={14} />
                        <p>Para modificar la cantidad en stock, utilizá el botón <strong>"Ajustar Stock"</strong> desde la tabla principal del inventario.</p>
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                        Descripción <span className="text-gray-400 font-normal normal-case">Opcional</span>
                    </label>
                    <textarea
                        rows={2}
                        placeholder="Detalles extra del producto..."
                        className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                        {...register('description')}
                    />
                </div>

            </form>
        </Modal>
    );
}