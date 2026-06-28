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
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="bg-maison-red hover:bg-red-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
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
            icon={<FiAlertTriangle className="text-maison-red" size={18} />}
            maxWidth="max-w-sm"
            footer={footer}
        >
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </Modal>
    );
}
