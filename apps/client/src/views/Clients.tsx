import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiSearch, FiPlus, FiUser, FiPhone, FiUploadCloud } from 'react-icons/fi';

import { getClients } from '../api/clientApi';
import type { Client } from '../types';
import ClienteModal from '../components/ClienteModal';
import CargaMasivaClientesModal from '../components/CargaMasivaClientesModal';
import { Link } from 'react-router';

export default function Clients() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false);

    const { data: clientes, isLoading, isError } = useQuery<Client[]>({
        queryKey: ['clients'],
        queryFn: getClients
    });

    // Lógica de filtrado en tiempo real
    const filteredClientes = clientes?.filter(cliente => {
        const term = searchTerm.toLowerCase();
        const fullName = `${cliente.firstName} ${cliente.lastName}`.toLowerCase();
        const phone = cliente.phone || '';
        return fullName.includes(term) || phone.includes(term);
    });

    return (
        <div className="max-w-6xl mx-auto">
            {/* Cabecera */}
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Directorio</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Clientes</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">
                    <button
                        onClick={() => setIsCargaMasivaOpen(true)}
                        className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 sm:px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                    >
                        <FiUploadCloud className="text-lg" /> Importar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                        <FiPlus className="text-lg" /> Agregar Cliente
                    </button>
                </div>
            </header>

            {/* Barra de Búsqueda */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400 text-lg" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-maison-card border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all shadow-sm"
                />
            </div>

            {/* Lista de Clientes */}
            <div className="bg-maison-card border border-maison-border rounded-2xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <ul className="divide-y divide-maison-border">
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} className="p-4 animate-pulse">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gray-200"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                        </div>
                                    </div>
                                    <div className="h-9 bg-gray-200 rounded-lg w-24 shrink-0 hidden sm:block"></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : isError ? (
                    <div className="p-12 text-center text-maison-red">
                        No pudimos cargar los clientes en este momento. Por favor, intenta de nuevo.
                    </div>
                ) : clientes?.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        Aún no tienes clientes registrados. ¡Crea tu primer cliente!
                    </div>
                ) : filteredClientes?.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron clientes con "{searchTerm}".
                    </div>
                ) : (
                    <ul className="divide-y divide-maison-border">
                        {filteredClientes?.map((cliente) => {
                            const initials = cliente.firstName.charAt(0).toUpperCase() + cliente.lastName.charAt(0).toUpperCase();
                            return (
                                <li key={cliente._id} className="p-4 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-maison-bg border border-maison-border flex items-center justify-center font-serif text-lg text-maison-text shadow-sm">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-maison-text text-base sm:text-lg truncate">{cliente.firstName} {cliente.lastName}</p>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500 mt-0.5">
                                                    {cliente.phone ? (
                                                        <span className="flex items-center gap-1.5"><FiPhone className="text-gray-400 shrink-0" /> {cliente.phone}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sin teléfono</span>
                                                    )}
                                                    {cliente.medicalNotes && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-maison-orange border border-orange-100 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                            Notas Médicas
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Siempre visible en móvil, con hover en desktop */}
                                        <Link
                                            to={`/clientes/${cliente._id}`}
                                            className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm flex items-center gap-2"
                                        >
                                            <FiUser /> <span className="hidden sm:inline">Ver Perfil</span>
                                        </Link>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
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
