import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Select, { type StylesConfig } from "react-select";
import { FiAlertTriangle, FiClock, FiCalendar, FiUser, FiBox, FiFileText } from "react-icons/fi";

import { getServiceRecords } from "../api/serviceRecordApi";
import { getClients } from "../api/clientApi";
import { getServices } from "../api/serviceApi";
import { getProfessionals } from "../api/professionalApi";
import type { Client, Service, Professional, ServiceRecord, Paginated } from "../types";
import { formatCalendarDate } from "../utils/dates";
import Pagination from "../components/ui/Pagination";
import { useTopbar } from "../layouts/TopbarContext";

const PAGE_SIZE = 7; // debe coincidir con el page-size del backend

interface SelectOption {
    value: string;
    label: string;
}

const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#FAF6F4', // bg
        borderColor: state.isFocused ? '#D98BA4' : '#F0E4E4', // accent-rose / border
        borderRadius: '10px',
        padding: '2px',
        boxShadow: 'none',
        '&:hover': {
            borderColor: state.isFocused ? '#D98BA4' : '#F0E4E4'
        }
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? '#B76E84' : state.isFocused ? '#F7E7EC' : '#FFFFFF', // accent / rose-bg / surface
        color: state.isSelected ? '#FFFFFF' : '#3E2A33', // text
        cursor: 'pointer'
    }),
    placeholder: (base) => ({ ...base, color: '#B9A6AD' }), // placeholder
};

export default function Historial() {
    useTopbar({ title: 'Historial de Visitas' });

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
            {/* Filtros */}
            <div className="bg-surface border border-border rounded-card p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Cliente</label>
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
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Servicio</label>
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
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Profesional</label>
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
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Desde</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => handleDateFromChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Hasta</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => handleDateToChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
                        />
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-ctrl text-sm font-semibold text-wine bg-surface border border-[var(--dotted)] hover:bg-hover-soft transition-colors cursor-pointer"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-surface border border-border rounded-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="bg-surface-2 border-b border-border">
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Cliente</th>
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Servicio</th>
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Fecha</th>
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Profesional</th>
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Productos usados</th>
                                <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border-soft animate-pulse">
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-3/4" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-1/2" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-2/3" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-1/2" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-full" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8">
                                        <div className="flex items-center justify-center gap-2 rounded-ctrl bg-alert-bg p-4 text-alert-text">
                                            <FiAlertTriangle aria-hidden className="shrink-0" />
                                            <span>No se pudo cargar el historial de visitas. Reintentá en unos segundos.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12">
                                        <div className="flex flex-col items-center gap-2 text-muted">
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
                                    <tr key={registro._id} className="border-b border-border-soft last:border-0 hover:bg-surface-2 transition-colors">
                                        <td className="px-5 py-[13px]">
                                            <span className="font-semibold text-text text-sm">
                                                {registro.client.firstName} {registro.client.lastName}
                                            </span>
                                        </td>
                                        <td className="px-5 py-[13px]">
                                            <span className="text-[13.5px] text-text-2">{registro.service.name}</span>
                                        </td>
                                        <td className="px-5 py-[13px]">
                                            <span className="flex items-center gap-1.5 text-[13.5px] text-text-2">
                                                <FiCalendar className="text-muted shrink-0" aria-hidden />
                                                {formatCalendarDate(registro.serviceDate)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-[13px]">
                                            {registro.professional ? (
                                                <span className="flex items-center gap-1.5 text-[13.5px] text-text-2">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-border shrink-0"
                                                        style={{ backgroundColor: registro.professional.color }}
                                                        aria-hidden
                                                    />
                                                    {registro.professional.name}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[13.5px] text-muted">
                                                    <FiUser className="shrink-0" aria-hidden /> Sin asignar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-[13px]">
                                            {registro.productsUsed && registro.productsUsed.length > 0 ? (
                                                <span className="flex items-start gap-1.5 text-[13.5px] text-text-2 max-w-[220px]">
                                                    <FiBox className="text-muted mt-0.5 shrink-0" aria-hidden />
                                                    <span className="truncate">
                                                        {registro.productsUsed.map(item => {
                                                            const productName = typeof item.product === 'object' && item.product !== null ? item.product.name : 'Insumo';
                                                            return `${productName} (${item.quantity})`;
                                                        }).join(', ')}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-[13.5px] text-muted">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-[13px]">
                                            {registro.notes ? (
                                                <span className="flex items-start gap-1.5 text-[13.5px] text-text-2 max-w-[220px]">
                                                    <FiFileText className="text-muted mt-0.5 shrink-0" aria-hidden />
                                                    <span className="truncate">{registro.notes}</span>
                                                </span>
                                            ) : (
                                                <span className="text-[13.5px] text-muted">—</span>
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
