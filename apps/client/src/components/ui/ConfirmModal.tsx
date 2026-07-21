import { FiAlertTriangle } from 'react-icons/fi';
import Modal from './Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    isPending?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    isPending = false,
}: Props) {
    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-ctrl text-sm font-medium bg-surface border border-[var(--dotted)] text-wine hover:bg-hover-soft transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="bg-alert-text hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-ctrl text-sm font-medium transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
                {isPending ? 'Procesando...' : confirmLabel}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={<FiAlertTriangle className="text-alert-text" size={18} />}
            maxWidth="max-w-sm"
            footer={footer}
        >
            <p className="text-sm text-text-2 leading-relaxed">{message}</p>
        </Modal>
    );
}
