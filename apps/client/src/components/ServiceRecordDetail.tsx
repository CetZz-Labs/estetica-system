import { FiUser, FiScissors, FiClock, FiEdit2, FiCheck, FiCheckCircle, FiXCircle, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router';

import type { ServiceRecord } from '../types';
import { formatDate, getTodayDateString } from '../utils/dates';

interface TouchupEditProps {
    isEditing: boolean;
    dateInput: string;
    timeInput: string;
    isSaving: boolean;
    onDateChange: (value: string) => void;
    onTimeChange: (value: string) => void;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
}

interface Props {
    record: ServiceRecord;
    /**
     * Habilita la edición inline de `nextTouchupDate` (patrón P12, UX-28). Opcional:
     * solo la usa Dashboard.tsx, que sigue siendo dueño de la mutation — este componente
     * permanece de solo lectura (sin `useMutation` propio) y solo dispara los callbacks.
     */
    touchupEdit?: TouchupEditProps;
}

/**
 * Contenido de solo lectura con el detalle de una visita/retoque (cliente, servicio,
 * profesional, fecha del servicio, fecha/estado del próximo retoque, productos usados y
 * notas completas). Extraído del bloque "Detalle del Retoque" que vivía inline en
 * Dashboard.tsx (UX-80), análogo a `AppointmentDetail.tsx` (UX-16). Compartido entre
 * `Dashboard.tsx`, `Historial.tsx` y `ProfileClient.tsx` como `children` del `<Modal>`
 * compartido.
 */
export default function ServiceRecordDetail({ record, touchupEdit }: Props) {
    return (
        <div className="space-y-5">
            {record.touchupStatus !== 'pending' && (
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-pill border ${
                        record.touchupStatus === 'completed'
                            ? 'bg-sage-bg text-sage border-sage/20'
                            : 'bg-alert-bg text-alert-text border-alert-text/20'
                    }`}>
                        {record.touchupStatus === 'completed' ? <FiCheckCircle aria-hidden /> : <FiXCircle aria-hidden />}
                        {record.touchupStatus === 'completed' ? 'Retoque completado' : 'Retoque cancelado'}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                <div className="p-2 bg-surface rounded-full border border-border text-muted">
                    <FiUser className="text-lg" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-text">{`${record.client.firstName} ${record.client.lastName ?? ''}`.trim()}</p>
                    {record.client.phone && (
                        <p className="text-xs text-muted mt-0.5">{record.client.phone}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                <div className="p-2 bg-surface rounded-full border border-border text-muted">
                    <FiScissors className="text-lg" />
                </div>
                <p className="text-sm font-semibold text-text">{record.service.name}</p>
            </div>

            {record.professional && (
                <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                    <div className="p-2 bg-surface rounded-full border border-border text-muted">
                        <FiUser className="text-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-border shrink-0" style={{ backgroundColor: record.professional.color }} aria-hidden />
                        <p className="text-sm font-semibold text-text">{record.professional.name}</p>
                    </div>
                </div>
            )}

            {record.nextTouchupDate ? (
                <div className="flex items-start gap-3 p-3 bg-bg rounded-ctrl border border-border">
                    <div className="p-2 bg-surface rounded-full border border-border text-muted shrink-0">
                        <FiClock className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {touchupEdit?.isEditing ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="date"
                                        min={getTodayDateString()}
                                        value={touchupEdit.dateInput}
                                        onChange={(e) => touchupEdit.onDateChange(e.target.value)}
                                        aria-label="Fecha del próximo retoque"
                                        className="px-2.5 py-1.5 bg-surface border border-border rounded-ctrl text-sm text-text"
                                    />
                                    <input
                                        type="time"
                                        value={touchupEdit.timeInput}
                                        onChange={(e) => touchupEdit.onTimeChange(e.target.value)}
                                        aria-label="Hora del próximo retoque"
                                        className="px-2.5 py-1.5 bg-surface border border-border rounded-ctrl text-sm text-text"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={touchupEdit.onSave}
                                        disabled={!touchupEdit.dateInput || !touchupEdit.timeInput || touchupEdit.isSaving}
                                        className="px-3 py-1.5 bg-accent hover:opacity-90 text-white rounded-ctrl text-xs font-medium flex items-center gap-1.5 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiCheck size={14} /> Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={touchupEdit.onCancel}
                                        disabled={touchupEdit.isSaving}
                                        className="px-3 py-1.5 text-muted hover:text-text rounded-ctrl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-text">Retoque: {formatDate(record.nextTouchupDate)}</p>
                        )}
                        <p className="text-xs text-muted mt-1">Visita original: {formatDate(record.serviceDate)}</p>
                    </div>
                    {touchupEdit && !touchupEdit.isEditing && (
                        <button
                            type="button"
                            onClick={touchupEdit.onStartEdit}
                            aria-label="Editar fecha de retoque"
                            title="Editar fecha de retoque"
                            className="p-1.5 text-muted hover:text-accent transition-colors cursor-pointer shrink-0"
                        >
                            <FiEdit2 className="text-lg" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-bg rounded-ctrl border border-border">
                    <div className="p-2 bg-surface rounded-full border border-border text-muted">
                        <FiClock className="text-lg" />
                    </div>
                    <p className="text-sm text-muted">Fecha del servicio: {formatDate(record.serviceDate)}</p>
                </div>
            )}

            {record.productsUsed && record.productsUsed.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold tracking-widest text-muted uppercase mb-2">Productos utilizados</h4>
                    <ul className="space-y-1.5">
                        {record.productsUsed.map((pu, idx) => {
                            const productName = typeof pu.product === 'object' ? pu.product.name : 'Producto';
                            return (
                                <li key={idx} className="flex justify-between items-center text-sm bg-surface-2 border border-border-soft rounded-ctrl px-3 py-2">
                                    <span className="text-text">{productName}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted font-medium">x{pu.quantity}</span>
                                        {typeof pu.remainingLevel === 'number' && (
                                            <span className="text-muted text-xs">Quedó al {pu.remainingLevel}%</span>
                                        )}
                                        {pu.usedExistingUnit === true && (
                                            <span className="text-muted text-xs">Envase reutilizado</span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {record.notes && (
                <div>
                    <h4 className="text-xs font-bold tracking-widest text-muted uppercase mb-2">Notas</h4>
                    <p className="text-sm text-text-2 bg-surface-2 p-3 rounded-ctrl border border-border-soft break-words whitespace-pre-wrap">{record.notes}</p>
                </div>
            )}

            <Link
                to={`/clientes/${record.client._id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
                <FiExternalLink /> Ir a ficha del cliente
            </Link>
        </div>
    );
}
