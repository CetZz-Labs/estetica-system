import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FiAlertTriangle, FiClock, FiTrendingUp } from 'react-icons/fi';
import { getOccupancyReport } from '../../api/reportApi';
import type { OccupancyReport } from '../../api/reportApi';
import { handleApiError } from '../../api/errorHandler';
import ReportSection from './ReportSection';
import ReportDataTable from './ReportDataTable';
import { WEEKDAY_LABELS } from './reportShared';
import type { ViewMode } from './reportShared';

interface Props {
    from: string;
    to: string;
    enabled: boolean;
}

const DEFAULT_HOURS = { start: 7, end: 22 };
const LEVELS = [25, 45, 70, 100];

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

const getLevel = (count: number, max: number): number => {
    if (count <= 0 || max <= 0) return -1;
    return Math.min(LEVELS.length - 1, Math.ceil((count / max) * LEVELS.length) - 1);
};

const cellBackground = (level: number): string =>
    level < 0 ? 'var(--color-hover-soft)' : `color-mix(in srgb, var(--color-accent) ${LEVELS[level]}%, transparent)`;

export default function OccupancySection({ from, to, enabled }: Props) {
    const [mode, setMode] = useState<ViewMode>('chart');

    const { data, isLoading, isError, error } = useQuery<OccupancyReport>({
        queryKey: ['reports', 'occupancy', from, to],
        queryFn: () => getOccupancyReport(from, to),
        placeholderData: keepPreviousData,
        enabled,
    });

    useEffect(() => {
        if (isError) handleApiError(error, 'Error al cargar el reporte de ocupación');
    }, [isError, error]);

    const { hours, grid, max } = useMemo(() => {
        const counts = new Map<string, number>();
        let start = DEFAULT_HOURS.start;
        let end = DEFAULT_HOURS.end;
        let maxCount = 0;
        (data?.heatmap ?? []).forEach((c) => {
            counts.set(`${c.weekday}-${c.hour}`, c.count);
            if (c.count > 0) {
                start = Math.min(start, c.hour);
                end = Math.max(end, c.hour);
                maxCount = Math.max(maxCount, c.count);
            }
        });
        const hoursList = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        return { hours: hoursList, grid: counts, max: maxCount };
    }, [data]);

    if (isLoading) {
        return (
            <section className="bg-surface border border-border rounded-card p-6 animate-pulse" aria-busy="true" aria-label="Cargando ocupación">
                <div className="h-5 w-32 bg-border rounded mb-4" />
                <div className="h-56 bg-border-soft rounded" />
            </section>
        );
    }

    if (!data) {
        return (
            <section className="bg-surface border border-border rounded-card p-6">
                <h2 className="font-serif text-xl text-text mb-3">Ocupación</h2>
                {isError ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-alert-text" role="alert">
                        <FiAlertTriangle aria-hidden="true" />
                        <span>No se pudo cargar la ocupación. Intentá de nuevo más tarde.</span>
                    </p>
                ) : (
                    <p className="text-sm text-text-3">Elegí un período válido para ver la ocupación.</p>
                )}
            </section>
        );
    }

    if (data.total === 0) {
        return (
            <section className="bg-surface border border-border rounded-card p-8 flex flex-col items-center gap-2 text-center">
                <FiClock size={28} className="text-muted" aria-hidden="true" />
                <h2 className="font-serif text-xl text-text">Sin ocupación en este período</h2>
                <p className="text-sm text-text-3">No hay turnos para armar el mapa de calor. Probá con otro rango.</p>
            </section>
        );
    }

    const peak = data.peak;
    const peakText = peak
        ? `Pico: ${WEEKDAY_LABELS[peak.weekday - 1]} ${hourLabel(peak.hour)} — ${peak.count} ${peak.count === 1 ? 'turno' : 'turnos'}`
        : null;
    const columns = `3rem repeat(${hours.length}, minmax(2.25rem, 1fr))`;

    const tableRows = data.heatmap
        .filter((c) => c.count > 0)
        .sort((a, b) => a.weekday - b.weekday || a.hour - b.hour)
        .map((c) => ({ label: `${WEEKDAY_LABELS[c.weekday - 1]} ${hourLabel(c.hour)}`, count: c.count }));

    const chart = (
        <div className="space-y-4">
            {isError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>No se pudo actualizar la ocupación. Mostrando los últimos datos cargados.</span>
                </p>
            )}
            {peakText && (
                <p className="flex items-center gap-2 text-sm font-semibold text-wine">
                    <FiTrendingUp aria-hidden="true" />
                    <span>{peakText}</span>
                </p>
            )}
            <div className="overflow-x-auto">
                <div
                    className="grid gap-1 min-w-[640px]"
                    style={{ gridTemplateColumns: columns }}
                    role="img"
                    aria-label={`Mapa de calor de turnos por día y hora. ${peakText ?? ''}`}
                >
                    <div />
                    {hours.map((h) => (
                        <div key={h} className="text-center text-[11px] text-text-3">{String(h).padStart(2, '0')}</div>
                    ))}
                    {WEEKDAY_LABELS.map((day, di) => (
                        <div key={day} className="contents">
                            <div className="flex items-center text-xs font-semibold text-text-2">{day}</div>
                            {hours.map((h) => {
                                const count = grid.get(`${di + 1}-${h}`) ?? 0;
                                const level = getLevel(count, max);
                                return (
                                    <div
                                        key={h}
                                        title={`${day} ${hourLabel(h)}: ${count} ${count === 1 ? 'turno' : 'turnos'}`}
                                        className={`h-9 rounded-[6px] flex items-center justify-center text-xs font-semibold ${level >= 2 ? 'text-white' : 'text-text'}`}
                                        style={{ backgroundColor: cellBackground(level) }}
                                    >
                                        {count > 0 ? count : ''}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
                <span>Menos turnos</span>
                <span className="h-4 w-4 rounded-[4px]" style={{ backgroundColor: cellBackground(-1) }} aria-hidden="true" />
                {LEVELS.map((_, i) => (
                    <span key={i} className="h-4 w-4 rounded-[4px]" style={{ backgroundColor: cellBackground(i) }} aria-hidden="true" />
                ))}
                <span>Más turnos</span>
            </div>
        </div>
    );

    return (
        <ReportSection
            title="Ocupación"
            mode={mode}
            onModeChange={setMode}
            chart={chart}
            table={<ReportDataTable caption="Turnos por día de la semana y hora" firstHeader="Día y hora" rows={tableRows} />}
        />
    );
}
