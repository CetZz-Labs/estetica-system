import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiPlus, FiUsers, FiEdit2, FiSlash, FiRotateCcw, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiCalendar } from 'react-icons/fi';
import { toast } from 'sonner';

import {
    getProfessionals,
    deleteProfessional as deleteProfessionalApi,
    updateProfessional,
    ProfessionalDeleteConflict,
    type FutureAppointment,
} from '../api/professionalApi';
import { handleApiError } from '../api/errorHandler';
import type { Professional } from '../types';
import ProfesionalModal from '../components/ProfesionalModal';
import Modal from '../components/ui/Modal';

export default function Profesionales() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [professionalToEdit, setProfessionalToEdit] = useState<Professional | null>(null);

    // Estado del flujo de baja con turnos futuros
    const [conflictTarget, setConflictTarget] = useState<Professional | null>(null);
    const [conflictAppointments, setConflictAppointments] = useState<FutureAppointment[]>([]);

    const { data: profesionales, isLoading, isError } = useQuery<Professional[]>({
        queryKey: ['professionals'],
        queryFn: () => getProfessionals(true),
    });

    const { mutate: deactivate, isPending: isDeactivating } = useMutation({
        mutationFn: ({ id, confirm }: { id: string; confirm?: boolean }) => deleteProfessionalApi(id, confirm),
        onSuccess: () => {
            toast.success('Profesional desactivada');
            queryClient.invalidateQueries({ queryKey: ['professionals'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setConflictTarget(null);
            setConflictAppointments([]);
        },
        onError: (error, variables) => {
            if (error instanceof ProfessionalDeleteConflict) {
                const target = (profesionales || []).find((p) => p._id === variables.id) || null;
                setConflictTarget(target);
                setConflictAppointments(error.futureAppointments);
                return;
            }
            handleApiError(error, 'Error al desactivar la profesional');
        },
    });

    const { mutate: reactivate } = useMutation({
        mutationFn: (id: string) => updateProfessional(id, { isActive: true }),
        onSuccess: () => {
            toast.success('Profesional reactivada');
            queryClient.invalidateQueries({ queryKey: ['professionals'] });
        },
        onError: (error) => handleApiError(error, 'Error al reactivar la profesional'),
    });

    const handleEdit = (professional: Professional) => { setProfessionalToEdit(professional); setIsModalOpen(true); };
    const handleCreate = () => { setProfessionalToEdit(null); setIsModalOpen(true); };
    const handleDeactivate = (professional: Professional) => deactivate({ id: professional._id });
    const handleForceDeactivate = () => {
        if (conflictTarget) deactivate({ id: conflictTarget._id, confirm: true });
    };
    const closeConflict = () => {
        setConflictTarget(null);
        setConflictAppointments([]);
    };

    const formatStartTime = (iso: string) => new Date(iso).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });

    const conflictFooter = (
        <>
            <button
                type="button"
                onClick={closeConflict}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
                Volver
            </button>
            <button
                type="button"
                onClick={handleForceDeactivate}
                disabled={isDeactivating}
                className="bg-maison-red hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
                {isDeactivating ? 'Desactivando...' : 'Desactivar de todas formas'}
            </button>
        </>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Equipo</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Profesionales</h3>
                </div>
                <button onClick={handleCreate} className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm self-start sm:self-auto">
                    <FiPlus className="text-lg" /> Agregar Profesional
                </button>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-11 h-11 bg-gray-200 rounded-full"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3 mt-1"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-6 text-maison-red shadow-sm">
                    <FiAlertCircle aria-hidden className="shrink-0 text-xl" />
                    <span className="text-sm font-medium">No se pudieron cargar las profesionales. Reintentá en unos segundos.</span>
                </div>
            ) : profesionales?.length === 0 ? (
                <div className="bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiUsers className="text-2xl text-gray-400" />
                    </div>
                    <h4 className="text-lg font-serif text-maison-text mb-2">No hay profesionales registradas</h4>
                    <p className="text-sm text-gray-500">Agregá tu primera profesional para empezar a agendar turnos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {profesionales?.map((profesional) => (
                        <div key={profesional._id} className={`bg-maison-card border border-maison-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group ${profesional.isActive ? '' : 'opacity-75'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-11 h-11 rounded-full border border-maison-border shrink-0" style={{ backgroundColor: profesional.color }} aria-hidden />
                                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(profesional)} aria-label="Editar profesional" title="Editar" className="p-2 text-gray-400 hover:text-maison-primary transition-colors cursor-pointer"><FiEdit2 size={16} /></button>
                                    {profesional.isActive ? (
                                        <button onClick={() => handleDeactivate(profesional)} aria-label="Desactivar profesional" title="Desactivar" className="p-2 text-gray-400 hover:text-maison-red transition-colors cursor-pointer"><FiSlash size={16} /></button>
                                    ) : (
                                        <button onClick={() => reactivate(profesional._id)} aria-label="Reactivar profesional" title="Reactivar" className="p-2 text-gray-400 hover:text-maison-green transition-colors cursor-pointer"><FiRotateCcw size={16} /></button>
                                    )}
                                </div>
                            </div>
                            <h4 className="text-xl font-serif text-maison-text mb-3">{profesional.name}</h4>
                            <div className="flex flex-wrap gap-2">
                                {profesional.isActive ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-xs font-semibold uppercase tracking-widest text-maison-green">
                                        <FiCheckCircle /> Activa
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold uppercase tracking-widest text-gray-500">
                                        <FiSlash /> Inactiva
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ProfesionalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} professionalToEdit={professionalToEdit} />

            <Modal
                isOpen={!!conflictTarget}
                onClose={closeConflict}
                title="Turnos futuros asignados"
                subtitle={conflictTarget ? `${conflictTarget.name} tiene turnos próximos sin reasignar.` : undefined}
                maxWidth="max-w-lg"
                footer={conflictFooter}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-2 rounded-xl border border-orange-100 bg-orange-50 p-4 text-maison-orange">
                        <FiAlertTriangle aria-hidden className="shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">
                            Reasigná estos turnos a otra profesional desde la sección Turnos antes de desactivar,
                            o desactivá de todas formas: los turnos quedarán sin profesional activa.
                        </p>
                    </div>

                    <ul className="space-y-2">
                        {conflictAppointments.map((appt) => (
                            <li key={appt._id} className="flex items-center gap-3 rounded-xl border border-maison-border bg-maison-bg p-3">
                                <div className="p-2 bg-white rounded-full border border-maison-border text-gray-500 shrink-0">
                                    <FiCalendar />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-maison-text">{appt.client} · {appt.service}</p>
                                    <p className="text-xs text-gray-500">{formatStartTime(appt.startTime)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Modal>
        </div>
    );
}
