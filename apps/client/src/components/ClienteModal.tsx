import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiAlertCircle } from "react-icons/fi";

import { createClient, updateClient, type ClientFormData } from "../api/clientApi";
import { handleApiError } from "../api/errorHandler";
import type { Client } from "../types";
import Modal from "./ui/Modal";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clientToEdit?: Client | null;
}

export default function ClienteModal({ isOpen, onClose, clientToEdit }: Props) {

    const queryClient = useQueryClient();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<ClientFormData>({
        defaultValues: { firstName: '', lastName: '', phone: '', email: '', medicalNotes: '' }
    });

    useEffect(() => {
        if (clientToEdit && isOpen) {
            reset({
                firstName: clientToEdit.firstName,
                lastName: clientToEdit.lastName,
                phone: clientToEdit.phone || '',
                email: clientToEdit.email || '',
                medicalNotes: clientToEdit.medicalNotes || ''
            });
        } else if (isOpen) {
            reset({ firstName: '', lastName: '', phone: '', email: '', medicalNotes: '' });
        }
    }, [clientToEdit, isOpen, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ClientFormData) =>
            clientToEdit
                ? updateClient(clientToEdit._id, data)
                : createClient(data),
        onSuccess: () => {
            toast.success(clientToEdit ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            if (clientToEdit) {
                queryClient.invalidateQueries({ queryKey: ['client', clientToEdit._id] });
            }
            onClose();
        },
        onError: (error) => handleApiError(error, 'Error al guardar el cliente')
    });

    const onSubmit = (data: ClientFormData) => mutate(data);

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
                form="clienteForm"
                type="submit"
                disabled={isPending}
                className="bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-ctrl text-sm font-semibold transition-opacity cursor-pointer"
            >
                {isPending ? 'Guardando...' : 'Guardar Cliente'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            subtitle={clientToEdit ? 'Modificá los datos del perfil.' : 'Completá los datos del perfil.'}
            maxWidth="max-w-lg"
            footer={footer}
        >
            <form id="clienteForm" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Nombre *</label>
                        <input
                            type="text"
                            className={`w-full px-3.5 py-2.5 bg-bg border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors ${errors.firstName ? 'border-alert-text' : 'border-border'}`}
                            {...register('firstName', { required: 'Requerido' })}
                        />
                        {errors.firstName && (
                            <span className="flex items-center gap-1 text-xs text-alert-text mt-1 font-medium">
                                <FiAlertCircle /> {errors.firstName.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase flex justify-between">
                            Apellido <span className="text-muted font-normal normal-case">Opcional</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                            {...register('lastName')}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Teléfono</label>
                    <input
                        type="tel"
                        className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                        {...register('phone')}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase flex justify-between">
                        Email <span className="text-muted font-normal normal-case">Opcional</span>
                    </label>
                    <input
                        type="email"
                        className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                        {...register('email')}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase flex justify-between">
                        Notas Médicas <span className="text-muted font-normal normal-case">Opcional</span>
                    </label>
                    <textarea
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors resize-none"
                        {...register('medicalNotes')}
                    />
                </div>

            </form>
        </Modal>
    );
}