import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { FiBarChart2, FiCalendar, FiCheckCircle, FiClock, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { getAppointmentsReport } from '../api/reportApi';
import type { AppointmentsReport } from '../api/reportApi';
import { handleApiError } from '../api/errorHandler';
import { useTopbar } from '../layouts/TopbarContext';
import { formatCalendarDate, getTodayDateString } from '../utils/dates';
import { getStatusLabel, getStatusPalette } from '../utils/appointmentStatus';

type Preset = '7' | '30' | '90' | 'custom';
type ViewMode = 'chart' | 'table';

const PRESETS: { id: Preset; label: string }[] = [
    { id: '7', label: 'Semana' },
    { id: '30', label: 'Mes' },
    { id: '90', label: '3 meses' },
    { id: 'custom', label: 'Rango personalizado' },
];

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

const toUtcMs = (date: string): number => {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

const toDateString = (ms: number): string => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Rango [hoy - (días - 1), hoy] en formato YYYY-MM-DD. */
const getPresetRange = (days: number): { from: string; to: string } => {
    const to = getTodayDateString();
    return { from: toDateString(toUtcMs(to) - (days - 1) * DAY_MS), to };
};

const shortDay = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

const STATUS_ORDER = ['completed', 'confirmed', 'pending', 'cancelled'] as const;

const STATUS_ICON: Record<(typeof STATUS_ORDER)[number], ReactElement> = {
    completed: <FiCheckCircle aria-hidden="true" />,
    confirmed: <FiCalendar aria-hidden="true" />,
    pending: <FiClock aria-hidden="true" />,
    cancelled: <FiXCircle aria-hidden="true" />,
};

const CHART_COLOR = 'var(--color-accent)';
const AXIS_TICK = { fontSize: 11, fill: 'var(--color-text-3)' };
const TOOLTIP_STYLE = {
    borderRadius: 10,
    border: '1px solid var(--color-border)',
    fontSize: 12,
};

interface SectionProps {
    title: string;
    mode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    chart: ReactNode;
    table: ReactNode;
}

function ReportSection({ title, mode, onModeChange, chart, table }: SectionProps) {
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

interface DataTableProps {
    caption: string;
    firstHeader: string;
    rows: { label: string; count: number }[];
}

function DataTable({ caption, firstHeader, rows }: DataTableProps) {
    return (
        <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-text-3">
                        <th scope="col" className="py-2 font-semibold">{firstHeader}</th>
                        <th scope="col" className="py-2 text-right font-semibold">Turnos</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-b border-border-soft">
                            <td className="py-2 text-text">{row.label}</td>
                            <td className="py-2 text-right font-semibold text-text">{row.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface KpiProps {
    label: string;
    value: number;
    icon: ReactElement;
    hint: string;
    tone: string;
}

function KpiCard({ label, value, icon, hint, tone }: KpiProps) {
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

export default function Reportes() {
    const [preset, setPreset] = useState<Preset>('30');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [dayMode, setDayMode] = useState<ViewMode>('chart');
    const [statusMode, setStatusMode] = useState<ViewMode>('chart');
    const [weekdayMode, setWeekdayMode] = useState<ViewMode>('chart');

    useTopbar({ title: 'Reportes' });

    const rangeError = useMemo(() => {
        if (preset !== 'custom') return null;
        if (!customFrom || !customTo) return 'Elegí la fecha desde y hasta para ver el reporte.';
        if (customFrom > customTo) return 'La fecha desde no puede ser posterior a la fecha hasta.';
        if ((toUtcMs(customTo) - toUtcMs(customFrom)) / DAY_MS + 1 > MAX_RANGE_DAYS) {
            return `El rango máximo es de ${MAX_RANGE_DAYS} días.`;
        }
        return null;
    }, [preset, customFrom, customTo]);

    const range = useMemo(() => {
        if (preset === 'custom') return { from: customFrom, to: customTo };
        return getPresetRange(Number(preset));
    }, [preset, customFrom, customTo]);

    const canQuery = preset !== 'custom' || rangeError === null;

    const { data, isLoading, isError, error } = useQuery<AppointmentsReport>({
        queryKey: ['reports', 'appointments', range.from, range.to],
        queryFn: () => getAppointmentsReport(range.from, range.to),
        placeholderData: keepPreviousData,
        enabled: canQuery,
    });

    useEffect(() => {
        if (isError) handleApiError(error, 'Error al cargar el reporte de turnos');
    }, [isError, error]);

    const byDayRows = useMemo(() => {
        if (!data) return [];
        const counts = new Map(data.byDay.map((d) => [d.date, d.count]));
        const start = toUtcMs(data.range.from);
        const end = toUtcMs(data.range.to);
        const rows: { date: string; label: string; count: number }[] = [];
        for (let ms = start; ms <= end && rows.length < MAX_RANGE_DAYS; ms += DAY_MS) {
            const date = toDateString(ms);
            rows.push({ date, label: shortDay(date), count: counts.get(date) ?? 0 });
        }
        return rows;
    }, [data]);

    const weekdayRows = useMemo(() => {
        const counts = new Map((data?.byWeekday ?? []).map((w) => [w.weekday, w.count]));
        return WEEKDAY_LABELS.map((label, i) => ({ label, count: counts.get(i + 1) ?? 0 }));
    }, [data]);

    const statusRows = useMemo(() => {
        if (!data) return [];
        return STATUS_ORDER.map((status) => ({
            status,
            label: getStatusLabel(status),
            count: data.totals[status],
            color: getStatusPalette(status).text,
        }));
    }, [data]);

    const periodLabel = data ? `${formatCalendarDate(data.range.from)} – ${formatCalendarDate(data.range.to)}` : '';

    const periodSelector = (
        <div className="bg-surface border border-border rounded-card p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período del reporte">
                {PRESETS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        aria-pressed={preset === p.id}
                        onClick={() => setPreset(p.id)}
                        className={`px-4 py-2 rounded-ctrl text-sm font-semibold cursor-pointer transition-colors border ${preset === p.id ? 'bg-accent text-white border-accent' : 'bg-surface text-wine border-dotted hover:bg-hover-soft'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            {preset === 'custom' && (
                <div className="flex flex-wrap items-end gap-4">
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-text-3">
                        Desde
                        <input
                            type="date"
                            value={customFrom}
                            max={customTo || undefined}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="border border-border rounded-ctrl px-3.5 py-2 bg-bg text-sm normal-case tracking-normal text-text focus:outline-none focus:border-accent-rose"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-widest text-text-3">
                        Hasta
                        <input
                            type="date"
                            value={customTo}
                            min={customFrom || undefined}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="border border-border rounded-ctrl px-3.5 py-2 bg-bg text-sm normal-case tracking-normal text-text focus:outline-none focus:border-accent-rose"
                        />
                    </label>
                </div>
            )}
            {rangeError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>{rangeError}</span>
                </p>
            )}
            {data && canQuery && (
                <p className="text-sm text-text-3">Período: {periodLabel}</p>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="space-y-6" aria-busy="true" aria-label="Cargando reporte">
                {periodSelector}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface border border-border rounded-card p-6 space-y-3">
                            <div className="h-3 w-24 bg-border rounded" />
                            <div className="h-9 w-16 bg-border rounded" />
                            <div className="h-3 w-20 bg-border rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-surface border border-border rounded-card p-6 animate-pulse">
                    <div className="h-64 bg-border-soft rounded" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="space-y-6">
                {periodSelector}
                {isError ? (
                    <div className="bg-surface border border-border rounded-card p-6 flex items-center gap-2 text-alert-text" role="alert">
                        <FiAlertTriangle aria-hidden="true" />
                        <span className="text-sm font-medium">No se pudo cargar el reporte. Intentá de nuevo más tarde.</span>
                    </div>
                ) : (
                    <div className="bg-surface border border-border rounded-card p-6 text-sm text-text-3">
                        Elegí un período válido para ver el reporte.
                    </div>
                )}
            </div>
        );
    }

    const { totals } = data;

    return (
        <div className="space-y-6">
            {periodSelector}

            {isError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>No se pudo actualizar el reporte. Mostrando los últimos datos cargados.</span>
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total de turnos" value={totals.total} icon={<FiBarChart2 aria-hidden="true" />} hint="En el período" tone="text-text" />
                <KpiCard label="Completados" value={totals.completed} icon={<FiCheckCircle aria-hidden="true" />} hint="Atendidos" tone="text-sage-text" />
                <KpiCard label="Cancelados" value={totals.cancelled} icon={<FiXCircle aria-hidden="true" />} hint="Cancelados" tone="text-alert-text" />
                <KpiCard label="Pendientes / confirmados" value={totals.pending + totals.confirmed} icon={<FiClock aria-hidden="true" />} hint={`${totals.pending} pendientes · ${totals.confirmed} confirmados`} tone="text-gold-text" />
            </div>

            {totals.total === 0 ? (
                <div className="bg-surface border border-border rounded-card p-8 flex flex-col items-center gap-2 text-center">
                    <FiBarChart2 size={28} className="text-muted" aria-hidden="true" />
                    <p className="font-serif text-xl text-text">Sin turnos en este período</p>
                    <p className="text-sm text-text-3">Probá con otro rango de fechas para ver la actividad.</p>
                </div>
            ) : (
                <>
                    <ReportSection
                        title="Turnos por día"
                        mode={dayMode}
                        onModeChange={setDayMode}
                        chart={
                            <div className="h-64 w-full" role="img" aria-label={`Gráfico de barras de turnos por día. ${periodLabel}`}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={byDayRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                        <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
                                        <XAxis dataKey="label" tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} />
                                        <YAxis allowDecimals={false} tick={AXIS_TICK} />
                                        <Tooltip
                                            contentStyle={TOOLTIP_STYLE}
                                            formatter={(v) => [String(v), 'Turnos']}
                                            labelFormatter={(_, p) => {
                                                const date = p?.[0]?.payload?.date;
                                                return date ? formatCalendarDate(date) : '';
                                            }}
                                        />
                                        <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        }
                        table={
                            <DataTable
                                caption="Turnos por día"
                                firstHeader="Día"
                                rows={byDayRows.map((r) => ({ label: formatCalendarDate(r.date), count: r.count }))}
                            />
                        }
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ReportSection
                            title="Distribución por estado"
                            mode={statusMode}
                            onModeChange={setStatusMode}
                            chart={
                                <>
                                    <div className="h-56 w-full" role="img" aria-label="Gráfico de barras horizontales de turnos por estado">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statusRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                                <CartesianGrid stroke="var(--color-border-soft)" horizontal={false} />
                                                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                                                <YAxis type="category" dataKey="label" width={84} tick={AXIS_TICK} />
                                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [String(v), 'Turnos']} />
                                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                    {statusRows.map((r) => (
                                                        <Cell key={r.status} fill={r.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                        {statusRows.map((r) => (
                                            <li key={r.status} className="flex items-center gap-1.5 text-sm" style={{ color: r.color }}>
                                                {STATUS_ICON[r.status]}
                                                <span>{r.label}: <strong>{r.count}</strong></span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            }
                            table={
                                <DataTable
                                    caption="Turnos por estado"
                                    firstHeader="Estado"
                                    rows={statusRows.map((r) => ({ label: r.label, count: r.count }))}
                                />
                            }
                        />

                        <ReportSection
                            title="Turnos por día de la semana"
                            mode={weekdayMode}
                            onModeChange={setWeekdayMode}
                            chart={
                                <div className="h-64 w-full" role="img" aria-label="Gráfico de barras de turnos por día de la semana">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weekdayRows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
                                            <XAxis dataKey="label" tick={AXIS_TICK} />
                                            <YAxis allowDecimals={false} tick={AXIS_TICK} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [String(v), 'Turnos']} />
                                            <Bar dataKey="count" fill="var(--color-wine)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            }
                            table={<DataTable caption="Turnos por día de la semana" firstHeader="Día" rows={weekdayRows} />}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
