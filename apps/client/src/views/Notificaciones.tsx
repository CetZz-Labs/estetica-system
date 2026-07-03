import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FiAlertCircle, FiBell, FiCheckCircle } from 'react-icons/fi';

import {
    getNotificationSettings,
    updateNotificationSettings,
    type NotificationSettings,
    type NotificationSettingsFormData,
} from '../api/notificationSettingsApi';
import { handleApiError } from '../api/errorHandler';

export default function Notificaciones() {
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery<NotificationSettings>({
        queryKey: ['notification-settings'],
        queryFn: getNotificationSettings,
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<NotificationSettingsFormData>({
        defaultValues: {
            smtpHost: '',
            smtpPort: undefined,
            smtpSecure: false,
            smtpUser: '',
            smtpPassword: '',
            fromEmail: '',
            fromName: '',
            reminderHoursBefore: 24,
        },
    });

    useEffect(() => {
        if (data) {
            reset({
                smtpHost: data.smtpHost || '',
                smtpPort: data.smtpPort,
                smtpSecure: data.smtpSecure || false,
                smtpUser: data.smtpUser || '',
                smtpPassword: '',
                fromEmail: data.fromEmail || '',
                fromName: data.fromName || '',
                reminderHoursBefore: data.reminderHoursBefore ?? 24,
            });
        }
    }, [data, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (formData: NotificationSettingsFormData) => updateNotificationSettings(formData),
        onSuccess: () => {
            toast.success('Configuración guardada');
            queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
        },
        onError: (error) => handleApiError(error, 'Error al guardar la configuración'),
    });

    const onSubmit = (formData: NotificationSettingsFormData) => {
        const payload: NotificationSettingsFormData = { ...formData };
        if (!payload.smtpPassword) {
            delete payload.smtpPassword;
        }
        mutate(payload);
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto animate-pulse">
                <div className="mb-8 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded-full w-32"></div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiBell className="text-2xl text-destructive" />
                    </div>
                    <p className="text-sm text-destructive">
                        No pudimos cargar la configuración en este momento. Por favor, intenta de nuevo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Configuración</p>
                <h1 className="font-serif text-2xl text-foreground">Notificaciones</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                    <div>
                        <p className="text-sm font-medium text-foreground mb-2">Servidor SMTP</p>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Host SMTP</label>
                            <input
                                type="text"
                                placeholder="Ej: smtp.gmail.com"
                                className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.smtpHost ? 'border-destructive' : 'border-border'}`}
                                {...register('smtpHost')}
                            />
                            {errors.smtpHost && (
                                <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                    <FiAlertCircle /> {errors.smtpHost.message}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Puerto SMTP</label>
                        <input
                            type="number"
                            placeholder="Ej: 587"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.smtpPort ? 'border-destructive' : 'border-border'}`}
                            {...register('smtpPort', { valueAsNumber: true })}
                        />
                        {errors.smtpPort && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.smtpPort.message}
                            </span>
                        )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer self-start text-sm font-medium text-gray-700 bg-background border border-border px-4 py-2.5 rounded-lg w-fit">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            {...register('smtpSecure')}
                        />
                        <span>Conexión segura (TLS/SSL)</span>
                    </label>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Usuario SMTP</label>
                        <input
                            type="text"
                            placeholder="Ej: notificaciones@minegocio.com"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.smtpUser ? 'border-destructive' : 'border-border'}`}
                            {...register('smtpUser')}
                        />
                        {errors.smtpUser && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.smtpUser.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Contraseña SMTP</label>
                        <input
                            type="password"
                            placeholder={data?.hasSmtpPassword ? '••••••••  (dejar en blanco para no cambiar)' : 'Sin configurar'}
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.smtpPassword ? 'border-destructive' : 'border-border'}`}
                            {...register('smtpPassword')}
                        />
                        {errors.smtpPassword && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.smtpPassword.message}
                            </span>
                        )}
                        {data?.hasSmtpPassword ? (
                            <span className="flex items-center gap-1 text-xs text-ring mt-1 font-medium">
                                <FiCheckCircle /> Contraseña configurada
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500 mt-1 font-medium">
                                <FiAlertCircle /> Sin contraseña configurada
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Email remitente</label>
                        <input
                            type="email"
                            placeholder="Ej: turnos@minegocio.com"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.fromEmail ? 'border-destructive' : 'border-border'}`}
                            {...register('fromEmail', {
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: 'Ingresá un email válido',
                                },
                            })}
                        />
                        {errors.fromEmail && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.fromEmail.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nombre remitente</label>
                        <input
                            type="text"
                            placeholder="Ej: Maison Estudio"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.fromName ? 'border-destructive' : 'border-border'}`}
                            {...register('fromName')}
                        />
                        {errors.fromName && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.fromName.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Horas de anticipación del recordatorio</label>
                        <input
                            type="number"
                            min={1}
                            max={168}
                            placeholder="Ej: 24"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.reminderHoursBefore ? 'border-destructive' : 'border-border'}`}
                            {...register('reminderHoursBefore', {
                                valueAsNumber: true,
                                min: { value: 1, message: 'El mínimo es 1 hora' },
                                max: { value: 168, message: 'El máximo es 168 horas (7 días)' },
                            })}
                        />
                        {errors.reminderHoursBefore && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.reminderHoursBefore.message}
                            </span>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-primary hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm cursor-pointer"
                        >
                            {isPending ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
