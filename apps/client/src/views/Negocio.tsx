import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FiAlertCircle, FiSettings } from 'react-icons/fi';

import { getTenant, updateTenant, type TenantSettings } from '../api/tenantApi';
import { handleApiError } from '../api/errorHandler';

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

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto animate-pulse">
                <div className="mb-8 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-10 bg-gray-200 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-10 bg-gray-200 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-10 bg-gray-200 rounded-xl"></div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded-full w-32"></div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto">
                <div className="bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiSettings className="text-2xl text-maison-red" />
                    </div>
                    <p className="text-sm text-maison-red">
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
                <h1 className="font-serif text-2xl text-maison-text">Mi Negocio</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Nombre del negocio *</label>
                        <input
                            type="text"
                            placeholder="Ej. Maison Estudio"
                            className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.name ? 'border-maison-red' : 'border-maison-border'}`}
                            {...register('name', { required: 'El nombre del negocio es obligatorio' })}
                        />
                        {errors.name && (
                            <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                <FiAlertCircle /> {errors.name.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Logo (URL)</label>
                        <input
                            type="url"
                            placeholder="https://ejemplo.com/logo.png"
                            className={`w-full px-4 py-2.5 bg-maison-bg border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 placeholder:text-gray-400 ${errors.logo ? 'border-maison-red' : 'border-maison-border'}`}
                            {...register('logo')}
                        />
                        {errors.logo && (
                            <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                <FiAlertCircle /> {errors.logo.message}
                            </span>
                        )}
                        {logoValue && (
                            <div className="mt-3">
                                <img
                                    src={logoValue}
                                    alt="Vista previa del logo"
                                    className="h-16 w-16 object-contain rounded-xl border border-maison-border"
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
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                            {...register('timezone', { required: 'Seleccioná una zona horaria' })}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tz}
                                </option>
                            ))}
                        </select>
                        {errors.timezone && (
                            <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                <FiAlertCircle /> {errors.timezone.message}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Moneda</label>
                        <select
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                            {...register('currency', { required: 'Seleccioná una moneda' })}
                        >
                            {CURRENCIES.map((cur) => (
                                <option key={cur} value={cur}>
                                    {cur}
                                </option>
                            ))}
                        </select>
                        {errors.currency && (
                            <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium">
                                <FiAlertCircle /> {errors.currency.message}
                            </span>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-maison-primary hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm cursor-pointer"
                        >
                            {isPending ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
