import type { ReactNode } from 'react';
import type { ViewMode } from './reportShared';

interface Props {
    title: string;
    mode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    chart: ReactNode;
    table: ReactNode;
}

export default function ReportSection({ title, mode, onModeChange, chart, table }: Props) {
    return (
        <section className="bg-surface border border-border rounded-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-serif text-xl text-text">{title}</h2>
                <div className="inline-flex bg-hover-soft rounded-ctrl p-[3px]" role="group" aria-label={`Vista de ${title}`}>
                    {(['chart', 'table'] as ViewMode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            aria-pressed={mode === m}
                            onClick={() => onModeChange(m)}
                            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer transition-colors ${mode === m ? 'bg-surface text-wine shadow-sm' : 'text-text-3'}`}
                        >
                            {m === 'chart' ? 'Gráfico' : 'Tabla'}
                        </button>
                    ))}
                </div>
            </div>
            {mode === 'chart' ? chart : table}
        </section>
    );
}
