import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiPlus, FiScissors, FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import { toast } from 'sonner';

import { getServices, deleteService as deleteServiceApi } from '../api/serviceApi';
import { handleApiError } from '../api/errorHandler';
import type { Service } from '../types';
import ServicioModal from '../components/ServicioModal';

export default function Servicios() {

    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

    const { data: servicios, isLoading } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: getServices
    });

    const { mutate: deleteService } = useMutation({
        mutationFn: (id: string) => deleteServiceApi(id),
        onSuccess: () => {
            toast.success('Servicio eliminado');
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
        onError: (error) => handleApiError(error, 'No se puede eliminar porque tiene visitas asociadas')
    });

    const handleEdit = (service: Service) => { setServiceToEdit(service); setIsModalOpen(true); };
    const handleCreate = () => { setServiceToEdit(null); setIsModalOpen(true); };
    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`¿Seguro que querés eliminar el servicio "${name}"?`)) deleteService(id);
    };

    // Loading skeleton is implemented below

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Catálogo</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Servicios</h3>
                </div>
                <button onClick={handleCreate} className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto">
                    <FiPlus className="text-lg" /> Agregar Servicio
                </button>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-11 h-11 bg-gray-200 rounded-xl"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3 mt-1"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : servicios?.length === 0 ? (
                <div className="bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiScissors className="text-2xl text-gray-400" />
                    </div>
                    <h4 className="text-lg font-serif text-maison-text mb-2">No hay servicios registrados</h4>
                    <p className="text-sm text-gray-500">Agregá tu primer servicio para empezar a cargar el historial de los clientes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {servicios?.map((servicio) => (
                        <div key={servicio._id} className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-maison-bg p-3 rounded-xl border border-maison-border text-gray-600"><FiScissors className="text-xl" /></div>
                                {/* Botones siempre visibles en móvil, con hover en desktop */}
                                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(servicio)} className="p-2 text-gray-400 hover:text-maison-primary transition-colors cursor-pointer"><FiEdit2 size={16} /></button>
                                    <button onClick={() => handleDelete(servicio._id, servicio.name)} className="p-2 text-gray-400 hover:text-maison-red transition-colors cursor-pointer"><FiTrash2 size={16} /></button>
                                </div>
                            </div>
                            <h4 className="text-xl font-serif text-maison-text mb-3">{servicio.name}</h4>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold uppercase tracking-widest text-gray-500">
                                <FiClock />
                                {servicio.defaultTouchupDays > 0 ? `Retoque en ${servicio.defaultTouchupDays} días` : 'Sin retoque'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServicioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} serviceToEdit={serviceToEdit} />
        </div>
    );
}