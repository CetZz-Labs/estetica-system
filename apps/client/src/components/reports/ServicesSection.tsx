import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertTriangle, FiScissors, FiUsers } from 'react-icons/fi';
import { getServicesReport } from '../../api/reportApi';
import type { ServicesReport } from '../../api/reportApi';
import { handleApiError } from '../../api/errorHandler';
import ReportSection from './ReportSection';
import ReportDataTable from './ReportDataTable';
import ReportKpiCard from './ReportKpiCard';
import { AXIS_TICK, TOOLTIP_STYLE } from './reportShared';
import type { ViewMode } from './reportShared';

interface Props {
    from: string;
    to: string;
    enabled: boolean;
}

interface BarRow {
    name: string;
    short: string;
    count: number;
    color: string;
}

const NEUTRAL_COLOR = 'var(--color-muted)';
const ACCENT_COLOR = 'var(--color-accent)';
const truncate = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const renderBarChart = (rows: BarRow[], label: string) => (
    <div className="w-full" style={{ height: Math.max(180, rows.length * 36 + 40) }} role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border-soft)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                <YAxis type="category" dataKey="short" width={110} tick={AXIS_TICK} />
                <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [String(v), 'Visitas']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {rows.map((r, i) => (
                        <Cell key={i} fill={r.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export default function ServicesSection({ from, to, enabled }: Props) {
    const [servicesMode, setServicesMode] = useState<ViewMode>('chart');
    const [professionalMode, setProfessionalMode] = useState<ViewMode>('chart');

    const { data, isLoading, isError, error } = useQuery<ServicesReport>({
        queryKey: ['reports', 'services', from, to],
        queryFn: () => getServicesReport(from, to),
        placeholderData: keepPreviousData,
        enabled,
    });

    useEffect(() => {
        if (isError) handleApiError(error, 'Error al cargar el reporte de servicios');
    }, [isError, error]);

    const serviceRows = useMemo<BarRow[]>(
        () => (data?.topServices ?? []).map((s) => ({ name: s.name, short: truncate(s.name), count: s.count, color: ACCENT_COLOR })),
        [data],
    );
    const professionalRows = useMemo<BarRow[]>(
        () => (data?.byProfessional ?? []).map((p) => ({ name: p.name, short: truncate(p.name), count: p.count, color: p.color ?? NEUTRAL_COLOR })),
        [data],
    );

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando servicios">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[0, 1].map((i) => (
                        <div key={i} className="bg-surface border border-border rounded-card p-6 space-y-3">
                            <div className="h-3 w-24 bg-border rounded" />
                            <div className="h-9 w-16 bg-border rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-surface border border-border rounded-card p-6">
                    <div className="h-56 bg-border-soft rounded" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <section className="bg-surface border border-border rounded-card p-6">
                <h2 className="font-serif text-xl text-text mb-3">Servicios</h2>
                {isError ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-alert-text" role="alert">
                        <FiAlertTriangle aria-hidden="true" />
                        <span>No se pudo cargar el reporte de servicios. Intentá de nuevo más tarde.</span>
                    </p>
                ) : (
                    <p className="text-sm text-text-3">Elegí un período válido para ver los servicios.</p>
                )}
            </section>
        );
    }

    if (data.totals.visits === 0) {
        return (
            <section className="bg-surface border border-border rounded-card p-8 flex flex-col items-center gap-2 text-center">
                <FiScissors size={28} className="text-muted" aria-hidden="true" />
                <h2 className="font-serif text-xl text-text">Sin visitas en este período</h2>
                <p className="text-sm text-text-3">No hay visitas registradas para ver servicios y profesionales. Probá con otro rango.</p>
            </section>
        );
    }

    return (
        <div className="space-y-6">
            {isError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>No se pudo actualizar el reporte de servicios. Mostrando los últimos datos cargados.</span>
                </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReportKpiCard label="Visitas" value={data.totals.visits} icon={<FiScissors aria-hidden="true" />} hint="Registradas en el período" tone="text-text" />
                <ReportKpiCard label="Clientes atendidos" value={data.totals.clientsServed} icon={<FiUsers aria-hidden="true" />} hint="Clientes distintos" tone="text-sage-text" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReportSection
                    title="Servicios más realizados"
                    mode={servicesMode}
                    onModeChange={setServicesMode}
                    chart={serviceRows.length > 0 ? renderBarChart(serviceRows, 'Gráfico de barras horizontales de los servicios más realizados') : <p className="text-sm text-text-3">Sin servicios para mostrar.</p>}
                    table={<ReportDataTable caption="Servicios más realizados" firstHeader="Servicio" countHeader="Visitas" rows={serviceRows.map((r) => ({ label: r.name, count: r.count }))} />}
                />
                <ReportSection
                    title="Visitas por profesional"
                    mode={professionalMode}
                    onModeChange={setProfessionalMode}
                    chart={professionalRows.length > 0 ? renderBarChart(professionalRows, 'Gráfico de barras horizontales de visitas por profesional') : <p className="text-sm text-text-3">Sin profesionales para mostrar.</p>}
                    table={<ReportDataTable caption="Visitas por profesional" firstHeader="Profesional" countHeader="Visitas" rows={professionalRows.map((r) => ({ label: r.name, count: r.count }))} />}
                />
            </div>
        </div>
    );
}
