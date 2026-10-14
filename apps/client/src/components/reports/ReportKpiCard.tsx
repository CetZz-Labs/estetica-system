import type { ReactElement } from 'react';

interface Props {
    label: string;
    value: number;
    icon: ReactElement;
    hint: string;
    tone: string;
}

export default function ReportKpiCard({ label, value, icon, hint, tone }: Props) {
    return (
        <div className="bg-surface border border-border rounded-card p-6 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-text-3 font-medium">{label}</p>
            <p className={`font-serif text-4xl font-semibold ${tone}`}>{value}</p>
            <p className={`flex items-center gap-1.5 text-xs ${tone}`}>
                {icon}
                <span>{hint}</span>
            </p>
        </div>
    );
}
