import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiDownload, FiRepeat, FiUserCheck, FiUserPlus, FiUsers } from 'react-icons/fi';
import { getClientsReport } from '../../api/reportApi';
import type { ClientsReport } from '../../api/reportApi';
import { handleApiError } from '../../api/errorHandler';
import { exportInactiveClients } from '../../utils/exportReportClients';
import { formatCalendarDate } from '../../utils/dates';
import ReportSection from './ReportSection';
import ReportDataTable from './ReportDataTable';
import ReportKpiCard from './ReportKpiCard';
import { TOOLTIP_STYLE } from './reportShared';
import type { ViewMode } from './reportShared';

interface Props {
    from: string;
    to: string;
    enabled: boolean;
}

const EXPORT_LIMIT = 20;

const pct = (part: number, total: number): number => (total > 0 ? Math.round((part / total) * 100) : 0);

export default function ClientsSection({ from, to, enabled }: Props) {
    const [mode, setMode] = useState<ViewMode>('chart');

    const { data, isLoading, isError, error } = useQuery<ClientsReport>({
        queryKey: ['reports', 'clients', from, to],
        queryFn: () => getClientsReport(from, to),
        placeholderData: keepPreviousData,
        enabled,
    });

    useEffect(() => {
        if (isError) handleApiError(error, 'Error al cargar el reporte de clientes');
    }, [isError, error]);

    const mix = useMemo(() => {
        const served = data?.totals.clientsServed ?? 0;
        const n = data?.totals.newClients ?? 0;
        const r = data?.totals.returningClients ?? 0;
        return {
            bar: [{ name: 'Clientes', nuevos: n, recurrentes: r }],
            newPct: pct(n, served),
            returningPct: pct(r, served),
        };
    }, [data]);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando clientes">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface border border-border rounded-card p-6 space-y-3">
                            <div className="h-3 w-24 bg-border rounded" />
                            <div className="h-9 w-16 bg-border rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-surface border border-border rounded-card p-6">
                    <div className="h-40 bg-border-soft rounded" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <section className="bg-surface border border-border rounded-card p-6">
                <h2 className="font-serif text-xl text-text mb-3">Clientes</h2>
                {isError ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-alert-text" role="alert">
                        <FiAlertTriangle aria-hidden="true" />
                        <span>No se pudo cargar el reporte de clientes. Intentá de nuevo más tarde.</span>
                    </p>
                ) : (
                    <p className="text-sm text-text-3">Elegí un período válido para ver los clientes.</p>
                )}
            </section>
        );
    }

    const { totals, avgVisitIntervalDays, inactive } = data;
    const hasServed = totals.clientsServed > 0;
    const hasInactive = inactive.total > 0;
    const remaining = inactive.total - inactive.items.length;
    const avgLabel = avgVisitIntervalDays === null ? 'Sin datos suficientes' : `Cada ${Math.round(avgVisitIntervalDays)} días`;

    return (
        <div className="space-y-6">
            {isError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>No se pudo actualizar el reporte de clientes. Mostrando los últimos datos cargados.</span>
                </p>
            )}

            <h2 className="font-serif text-xl text-text">Clientes</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportKpiCard label="Clientes atendidos" value={totals.clientsServed} icon={<FiUsers aria-hidden="true" />} hint="En el período" tone="text-text" />
                <ReportKpiCard
                    label="Tasa de retorno"
                    value={`${Math.round(totals.returnRate * 100)}%`}
                    icon={<FiRepeat aria-hidden="true" />}
                    hint="Clientes que ya habían venido"
                    tone="text-sage-text"
                />
                <ReportKpiCard
                    label="Nuevos vs. recurrentes"
                    value={`${totals.newClients} / ${totals.returningClients}`}
                    icon={<FiUserPlus aria-hidden="true" />}
                    hint="Nuevos / recurrentes"
                    tone="text-gold-text"
                />
                <ReportKpiCard
                    label="Frecuencia promedio"
                    value={avgLabel}
                    compact={avgVisitIntervalDays === null}
                    icon={<FiClock aria-hidden="true" />}
                    hint="Entre visitas de un mismo cliente"
                    tone="text-text"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {hasServed ? (
                    <ReportSection
                        title="Nuevos vs. recurrentes"
                        mode={mode}
                        onModeChange={setMode}
                        chart={
                            <>
                                <div className="h-24 w-full" role="img" aria-label={`Barra apilada: ${totals.newClients} clientes nuevos y ${totals.returningClients} recurrentes`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={mix.bar} layout="vertical" stackOffset="expand" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" hide />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [String(v), name === 'nuevos' ? 'Nuevos' : 'Recurrentes']} />
                                            <Bar dataKey="nuevos" stackId="mix" fill="var(--color-accent)" radius={[4, 0, 0, 4]} />
                                            <Bar dataKey="recurrentes" stackId="mix" fill="var(--color-wine)" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    <li className="flex items-center gap-1.5 text-sm text-accent">
                                        <FiUserPlus aria-hidden="true" />
                                        <span>Nuevos: <strong>{totals.newClients}</strong> ({mix.newPct}%)</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-sm text-wine">
                                        <FiUserCheck aria-hidden="true" />
                                        <span>Recurrentes: <strong>{totals.returningClients}</strong> ({mix.returningPct}%)</span>
                                    </li>
                                </ul>
                            </>
                        }
                        table={
                            <ReportDataTable
                                caption="Clientes nuevos y recurrentes"
                                firstHeader="Tipo"
                                countHeader="Clientes"
                                extraHeader="%"
                                rows={[
                                    { label: 'Nuevos', count: totals.newClients, extra: mix.newPct },
                                    { label: 'Recurrentes', count: totals.returningClients, extra: mix.returningPct },
                                ]}
                            />
                        }
                    />
                ) : (
                    <section className="bg-surface border border-border rounded-card p-8 flex flex-col items-center gap-2 text-center">
                        <FiUsers size={28} className="text-muted" aria-hidden="true" />
                        <h2 className="font-serif text-xl text-text">Sin clientes atendidos</h2>
                        <p className="text-sm text-text-3">No hay visitas registradas en este período. Probá con otro rango.</p>
                    </section>
                )}

                <section className="bg-surface border border-border rounded-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <h2 className="font-serif text-xl text-text">Clientes inactivos (+{inactive.thresholdDays} días sin visita)</h2>
                        <button
                            type="button"
                            onClick={() => exportInactiveClients(inactive.items)}
                            disabled={!hasInactive}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-ctrl text-sm font-semibold border border-border bg-surface text-wine cursor-pointer hover:bg-hover-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FiDownload aria-hidden="true" />
                            <span>Exportar inactivos</span>
                        </button>
                    </div>
                    {hasInactive ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[420px]">
                                    <caption className="sr-only">Clientes inactivos</caption>
                                    <thead>
                                        <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-text-3">
                                            <th scope="col" className="py-2 font-semibold">Cliente</th>
                                            <th scope="col" className="py-2 pl-2 font-semibold">Última visita</th>
                                            <th scope="col" className="py-2 pl-2 text-right font-semibold">Días</th>
                                            <th scope="col" className="py-2 pl-2 text-right font-semibold">Visitas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inactive.items.map((c) => (
                                            <tr key={c.clientId} className="border-b border-border-soft">
                                                <td className="py-2 text-text">
                                                    <Link to={`/clientes/${c.clientId}`} className="font-medium text-accent hover:opacity-80 transition-opacity">
                                                        {c.name}
                                                    </Link>
                                                </td>
                                                <td className="py-2 pl-2 text-text whitespace-nowrap">{formatCalendarDate(c.lastVisit)}</td>
                                                <td className="py-2 pl-2 text-right">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gold-bg text-gold-text whitespace-nowrap">
                                                        <FiClock aria-hidden="true" />
                                                        <span>Inactivo · {c.daysSince} d</span>
                                                    </span>
                                                </td>
                                                <td className="py-2 pl-2 text-right font-semibold text-text">{c.visits}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {remaining > 0 && <p className="mt-4 text-sm text-text-3">y {remaining} más.</p>}
                            {inactive.total > EXPORT_LIMIT && (
                                <p className="mt-2 text-xs text-text-3">La exportación incluye solo los primeros {EXPORT_LIMIT} clientes.</p>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <FiCheckCircle size={28} className="text-sage-text" aria-hidden="true" />
                            <p className="font-serif text-lg text-text">Ningún cliente inactivo</p>
                            <p className="text-sm text-text-3">Todos los clientes activos visitaron en los últimos {inactive.thresholdDays} días.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
