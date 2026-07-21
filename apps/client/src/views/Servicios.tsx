import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiPlus, FiScissors, FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import { toast } from 'sonner';

import { getServices, deleteService as deleteServiceApi } from '../api/serviceApi';
import { handleApiError } from '../api/errorHandler';
import type { Service } from '../types';
import ServicioModal from '../components/ServicioModal';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Servicios() {

    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

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
        setConfirmDelete({ id, name });
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-10">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2 uppercase">Catálogo</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Servicios</h3>
                </div>
                <button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer shadow-sm self-start sm:self-auto">
                    <FiPlus className="text-lg" /> Agregar Servicio
                </button>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-11 h-11 bg-muted rounded-lg"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-3/4 mb-3 mt-1"></div>
                            <div className="h-6 bg-muted rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : servicios?.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiScissors className="text-2xl text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-serif text-foreground mb-2">No hay servicios registrados</h4>
                    <p className="text-sm text-gray-500">Agregá tu primer servicio para empezar a cargar el historial de los clientes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {servicios?.map((servicio) => (
                        <div key={servicio._id} className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm hover:border-t-primary/60 hover:shadow-md transition-all duration-200 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-background p-3 rounded-lg border border-border text-muted-foreground"><FiScissors className="text-xl" /></div>
                                <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity duration-200">
                                    <button onClick={() => handleEdit(servicio)} className="p-2 bg-background border border-border text-muted-foreground hover:text-primary hover:border-primary/40 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer" aria-label="Editar servicio"><FiEdit2 size={16} /></button>
                                    <button onClick={() => handleDelete(servicio._id, servicio.name)} className="p-2 bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive-subtle rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer" aria-label="Eliminar servicio"><FiTrash2 size={16} /></button>
                                </div>
                            </div>
                            <h4 className="text-xl font-serif font-semibold text-foreground mb-3">{servicio.name}</h4>
                            <div className="flex flex-wrap gap-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs font-semibold uppercase tracking-widest text-muted">
                                    <FiClock />
                                    {servicio.defaultTouchupDays > 0 ? `Retoque en ${servicio.defaultTouchupDays} días` : 'Sin retoque'}
                                </div>
                                {servicio.duration && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold uppercase tracking-widest text-primary">
                                        {servicio.duration} min
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServicioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} serviceToEdit={serviceToEdit} />
            <ConfirmModal
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) { deleteService(confirmDelete.id); setConfirmDelete(null); } }}
                title="Eliminar servicio"
                message={`¿Seguro que querés eliminar el servicio "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar servicio"
            />
        </div>
    );
}