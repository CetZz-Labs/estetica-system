import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Select, { type StylesConfig } from "react-select";
import { FiAlertCircle, FiClock, FiCalendar, FiUser, FiBox, FiFileText } from "react-icons/fi";

import { getServiceRecords } from "../api/serviceRecordApi";
import { getClients } from "../api/clientApi";
import { getServices } from "../api/serviceApi";
import { getProfessionals } from "../api/professionalApi";
import type { Client, Service, Professional, ServiceRecord, Paginated } from "../types";
import { formatCalendarDate } from "../utils/dates";
import Pagination from "../components/ui/Pagination";

const PAGE_SIZE = 7; // debe coincidir con el page-size del backend

interface SelectOption {
    value: string;
    label: string;
}

const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#FDFBF7', // bg-maison-bg
        borderColor: state.isFocused ? '#E5E7EB' : '#E5E7EB',
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

export default function Historial() {
    const [page, setPage] = useState(1);
    const [clientId, setClientId] = useState<string>('');
    const [serviceId, setServiceId] = useState<string>('');
    const [professionalId, setProfessionalId] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const { data: clients } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: () => getClients(),
    });

    const { data: services } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: () => getServices(),
    });

    const { data: professionals } = useQuery<Professional[]>({
        queryKey: ['professionals', 'active'],
        queryFn: () => getProfessionals(),
    });

    const clientOptions = clients?.map(c => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })) || [];
    const serviceOptions = services?.map(s => ({ value: s._id, label: s.name })) || [];
    const professionalOptions = professionals?.map(p => ({ value: p._id, label: p.name })) || [];

    const filters = {
        ...(clientId ? { clientId } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(professionalId ? { professionalId } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
    };

    const { data, isLoading, isError } = useQuery<Paginated<ServiceRecord>>({
        queryKey: ['service-records', { page, limit: PAGE_SIZE, ...filters }],
        queryFn: () => getServiceRecords({ page, limit: PAGE_SIZE, ...filters }),
        placeholderData: keepPreviousData,
    });

    const items = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    const handleClientChange = (value: string) => { setClientId(value); setPage(1); };
    const handleServiceChange = (value: string) => { setServiceId(value); setPage(1); };
    const handleProfessionalChange = (value: string) => { setProfessionalId(value); setPage(1); };
    const handleDateFromChange = (value: string) => { setDateFrom(value); setPage(1); };
    const handleDateToChange = (value: string) => { setDateTo(value); setPage(1); };

    const hasActiveFilters = !!(clientId || serviceId || professionalId || dateFrom || dateTo);
    const clearFilters = () => {
        setClientId('');
        setServiceId('');
        setProfessionalId('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Registros</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Historial de Visitas</h3>
                </div>
            </header>

            {/* Filtros */}
            <div className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Cliente</label>
                        <Select
                            options={clientOptions}
                            placeholder="Todos los clientes"
                            styles={selectStyles}
                            isClearable
                            noOptionsMessage={() => "No se encontró el cliente"}
                            value={clientOptions.find(c => c.value === clientId) || null}
                            onChange={(val) => handleClientChange(val?.value ?? '')}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Servicio</label>
                        <Select
                            options={serviceOptions}
                            placeholder="Todos los servicios"
                            styles={selectStyles}
                            isClearable
                            noOptionsMessage={() => "No se encontró el servicio"}
                            value={serviceOptions.find(s => s.value === serviceId) || null}
                            onChange={(val) => handleServiceChange(val?.value ?? '')}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</label>
                        <Select
                            options={professionalOptions}
                            placeholder="Todas las profesionales"
                            styles={selectStyles}
                            isClearable
                            noOptionsMessage={() => "No hay profesionales activas"}
                            value={professionalOptions.find(p => p.value === professionalId) || null}
                            onChange={(val) => handleProfessionalChange(val?.value ?? '')}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Desde</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => handleDateFromChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Hasta</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => handleDateToChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="border-b border-maison-border bg-maison-bg/50">
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Cliente</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Servicio</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Fecha</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Productos usados</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-maison-border">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2" /></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-2/3" /></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2" /></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full" /></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8">
                                        <div className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                                            <FiAlertCircle aria-hidden className="shrink-0" />
                                            <span>No se pudo cargar el historial de visitas. Reintentá en unos segundos.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12">
                                        <div className="flex flex-col items-center gap-2 text-maison-text/60">
                                            <FiClock aria-hidden size={32} />
                                            <p>
                                                {hasActiveFilters
                                                    ? 'No se encontraron visitas con los filtros aplicados.'
                                                    : 'Aún no hay visitas registradas.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((registro) => (
                                    <tr key={registro._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className="font-medium text-maison-text">
                                                {registro.client.firstName} {registro.client.lastName}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className="text-sm text-gray-600">{registro.service.name}</span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <FiCalendar className="text-gray-400 shrink-0" />
                                                {formatCalendarDate(registro.serviceDate)}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            {registro.professional ? (
                                                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-maison-border shrink-0"
                                                        style={{ backgroundColor: registro.professional.color }}
                                                        aria-hidden
                                                    />
                                                    {registro.professional.name}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                                                    <FiUser className="shrink-0" /> Sin asignar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            {registro.productsUsed && registro.productsUsed.length > 0 ? (
                                                <span className="flex items-start gap-1.5 text-sm text-gray-600 max-w-[220px]">
                                                    <FiBox className="text-gray-400 mt-0.5 shrink-0" />
                                                    <span className="truncate">
                                                        {registro.productsUsed.map(item => {
                                                            const productName = typeof item.product === 'object' && item.product !== null ? item.product.name : 'Insumo';
                                                            return `${productName} (${item.quantity})`;
                                                        }).join(', ')}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            {registro.notes ? (
                                                <span className="flex items-start gap-1.5 text-sm text-gray-600 max-w-[220px]">
                                                    <FiFileText className="text-gray-400 mt-0.5 shrink-0" />
                                                    <span className="truncate">{registro.notes}</span>
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && !isError && items.length > 0 && (
                    <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
                )}
            </div>
        </div>
    );
}
