import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { FiArrowLeft, FiPhone, FiCalendar, FiClock, FiFileText, FiBox, FiAlertCircle, FiEdit2, FiTrash2, FiUser, FiPlus } from 'react-icons/fi';

import { getClientById, deleteClient as deleteClientApi } from '../api/clientApi';
import { getClientRecords, deleteServiceRecord as deleteServiceRecordApi } from '../api/serviceRecordApi';
import { getMe } from '../api/adminApi';
import { handleApiError } from '../api/errorHandler';
import type { Client, ServiceRecord, Paginated, AdminInfo } from '../types';
import { formatDate } from '../utils/dates';
import { useState } from 'react';
import { toast } from 'sonner';
import ClienteModal from '../components/ClienteModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import RegistroModal from '../components/RegistroModal';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 7; // debe coincidir con el page-size del backend

export default function PerfilCliente() {
    const { id } = useParams();
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPastVisitModalOpen, setIsPastVisitModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<{ id: string; label: string } | null>(null);

    const { data: adminInfo } = useQuery<AdminInfo>({
        queryKey: ['admin-me'],
        queryFn: getMe,
    });
    const isAdmin = adminInfo?.role === 'ADMIN';

    const { data: cliente, isLoading: isLoadingClient } = useQuery<Client>({
        queryKey: ['client', id],
        queryFn: () => getClientById(id!),
        enabled: !!id
    });

    const historyFilters = {
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
    };

    const { data: historial, isLoading: isLoadingHistory, isError: isErrorHistory } = useQuery<Paginated<ServiceRecord>>({
        queryKey: ['client-history', id, page, PAGE_SIZE, dateFrom, dateTo],
        queryFn: () => getClientRecords(id!, { page, limit: PAGE_SIZE, ...historyFilters }),
        enabled: !!id,
        placeholderData: keepPreviousData,
    });

    const registros = historial?.data ?? [];
    const totalRegistros = historial?.meta.total ?? 0;
    const hasActiveDateFilters = !!(dateFrom || dateTo);

    const handleDateFromChange = (value: string) => { setDateFrom(value); setPage(1); };
    const handleDateToChange = (value: string) => { setDateTo(value); setPage(1); };
    const clearDateFilters = () => { setDateFrom(''); setDateTo(''); setPage(1); };

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
        setIsDeleteConfirmOpen(true);
    };

    const { mutate: deleteServiceRecord, isPending: isDeletingRecord } = useMutation({
        mutationFn: (recordId: string) => deleteServiceRecordApi(recordId),
        onSuccess: () => {
            toast.success('Registro de visita eliminado');
            queryClient.invalidateQueries({ queryKey: ['service-records'] });
            queryClient.invalidateQueries({ queryKey: ['client-history'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setConfirmDeleteRecord(null);
        },
        onError: (error) => handleApiError(error, 'No se puede eliminar el registro de visita'),
    });

    const isLoading = isLoadingClient || isLoadingHistory;

    if (!isLoading && !cliente) {
        return <div className="p-8 text-destructive text-center">Cliente no encontrado.</div>;
    }

    const initials = cliente ? cliente.firstName.charAt(0).toUpperCase() + (cliente.lastName ?? '').charAt(0).toUpperCase() : '';

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <button onClick={() => navigate('/clientes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-foreground transition-colors mb-6 cursor-pointer">
                <FiArrowLeft /> Volver al directorio
            </button>

            {/* Tarjeta principal */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-background rounded-full -translate-y-1/2 translate-x-1/3 opacity-50"></div>
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
                            <button onClick={() => setIsEditModalOpen(true)} className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-gray-300 rounded-lg transition-all shadow-sm cursor-pointer" title="Editar cliente"><FiEdit2 size={16} /></button>
                            <button onClick={handleDelete} className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-destructive hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm cursor-pointer" title="Eliminar cliente"><FiTrash2 size={16} /></button>
                        </div>
                        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-center">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-full bg-white border-2 border-border flex items-center justify-center font-serif text-3xl sm:text-4xl text-foreground shadow-sm">{initials}</div>
                            <div className="flex-1 pr-16 sm:pr-0">
                                <h2 className="text-2xl sm:text-4xl font-serif text-foreground mb-2">{`${cliente?.firstName ?? ''} ${cliente?.lastName ?? ''}`.trim()}</h2>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-3">
                                    <span className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border">
                                        <FiPhone className="text-gray-400 shrink-0" />{cliente?.phone || 'Sin teléfono'}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border text-xs uppercase tracking-widest font-semibold">
                                        Cliente desde {cliente ? new Date(cliente.createdAt).getFullYear() : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {cliente?.medicalNotes && (
                            <div className="mt-6 sm:mt-8 p-4 bg-orange-50 border border-orange-100 rounded-lg relative">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-warning mb-2 flex items-center gap-2"><FiAlertCircle /> Notas Médicas Importantes</h4>
                                <p className="text-sm text-gray-700 leading-relaxed">{cliente.medicalNotes}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Historial */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <h3 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-3"><FiClock className="text-gray-400" /> Historial de Visitas</h3>
                    <button
                        type="button"
                        onClick={() => setIsPastVisitModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-accent hover:text-accent-foreground text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm"
                    >
                        <FiPlus /> Registrar visita pasada
                    </button>
                </div>
                <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="historyDateFrom" className="text-xs font-bold tracking-widest text-gray-500 uppercase">Desde</label>
                            <input
                                id="historyDateFrom"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => handleDateFromChange(e.target.value)}
                                className="px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="historyDateTo" className="text-xs font-bold tracking-widest text-gray-500 uppercase">Hasta</label>
                            <input
                                id="historyDateTo"
                                type="date"
                                value={dateTo}
                                onChange={(e) => handleDateToChange(e.target.value)}
                                className="px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                            />
                        </div>
                        {hasActiveDateFilters && (
                            <button
                                type="button"
                                onClick={clearDateFilters}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="relative pl-4 border-l-2 border-border space-y-8 py-2 ml-2">
                            {[1, 2].map(i => (
                                <div key={i} className="relative ml-6 sm:ml-8 animate-pulse">
                                    <div className="absolute left-[-46px] sm:left-[-57px] top-1.5 w-4 h-4 rounded-full bg-gray-200 ring-4 ring-white"></div>
                                    <div className="bg-white border border-border rounded-lg p-4 sm:p-5 shadow-sm">
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
                    ) : isErrorHistory ? (
                        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                            <FiAlertCircle aria-hidden className="shrink-0" />
                            <span>No se pudo cargar el historial de visitas. Reintentá en unos segundos.</span>
                        </div>
                    ) : registros.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            {hasActiveDateFilters
                                ? 'No hay visitas en el rango de fechas seleccionado.'
                                : 'Este cliente aún no tiene servicios registrados.'}
                        </p>
                    ) : (
                        <div className="relative pl-4 border-l-2 border-border space-y-8 py-2 ml-2">
                            {registros.map((registro) => (
                                <div key={registro._id} className="relative ml-6 sm:ml-8">
                                    <div className={`absolute left-[-46px] sm:left-[-57px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white ${registro.touchupStatus === 'cancelled' ? 'bg-destructive' : 'bg-primary'}`}></div>
                                    <div className="bg-white border border-border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                            <div>
                                                <h4 className="text-base sm:text-lg font-medium text-foreground">{registro.service.name}</h4>
                                                <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mt-1 flex items-center gap-1.5"><FiCalendar /> {formatDate(registro.serviceDate)}</p>
                                                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                                                    <FiUser className="text-gray-400 shrink-0" />
                                                    {registro.professional ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="h-2.5 w-2.5 rounded-full border border-border shrink-0" style={{ backgroundColor: registro.professional.color }} aria-hidden />
                                                            {registro.professional.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">Sin asignar</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {registro.touchupStatus === 'completed' && (
                                                    <span className="bg-green-50 text-ring border border-green-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Retoque Listo</span>
                                                )}
                                                {registro.touchupStatus === 'cancelled' && (
                                                    <span className="bg-red-50 text-destructive border border-red-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Retoque Cancelado</span>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteRecord({
                                                            id: registro._id,
                                                            label: `${registro.service.name} — ${formatDate(registro.serviceDate)}`,
                                                        })}
                                                        aria-label="Eliminar visita"
                                                        title="Eliminar visita"
                                                        className="p-2 text-gray-400 hover:text-destructive hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {(registro.notes || registro.productsUsed) && (
                                            <div className="mt-4 pt-4 border-t border-border space-y-3">
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
                    {!isLoading && !isErrorHistory && registros.length > 0 && (
                        <Pagination page={page} total={totalRegistros} pageSize={PAGE_SIZE} onChange={setPage} />
                    )}
                </div>
            </div>

            <ClienteModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} clientToEdit={cliente} />
            <RegistroModal
                isOpen={isPastVisitModalOpen}
                onClose={() => setIsPastVisitModalOpen(false)}
                preselectedClientId={id}
                pastVisitMode
            />
            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => { deleteClient(); setIsDeleteConfirmOpen(false); }}
                title="Eliminar cliente"
                message="¿Estás seguro de que deseas eliminar este cliente y todo su historial? Esta acción no se puede deshacer."
                confirmLabel="Eliminar cliente"
            />
            <ConfirmModal
                isOpen={confirmDeleteRecord !== null}
                onClose={() => setConfirmDeleteRecord(null)}
                onConfirm={() => { if (confirmDeleteRecord) deleteServiceRecord(confirmDeleteRecord.id); }}
                title="Eliminar registro de visita"
                message={`¿Seguro que querés eliminar la visita "${confirmDeleteRecord?.label}"? Se restaurará el stock de los productos usados. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar visita"
                isPending={isDeletingRecord}
            />
        </div>
    );
}