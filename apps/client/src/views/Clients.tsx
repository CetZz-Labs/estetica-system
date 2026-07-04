import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiSearch, FiPlus, FiChevronRight, FiPhone, FiUploadCloud, FiUsers } from 'react-icons/fi';

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
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-10">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2 uppercase">Directorio</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Clientes</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">
                    <button
                        onClick={() => setIsCargaMasivaOpen(true)}
                        className="bg-card border border-border hover:border-primary/40 text-muted-foreground px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm shadow-sm cursor-pointer"
                    >
                        <FiUploadCloud className="text-lg" /> Importar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer shadow-sm"
                    >
                        <FiPlus className="text-lg" /> Agregar Cliente
                    </button>
                </div>
            </header>

            {/* Barra de Búsqueda */}
            <div className="mb-6 relative w-full sm:w-96">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400 text-lg" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all shadow-sm"
                />
            </div>

            {/* Lista de Clientes */}
            <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg overflow-hidden shadow-sm hover:border-t-primary/60 transition-all duration-200">
                {isLoading ? (
                    <ul className="divide-y divide-border">
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} className="p-4 animate-pulse">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-muted"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-5 bg-muted rounded w-1/3"></div>
                                            <div className="h-4 bg-muted rounded w-1/4"></div>
                                        </div>
                                    </div>
                                    <div className="h-9 bg-muted rounded-lg w-24 shrink-0 hidden sm:block"></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : isError ? (
                    <div className="p-12 text-center text-destructive">
                        No pudimos cargar los clientes en este momento. Por favor, intenta de nuevo.
                    </div>
                ) : clientes?.length === 0 ? (
                    <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiUsers className="text-2xl text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-serif text-foreground mb-2">Sin clientes aún</h4>
                        <p className="text-sm text-gray-500">Agrega tu primer cliente para comenzar.</p>
                    </div>
                ) : filteredClientes?.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No se encontraron clientes con "{searchTerm}".
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {filteredClientes?.map((cliente) => {
                            const initials = cliente.firstName.charAt(0).toUpperCase() + cliente.lastName.charAt(0).toUpperCase();
                            return (
                                <li key={cliente._id} className="hover:bg-muted/50 transition-colors group">
                                    <Link
                                        to={`/clientes/${cliente._id}`}
                                        className="flex items-center justify-between gap-3 p-4 w-full"
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-background border border-border flex items-center justify-center font-serif text-lg text-foreground shadow-sm">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground text-base sm:text-lg truncate">{cliente.firstName} {cliente.lastName}</p>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500 mt-0.5">
                                                    {cliente.phone ? (
                                                        <span className="flex items-center gap-1.5"><FiPhone className="text-gray-400 shrink-0" /> {cliente.phone}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sin teléfono</span>
                                                    )}
                                                    {cliente.medicalNotes && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-warning border border-orange-100 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                            Notas Médicas
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <FiChevronRight className="shrink-0 text-gray-300 group-hover:text-primary transition-colors text-xl" />
                                    </Link>
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
