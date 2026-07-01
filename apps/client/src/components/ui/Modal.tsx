import { type ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface ModalProps {
    /** Controla si el modal está abierto */
    isOpen: boolean;
    /** Callback para cerrar el modal */
    onClose: () => void;
    /** Título del header */
    title: string;
    /** Subtítulo/descripción opcional del header */
    subtitle?: string;
    /** Ícono opcional a mostrar junto al título */
    icon?: ReactNode;
    /** Ancho máximo del contenedor. Por defecto "max-w-md" */
    maxWidth?: string;
    /** Clases extra para el contenedor interno (útil para flex / max-h) */
    containerClassName?: string;
    /** Contenido principal del modal */
    children: ReactNode;
    /** Sección footer opcional (botones, acciones) */
    footer?: ReactNode;
}

/**
 * Componente de modal reutilizable.
 *
 * Responsabilidad única: renderizar la estructura visual del modal
 * (overlay, contenedor, header, body, footer). La lógica de negocio
 * queda exclusivamente en el componente consumidor.
 *
 * @example
 * <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Servicio">
 *   <form>...</form>
 * </Modal>
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    maxWidth = "max-w-md",
    containerClassName = "",
    children,
    footer,
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div
                className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
            >
                {/* ── Header ── */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-maison-border bg-maison-bg shrink-0">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="p-2.5 bg-white border border-maison-border rounded-xl shadow-sm text-gray-600">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-serif text-maison-text">{title}</h2>
                            {subtitle && (
                                <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                        <FiX className="text-2xl" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {children}
                </div>

                {/* ── Footer (opcional) ── */}
                {footer && (
                    <div className="p-5 sm:p-6 border-t border-maison-border bg-gray-50/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
