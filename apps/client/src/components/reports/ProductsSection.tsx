import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertCircle, FiAlertTriangle, FiBox, FiCheckCircle, FiDownload, FiLayers, FiRepeat } from 'react-icons/fi';
import { getProductsReport } from '../../api/reportApi';
import type { ProductsReport } from '../../api/reportApi';
import { handleApiError } from '../../api/errorHandler';
import { exportProductsReport } from '../../utils/exportReportProducts';
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
    usages: number;
    unitsConsumed: number;
}

const truncate = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const fullName = (name: string, brand: string) => (brand ? `${name} · ${brand}` : name);

export default function ProductsSection({ from, to, enabled }: Props) {
    const [mode, setMode] = useState<ViewMode>('chart');

    const { data, isLoading, isError, error } = useQuery<ProductsReport>({
        queryKey: ['reports', 'products', from, to],
        queryFn: () => getProductsReport(from, to),
        placeholderData: keepPreviousData,
        enabled,
    });

    useEffect(() => {
        if (isError) handleApiError(error, 'Error al cargar el reporte de productos');
    }, [isError, error]);

    const rows = useMemo<BarRow[]>(
        () =>
            (data?.topProducts ?? []).map((p) => {
                const name = fullName(p.name, p.brand);
                return { name, short: truncate(name), usages: p.usages, unitsConsumed: p.unitsConsumed };
            }),
        [data],
    );

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando productos">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
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
                <h2 className="font-serif text-xl text-text mb-3">Productos</h2>
                {isError ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-alert-text" role="alert">
                        <FiAlertTriangle aria-hidden="true" />
                        <span>No se pudo cargar el reporte de productos. Intentá de nuevo más tarde.</span>
                    </p>
                ) : (
                    <p className="text-sm text-text-3">Elegí un período válido para ver los productos.</p>
                )}
            </section>
        );
    }

    const { totals, lowStock } = data;
    const hasUsage = totals.usages > 0;
    const hasLowStock = lowStock.total > 0;
    const hasExportData = data.topProducts.length > 0 || lowStock.items.length > 0;
    const remaining = lowStock.total - lowStock.items.length;

    return (
        <div className="space-y-6">
            {isError && (
                <p className="flex items-center gap-1.5 text-sm text-alert-text" role="alert">
                    <FiAlertTriangle aria-hidden="true" />
                    <span>No se pudo actualizar el reporte de productos. Mostrando los últimos datos cargados.</span>
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl text-text">Productos</h2>
                <button
                    type="button"
                    onClick={() => exportProductsReport(data)}
                    disabled={!hasExportData}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-ctrl text-sm font-semibold border border-border bg-surface text-wine cursor-pointer hover:bg-hover-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiDownload aria-hidden="true" />
                    <span>Exportar a Excel</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ReportKpiCard label="Productos usados" value={totals.productsUsed} icon={<FiBox aria-hidden="true" />} hint="Productos distintos" tone="text-text" />
                <ReportKpiCard label="Usos" value={totals.usages} icon={<FiRepeat aria-hidden="true" />} hint="En visitas del período" tone="text-sage-text" />
                <ReportKpiCard label="Unidades consumidas" value={totals.unitsConsumed} icon={<FiLayers aria-hidden="true" />} hint="Descontadas del stock" tone="text-gold-text" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {hasUsage ? (
                    <ReportSection
                        title="Más usados"
                        mode={mode}
                        onModeChange={setMode}
                        chart={
                            <>
                                <div className="w-full" style={{ height: Math.max(180, rows.length * 36 + 40) }} role="img" aria-label="Gráfico de barras horizontales de los productos más usados">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                                            <CartesianGrid stroke="var(--color-border-soft)" horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                                            <YAxis type="category" dataKey="short" width={110} tick={AXIS_TICK} />
                                            <Tooltip
                                                contentStyle={TOOLTIP_STYLE}
                                                formatter={(v, _n, item) => [`${v} (${item.payload.unitsConsumed} unid. consumidas)`, 'Usos']}
                                                labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''}
                                            />
                                            <Bar dataKey="usages" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="mt-3 text-xs text-text-3">Las unidades consumidas no cuentan los envases abiertos que se reutilizan.</p>
                            </>
                        }
                        table={
                            <>
                                <ReportDataTable
                                    caption="Productos más usados"
                                    firstHeader="Producto"
                                    countHeader="Usos"
                                    extraHeader="Unidades"
                                    rows={rows.map((r) => ({ label: r.name, count: r.usages, extra: r.unitsConsumed }))}
                                />
                                <p className="mt-3 text-xs text-text-3">Las unidades consumidas no cuentan los envases abiertos que se reutilizan.</p>
                            </>
                        }
                    />
                ) : (
                    <section className="bg-surface border border-border rounded-card p-8 flex flex-col items-center gap-2 text-center">
                        <FiBox size={28} className="text-muted" aria-hidden="true" />
                        <h2 className="font-serif text-xl text-text">Sin uso de productos</h2>
                        <p className="text-sm text-text-3">No hay productos usados en este período. Probá con otro rango.</p>
                    </section>
                )}

                <section className="bg-surface border border-border rounded-card p-6">
                    <h2 className="font-serif text-xl text-text mb-4">Próximos a agotarse</h2>
                    {hasLowStock ? (
                        <>
                            <ul className="divide-y divide-border-soft">
                                {lowStock.items.map((item) => {
                                    const out = item.stock === 0;
                                    return (
                                        <li key={item.productId} className="flex items-center justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text truncate" title={fullName(item.name, item.brand)}>{item.name}</p>
                                                {item.brand && <p className="text-xs text-text-3 truncate">{item.brand}</p>}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-sm font-semibold text-text">{item.stock}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${out ? 'bg-alert-bg text-alert-text' : 'bg-gold-bg text-gold-text'}`}>
                                                    {out ? <FiAlertCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
                                                    <span>{out ? 'Agotado' : 'Stock bajo'}</span>
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            {remaining > 0 && (
                                <p className="mt-4 text-sm text-text-3">
                                    y {remaining} más.{' '}
                                    <Link to="/inventario" className="font-semibold text-accent hover:opacity-80 transition-opacity">
                                        Ver en Inventario
                                    </Link>
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <FiCheckCircle size={28} className="text-sage-text" aria-hidden="true" />
                            <p className="font-serif text-lg text-text">Sin productos con stock bajo</p>
                            <p className="text-sm text-text-3">Todo el inventario está por encima del umbral ({lowStock.threshold}).</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
