import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Props {
    page: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
}

/**
 * Controles de paginación reutilizables para listados server-side.
 * Ver docs/patterns-frontend.md § P6.
 */
export default function Pagination({ page, total, pageSize, onChange }: Props) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6" aria-label="Paginación">
            <span aria-live="polite" className="text-sm text-muted">
                Mostrando {from}–{to} de {total}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-surface border border-[var(--dotted)] text-wine rounded-ctrl hover:bg-hover-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                >
                    <FiChevronLeft /> Anterior
                </button>
                <button
                    type="button"
                    aria-current={page >= totalPages ? undefined : "page"}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-surface border border-[var(--dotted)] text-wine rounded-ctrl hover:bg-hover-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={page >= totalPages}
                    onClick={() => onChange(page + 1)}
                >
                    Siguiente <FiChevronRight />
                </button>
            </div>
        </nav>
    );
}
