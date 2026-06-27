import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiPhone, FiCalendar, FiClock, FiFileText, FiBox, FiAlertCircle, FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';

import { getClientById, deleteClient as deleteClientApi } from '../api/clientApi';
import { getClientRecords } from '../api/serviceRecordApi';
import { handleApiError } from '../api/errorHandler';
import type { Client, ServiceRecord } from '../types';
import { formatDate } from '../utils/dates';
import { useState } from 'react';
import { toast } from 'sonner';
import ClienteModal from '../components/ClienteModal';

export default function PerfilCliente() {
    const { id } = useParams();
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: cliente, isLoading: isLoadingClient } = useQuery<Client>({
        queryKey: ['client', id],
        queryFn: () => getClientById(id!),
        enabled: !!id
    });

    const { data: historial, isLoading: isLoadingHistory } = useQuery<ServiceRecord[]>({
        queryKey: ['client-history', id],
        queryFn: () => getClientRecords(id!),
        enabled: !!id
    });

    const { mutate: deleteClient } = useMutation({
        mutationFn: () => deleteClientApi(id!),
        onSuccess: () => {
            toast.success('Cliente eliminado');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            navigate('/clientes');
        },
        onError: (error) => handleApiError(error, 'Error al eliminar el cliente')
    });

    const handleDelete = () => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este cliente y todo su historial?')) {
            deleteClient();
        }
    };

    const isLoading = isLoadingClient || isLoadingHistory;

    if (!isLoading && !cliente) {
        return <div className="p-8 text-maison-red text-center">Cliente no encontrado.</div>;
    }

    const initials = cliente ? cliente.firstName.charAt(0).toUpperCase() + cliente.lastName.charAt(0).toUpperCase() : '';

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <button onClick={() => navigate('/clientes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-maison-text transition-colors mb-6 cursor-pointer">
                <FiArrowLeft /> Volver al directorio
            </button>

            {/* Tarjeta principal */}
            <div className="bg-maison-card border border-maison-border rounded-3xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-maison-bg rounded-full -translate-y-1/2 translate-x-1/3 opacity-50"></div>
                {isLoading ? (
                    <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-center animate-pulse">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-full bg-gray-200"></div>
                        <div className="flex-1 space-y-4 w-full">
                            <div className="h-8 bg-gray-200 rounded w-1/2 sm:w-1/3"></div>
                            <div className="flex gap-2">
                                <div className="h-8 bg-gray-200 rounded w-32"></div>
                                <div className="h-8 bg-gray-200 rounded w-40"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Botones de acción — arriba a la derecha */}
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-10">
                            <button onClick={() => setIsEditModalOpen(true)} className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-maison-primary hover:border-gray-300 rounded-lg transition-all shadow-sm cursor-pointer" title="Editar cliente"><FiEdit2 size={16} /></button>
                            <button onClick={handleDelete} className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-maison-red hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm cursor-pointer" title="Eliminar cliente"><FiTrash2 size={16} /></button>
                        </div>
                        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-center">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-full bg-white border-2 border-maison-border flex items-center justify-center font-serif text-3xl sm:text-4xl text-maison-text shadow-sm">{initials}</div>
                            <div className="flex-1 pr-16 sm:pr-0">
                                <h2 className="text-2xl sm:text-4xl font-serif text-maison-text mb-2">{cliente?.firstName} {cliente?.lastName}</h2>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-3">
                                    <span className="flex items-center gap-1.5 bg-maison-bg px-3 py-1.5 rounded-lg border border-maison-border">
                                        <FiPhone className="text-gray-400 shrink-0" />{cliente?.phone || 'Sin teléfono'}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-maison-bg px-3 py-1.5 rounded-lg border border-maison-border text-xs uppercase tracking-widest font-semibold">
                                        Cliente desde {cliente ? new Date(cliente.createdAt).getFullYear() : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {cliente?.medicalNotes && (
                            <div className="mt-6 sm:mt-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl relative">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-maison-orange mb-2 flex items-center gap-2"><FiAlertCircle /> Notas Médicas Importantes</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{cliente.medicalNotes}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Historial */}
            <div>
                <h3 className="text-xl sm:text-2xl font-serif text-maison-text mb-6 flex items-center gap-3"><FiClock className="text-gray-400" /> Historial de Visitas</h3>
                <div className="bg-maison-card border border-maison-border rounded-3xl p-5 sm:p-8 shadow-sm">
                    {isLoading ? (
                        <div className="relative pl-4 border-l-2 border-maison-border space-y-8 py-2 ml-2">
                            {[1, 2].map(i => (
                                <div key={i} className="relative ml-6 sm:ml-8 animate-pulse">
                                    <div className="absolute left-[-46px] sm:left-[-57px] top-1.5 w-4 h-4 rounded-full bg-gray-200 ring-4 ring-white"></div>
                                    <div className="bg-white border border-maison-border rounded-2xl p-4 sm:p-5 shadow-sm">
                                        <div className="flex justify-between items-start gap-3 mb-3">
                                            <div className="space-y-2 w-1/2">
                                                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : historial?.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Este cliente aún no tiene servicios registrados.</p>
                    ) : (
                        <div className="relative pl-4 border-l-2 border-maison-border space-y-8 py-2 ml-2">
                            {historial?.map((registro) => (
                                <div key={registro._id} className="relative ml-6 sm:ml-8">
                                    <div className={`absolute left-[-46px] sm:left-[-57px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white ${registro.touchupStatus === 'cancelled' ? 'bg-maison-red' : 'bg-maison-primary'}`}></div>
                                    <div className="bg-white border border-maison-border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                            <div>
                                                <h4 className="text-base sm:text-lg font-medium text-maison-text">{registro.service.name}</h4>
                                                <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mt-1 flex items-center gap-1.5"><FiCalendar /> {formatDate(registro.serviceDate)}</p>
                                                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                                                    <FiUser className="text-gray-400 shrink-0" />
                                                    {registro.professional ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="h-2.5 w-2.5 rounded-full border border-maison-border shrink-0" style={{ backgroundColor: registro.professional.color }} aria-hidden />
                                                            {registro.professional.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">Sin asignar</span>
                                                    )}
                                                </p>
                                            </div>
                                            {registro.touchupStatus === 'completed' && (
                                                <span className="bg-green-50 text-maison-green border border-green-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Retoque Listo</span>
                                            )}
                                            {registro.touchupStatus === 'cancelled' && (
                                                <span className="bg-red-50 text-maison-red border border-red-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Retoque Cancelado</span>
                                            )}
                                        </div>
                                        {(registro.notes || registro.productsUsed) && (
                                            <div className="mt-4 pt-4 border-t border-maison-border space-y-3">
                                                {registro.notes && (
                                                    <div className="flex gap-2 text-sm text-gray-600"><FiFileText className="text-gray-400 mt-0.5 shrink-0" /><p>{registro.notes}</p></div>
                                                )}
                                                {registro.productsUsed && registro.productsUsed.length > 0 && (
                                                    <div className="flex gap-2 text-sm text-gray-600">
                                                        <FiBox className="text-gray-400 mt-0.5 shrink-0" />
                                                        <div>
                                                            <span className="font-medium text-gray-700">Insumos: </span>
                                                            <span className="text-gray-600">
                                                                {registro.productsUsed.map(item => {
                                                                    const productName = typeof item.product === 'object' && item.product !== null ? item.product.name : 'Insumo';
                                                                    return `${productName} (${item.quantity > 0 ? item.quantity : '0'})`;
                                                                }).join(', ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ClienteModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} clientToEdit={cliente} />
        </div>
    );
}