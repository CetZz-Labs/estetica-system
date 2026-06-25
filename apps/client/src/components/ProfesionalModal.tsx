import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FiAlertCircle } from 'react-icons/fi';

import {
    createProfessional,
    updateProfessional,
    getLinkableAdmins,
    type ProfessionalFormData,
    type LinkableAdmin,
} from '../api/professionalApi';
import { handleApiError } from '../api/errorHandler';
import type { Professional } from '../types';
import Modal from './ui/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    professionalToEdit?: Professional | null;
}

const PRESET_COLORS = ['#1A1A1A', '#54A885', '#E5A059', '#E06B5E', '#6366F1', '#0EA5E9', '#A855F7', '#EC4899'];

export default function ProfesionalModal({ isOpen, onClose, professionalToEdit }: Props) {
    const queryClient = useQueryClient();

    const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProfessionalFormData>({
        defaultValues: { name: '', color: '#1A1A1A', linkedAdmin: '' },
    });

    const { data: linkableAdmins } = useQuery<LinkableAdmin[]>({
        queryKey: ['linkable-admins'],
        queryFn: getLinkableAdmins,
        enabled: isOpen,
    });

    useEffect(() => {
        if (professionalToEdit && isOpen) {
            reset({
                name: professionalToEdit.name,
                color: professionalToEdit.color || '#1A1A1A',
                linkedAdmin: professionalToEdit.linkedAdmin || '',
            });
        } else if (isOpen) {
            reset({ name: '', color: '#1A1A1A', linkedAdmin: '' });
        }
    }, [professionalToEdit, isOpen, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: ProfessionalFormData) => {
            const payload: ProfessionalFormData = {
                name: data.name,
                color: data.color,
                ...(data.linkedAdmin ? { linkedAdmin: data.linkedAdmin } : {}),
            };
            return professionalToEdit
                ? updateProfessional(professionalToEdit._id, payload)
                : createProfessional(payload);
        },
        onSuccess: () => {
            toast.success(professionalToEdit ? 'Profesional actualizada' : 'Profesional creada exitosamente');
            queryClient.invalidateQueries({ queryKey: ['professionals'] });
            onClose();
        },
        onError: (error) => handleApiError(error, 'Error al guardar la profesional'),
    });

    const onSubmit = (data: ProfessionalFormData) => mutate(data);

    const selectedColor = watch('color');

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
                form="profesionalForm"
                type="submit"
                disabled={isPending}
                className="bg-maison-primary hover:bg-black disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
                {isPending ? 'Guardando...' : 'Guardar'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={professionalToEdit ? 'Editar Profesional' : 'Nueva Profesional'}
            footer={footer}
        >
            <form id="profesionalForm" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nombre *</label>
                    <input
                        type="text"
                        placeholder="Ej. Camila Rossi"
                        className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 ${errors.name ? 'border-maison-red' : 'border-maison-border'}`}
                        {...register('name', { required: 'Requerido' })}
                    />
                    {errors.name && (
                        <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                            <FiAlertCircle /> {errors.name.message}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Color de agenda *</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            aria-label="Seleccionar color de agenda"
                            className="h-10 w-14 shrink-0 cursor-pointer rounded-xl border border-maison-border bg-maison-bg p-1"
                            {...register('color', { required: 'Requerido' })}
                        />
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    aria-label={`Usar color ${preset}`}
                                    onClick={() => setValue('color', preset, { shouldDirty: true })}
                                    className={`h-7 w-7 cursor-pointer rounded-full border transition-transform hover:scale-110 ${selectedColor?.toLowerCase() === preset.toLowerCase() ? 'border-maison-text ring-2 ring-gray-200' : 'border-maison-border'}`}
                                    style={{ backgroundColor: preset }}
                                />
                            ))}
                        </div>
                    </div>
                    {errors.color && (
                        <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                            <FiAlertCircle /> {errors.color.message}
                        </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Se usa para identificar sus turnos en la agenda.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-widest text-gray-500 uppercase flex justify-between">
                        Vincular a usuario <span className="text-gray-400 font-normal normal-case">Opcional</span>
                    </label>
                    <select
                        className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 cursor-pointer"
                        {...register('linkedAdmin')}
                    >
                        <option value="">Sin vincular</option>
                        {(linkableAdmins || []).map((admin) => (
                            <option key={admin._id} value={admin._id}>{admin.email}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Asociá la profesional a una cuenta con login para futuros accesos.</p>
                </div>

            </form>
        </Modal>
    );
}
