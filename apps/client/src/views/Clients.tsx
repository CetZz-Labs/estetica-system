import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { FiSearch, FiUploadCloud, FiUsers, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router';

import { getClientsPage } from '../api/clientApi';
import type { Client, Paginated } from '../types';
import ClienteModal from '../components/ClienteModal';
import CargaMasivaClientesModal from '../components/CargaMasivaClientesModal';
import Pagination from '../components/ui/Pagination';
import { useTopbar } from '../layouts/TopbarContext';
import useDebounce from '../utils/useDebounce';

const PAGE_SIZE = 7; // debe coincidir con el page-size del backend

/**
 * Tinte rotativo determinístico del avatar (docs/design.md §7.10): rota entre 4 parejas
 * fondo/texto (rose/sage/gold/wine) según un hash simple del `_id`, para que la misma
 * clienta siempre obtenga el mismo color. Reutilizar este mismo criterio en Profesionales
 * (UX-34) si necesita el mismo tipo de avatar — no hay util compartido todavía.
 */
const AVATAR_TINTS = [
    { bg: 'bg-rose-bg', text: 'text-rose-text' },
    { bg: 'bg-sage-bg', text: 'text-sage-text' },
    { bg: 'bg-gold-bg', text: 'text-gold-text' },
    { bg: 'bg-wine-bg', text: 'text-wine' },
] as const;

const getAvatarTint = (id: string): { bg: string; text: string } => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return AVATAR_TINTS[hash % AVATAR_TINTS.length];
};

export default function Clients() {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false);

    const handleOpenNewCliente = () => setIsModalOpen(true);

    useTopbar({
        title: 'Clientes',
        primaryAction: { label: '+ Agregar Cliente', onClick: handleOpenNewCliente },
    });

    const debouncedSearch = useDebounce(searchTerm.trim(), 300);

    const { data, isLoading, isError } = useQuery<Paginated<Client>>({
        queryKey: ['clients', { page, limit: PAGE_SIZE, search: debouncedSearch }],
        queryFn: () => getClientsPage({ page, limit: PAGE_SIZE, search: debouncedSearch }),
        placeholderData: keepPreviousData,
    });

    const items = data?.data ?? [];
    const total = data?.meta.total ?? 0;

    const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };

    const renderAvatar = (cliente: Client) => {
        const initials = cliente.firstName.charAt(0).toUpperCase() + (cliente.lastName ?? '').charAt(0).toUpperCase();
        const tint = getAvatarTint(cliente._id);
        return (
            <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-serif text-base font-semibold ${tint.bg} ${tint.text}`} aria-hidden>
                {initials}
            </span>
        );
    };

    const renderContact = (cliente: Client) => (
        <>
            {cliente.phone && (
                <p className="text-text-2 text-[13.5px]">{cliente.phone}</p>
            )}
            {cliente.email ? (
                <a
                    href={`mailto:${cliente.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 text-accent text-[13.5px] hover:underline break-all"
                >
                    {cliente.email}
                </a>
            ) : !cliente.phone ? (
                <span className="text-muted text-[13.5px] italic">Sin datos de contacto</span>
            ) : null}
        </>
    );

    const renderNotesBadge = () => (
        <span className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-pill bg-gold-bg text-gold-text text-[11.5px] font-semibold">
            <FiAlertCircle aria-hidden /> Notas médicas
        </span>
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Cabecera */}
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-6">
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <FiSearch className="text-muted text-lg" aria-hidden />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o teléfono..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text placeholder:text-placeholder focus:outline-none focus:border-accent-rose transition-colors"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setIsCargaMasivaOpen(true)}
                    className="self-start sm:self-auto shrink-0 bg-surface border border-[var(--dotted)] hover:bg-hover-soft text-wine px-4.5 py-2.5 rounded-ctrl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                    <FiUploadCloud aria-hidden /> Importar
                </button>
            </header>

            {/* Listado de clientes */}
            <div className="bg-surface border border-border rounded-card overflow-hidden">
                {isLoading ? (
                    <div className="animate-pulse" aria-busy="true">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-[13px] border-b border-border-soft">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-surface-2" />
                                <div className="h-4 bg-surface-2 rounded w-32" />
                                <div className="h-4 bg-surface-2 rounded w-28 ml-auto" />
                            </div>
                        ))}
                    </div>
                ) : isError ? (
                    <div className="px-6 py-10">
                        <div className="flex items-center justify-center gap-2 rounded-ctrl bg-alert-bg p-4 text-alert-text">
                            <FiAlertTriangle aria-hidden className="shrink-0" />
                            <span>No pudimos cargar los clientes en este momento. Intentá de nuevo.</span>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-14">
                        <div className="flex flex-col items-center gap-2 text-muted text-center">
                            {debouncedSearch !== '' ? (
                                <>
                                    <FiSearch size={28} aria-hidden />
                                    <p>No se encontraron clientes con "{debouncedSearch}".</p>
                                </>
                            ) : (
                                <>
                                    <FiUsers size={32} aria-hidden />
                                    <p className="font-semibold text-text">Sin clientes aún</p>
                                    <p className="text-sm">Agregá tu primer cliente para comenzar.</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Cards (mobile) */}
                        <ul className="sm:hidden divide-y divide-border-soft">
                            {items.map((cliente) => (
                                <li key={cliente._id} className="relative p-4 flex flex-col gap-2 hover:bg-surface-2 transition-colors">
                                    <Link
                                        to={`/clientes/${cliente._id}`}
                                        className="flex items-center gap-3 min-w-0 after:content-[''] after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-accent-rose focus-visible:outline-offset-2"
                                    >
                                        {renderAvatar(cliente)}
                                        <span className="font-semibold text-text text-sm break-words min-w-0">
                                            {`${cliente.firstName} ${cliente.lastName ?? ''}`.trim()}
                                        </span>
                                    </Link>
                                    <div className="flex flex-col gap-1 min-w-0">
                                        {renderContact(cliente)}
                                    </div>
                                    {cliente.medicalNotes && renderNotesBadge()}
                                </li>
                            ))}
                        </ul>

                        {/* Tabla (>= sm) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-2 border-b border-border">
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Cliente</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Contacto</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Notas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((cliente) => (
                                        <tr key={cliente._id} className="relative border-b border-border-soft last:border-0 hover:bg-surface-2 transition-colors cursor-pointer">
                                            <td className="px-5 py-[13px]">
                                                <Link
                                                    to={`/clientes/${cliente._id}`}
                                                    className="flex items-center gap-3 min-w-0 after:content-[''] after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-accent-rose focus-visible:outline-offset-2"
                                                >
                                                    {renderAvatar(cliente)}
                                                    <span className="font-semibold text-text text-sm truncate">
                                                        {`${cliente.firstName} ${cliente.lastName ?? ''}`.trim()}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-5 py-[13px]">{renderContact(cliente)}</td>
                                            <td className="px-5 py-[13px]">
                                                {cliente.medicalNotes ? renderNotesBadge() : <span className="text-muted text-[13.5px]">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
                    </>
                )}
            </div>

            <ClienteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <CargaMasivaClientesModal
                isOpen={isCargaMasivaOpen}
                onClose={() => setIsCargaMasivaOpen(false)}
            />
        </div>
    );
}
