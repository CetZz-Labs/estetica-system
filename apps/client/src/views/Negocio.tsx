import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FiAlertCircle, FiBell, FiBellOff, FiSettings, FiSmartphone } from 'react-icons/fi';

import { getTenant, updateTenant, type TenantSettings } from '../api/tenantApi';
import {
    getNotificationSettings,
    updateNotificationSettings,
    type NotificationSettings,
    type NotificationSettingsFormData,
} from '../api/notificationSettingsApi';
import { savePushSubscription, deletePushSubscription } from '../api/pushNotificationApi';
import { handleApiError } from '../api/errorHandler';
import { urlBase64ToUint8Array, isIOS } from '../utils/webPush';

type PushToggleState = 'checking' | 'unsupported' | 'enabled' | 'disabled' | 'denied';

const TIMEZONES = [
    'America/Argentina/Buenos_Aires',
    'America/Argentina/Cordoba',
    'America/Montevideo',
    'America/Santiago',
    'America/Sao_Paulo',
    'America/Mexico_City',
    'America/Bogota',
    'America/Lima',
    'America/New_York',
    'Europe/Madrid',
    'UTC',
];

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU', 'MXN', 'COP', 'PEN', 'PYG', 'BOB'];

interface NegocioFormData {
    name: string;
    logo?: string;
    timezone: string;
    currency: string;
}

interface RecordatorioFormData {
    reminderHoursBefore: number;
}

export default function Negocio() {
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery<{ tenant: TenantSettings }>({
        queryKey: ['tenant'],
        queryFn: getTenant,
    });

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<NegocioFormData>({
        defaultValues: { name: '', logo: '', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS' },
    });

    useEffect(() => {
        if (data?.tenant) {
            reset({
                name: data.tenant.name || '',
                logo: data.tenant.logo || '',
                timezone: data.tenant.timezone || 'America/Argentina/Buenos_Aires',
                currency: data.tenant.currency || 'ARS',
            });
        }
    }, [data, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (formData: NegocioFormData) => updateTenant(formData),
        onSuccess: () => {
            toast.success('Configuración guardada');
            queryClient.invalidateQueries({ queryKey: ['tenant'] });
        },
        onError: (error) => handleApiError(error, 'Error al guardar la configuración'),
    });

    const onSubmit = (formData: NegocioFormData) => mutate(formData);

    const logoValue = watch('logo');

    const {
        data: notificationSettings,
        isLoading: isNotificationLoading,
        isError: isNotificationError,
    } = useQuery<NotificationSettings>({
        queryKey: ['notification-settings'],
        queryFn: getNotificationSettings,
    });

    const {
        register: registerRecordatorio,
        handleSubmit: handleSubmitRecordatorio,
        reset: resetRecordatorio,
        formState: { errors: recordatorioErrors },
    } = useForm<RecordatorioFormData>({
        defaultValues: { reminderHoursBefore: 24 },
    });

    useEffect(() => {
        if (notificationSettings) {
            resetRecordatorio({ reminderHoursBefore: notificationSettings.reminderHoursBefore ?? 24 });
        }
    }, [notificationSettings, resetRecordatorio]);

    const { mutate: mutateRecordatorio, isPending: isRecordatorioPending } = useMutation({
        mutationFn: (formData: NotificationSettingsFormData) => updateNotificationSettings(formData),
        onSuccess: () => {
            toast.success('Configuración guardada');
            queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
        },
        onError: (error) => handleApiError(error, 'Error al guardar el recordatorio de turno'),
    });

    const onSubmitRecordatorio = (formData: RecordatorioFormData) => mutateRecordatorio(formData);

    const [pushState, setPushState] = useState<PushToggleState>('checking');
    const [isTogglingPush, setIsTogglingPush] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const checkPushSubscription = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                if (!cancelled) setPushState('unsupported');
                return;
            }
            if (Notification.permission === 'denied') {
                if (!cancelled) setPushState('denied');
                return;
            }
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (!cancelled) setPushState(subscription ? 'enabled' : 'disabled');
            } catch {
                if (!cancelled) setPushState('disabled');
            }
        };

        checkPushSubscription();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleTogglePush = async () => {
        if (isTogglingPush || pushState === 'unsupported' || pushState === 'checking') return;
        setIsTogglingPush(true);

        try {
            if (pushState === 'enabled') {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    const { endpoint } = subscription;
                    await subscription.unsubscribe();
                    try {
                        await deletePushSubscription(endpoint);
                    } catch (error) {
                        handleApiError(error, 'No se pudo eliminar la suscripción en el servidor');
                    }
                }
                setPushState('disabled');
                toast.success('Notificaciones desactivadas');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setPushState('denied');
                return;
            }

            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                toast.error('Las notificaciones push no están configuradas para este negocio');
                setPushState('disabled');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            const json = subscription.toJSON();
            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error('La suscripción push generada por el navegador es inválida');
            }

            await savePushSubscription({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            });
            setPushState('enabled');
            toast.success('Notificaciones activadas');
        } catch (error) {
            handleApiError(error, 'Error al actualizar las notificaciones push');
        } finally {
            setIsTogglingPush(false);
        }
    };

    if (isLoading || isNotificationLoading) {
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

    if (isError || isNotificationError) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiSettings className="text-2xl text-destructive" />
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
                <h1 className="font-serif text-2xl text-foreground">Mi Negocio</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nombre del negocio *</label>
                        <input
                            type="text"
                            placeholder="Ej. Maison Estudio"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.name ? 'border-destructive' : 'border-border'}`}
                            {...register('name', { required: 'El nombre del negocio es obligatorio' })}
                        />
                        {errors.name && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.name.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Logo (URL)</label>
                        <input
                            type="url"
                            placeholder="https://ejemplo.com/logo.png"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.logo ? 'border-destructive' : 'border-border'}`}
                            {...register('logo')}
                        />
                        {errors.logo && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.logo.message}
                            </span>
                        )}
                        {logoValue && (
                            <div className="mt-3">
                                <img
                                    src={logoValue}
                                    alt="Vista previa del logo"
                                    className="h-16 w-16 object-contain rounded-lg border border-border"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Zona horaria</label>
                        <select
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                            {...register('timezone', { required: 'Seleccioná una zona horaria' })}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tz}
                                </option>
                            ))}
                        </select>
                        {errors.timezone && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.timezone.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Moneda</label>
                        <select
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                            {...register('currency', { required: 'Seleccioná una moneda' })}
                        >
                            {CURRENCIES.map((cur) => (
                                <option key={cur} value={cur}>
                                    {cur}
                                </option>
                            ))}
                        </select>
                        {errors.currency && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {errors.currency.message}
                            </span>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm shadow-sm cursor-pointer"
                        >
                            {isPending ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>

            <form onSubmit={handleSubmitRecordatorio(onSubmitRecordatorio)} className="mt-6">
                <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <FiBell className="text-muted-foreground text-lg" />
                        <h2 className="font-serif text-xl text-foreground">Recordatorio de turno</h2>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                            Horas de anticipación del recordatorio
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={168}
                            placeholder="Ej: 24"
                            className={`w-full px-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${recordatorioErrors.reminderHoursBefore ? 'border-destructive' : 'border-border'}`}
                            {...registerRecordatorio('reminderHoursBefore', {
                                valueAsNumber: true,
                                required: 'Indicá con cuántas horas de anticipación se envía el recordatorio',
                                min: { value: 1, message: 'El mínimo es 1 hora' },
                                max: { value: 168, message: 'El máximo es 168 horas (7 días)' },
                            })}
                        />
                        {recordatorioErrors.reminderHoursBefore && (
                            <span className="flex items-center gap-1 text-xs text-destructive mt-1 font-medium">
                                <FiAlertCircle /> {recordatorioErrors.reminderHoursBefore.message}
                            </span>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isRecordatorioPending}
                            className="bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm shadow-sm cursor-pointer"
                        >
                            {isRecordatorioPending ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-6 bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2">
                    <FiSmartphone className="text-muted-foreground text-lg" />
                    <h2 className="font-serif text-xl text-foreground">Notificaciones push</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                    Recibí un aviso en este dispositivo cuando haya turnos o retoques pendientes para hoy.
                </p>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {pushState === 'enabled' ? (
                            <FiBell className="text-primary text-lg shrink-0" />
                        ) : (
                            <FiBellOff
                                className={`text-lg shrink-0 ${pushState === 'denied' ? 'text-destructive' : 'text-muted-foreground'}`}
                            />
                        )}
                        <span className={`text-sm font-medium ${pushState === 'denied' ? 'text-destructive' : 'text-foreground'}`}>
                            {pushState === 'checking' && 'Comprobando estado...'}
                            {pushState === 'unsupported' && 'No disponible en este navegador'}
                            {pushState === 'enabled' && 'Notificaciones activadas'}
                            {pushState === 'disabled' && 'Notificaciones desactivadas'}
                            {pushState === 'denied' && 'Notificaciones bloqueadas por el navegador'}
                        </span>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={pushState === 'enabled'}
                        aria-label={pushState === 'enabled' ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
                        onClick={handleTogglePush}
                        disabled={isTogglingPush || pushState === 'unsupported' || pushState === 'checking'}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${pushState === 'enabled' ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushState === 'enabled' ? 'translate-x-4' : ''}`}
                        />
                    </button>
                </div>

                {pushState === 'denied' && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <FiAlertCircle /> Para activarlas, habilitá los permisos de notificaciones de este sitio en la configuración de tu navegador.
                    </p>
                )}

                {isIOS() && (
                    <p className="text-xs text-muted-foreground">
                        En iPhone, agregá esta app a tu pantalla de inicio (compartir &rarr; &quot;Agregar a pantalla de inicio&quot;) para poder recibir notificaciones.
                    </p>
                )}
            </div>
        </div>
    );
}
