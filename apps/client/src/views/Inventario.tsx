import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { FiBox, FiAlertTriangle, FiEdit2, FiTrash2, FiLayers, FiActivity, FiUploadCloud, FiSearch, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'sonner';

import { getProductsPage, getProductStats, deleteProduct as deleteProductApi } from '../api/productApi';
import type { ProductStats } from '../api/productApi';
import { handleApiError } from '../api/errorHandler';
import type { Paginated, Product } from '../types';
import ProductoModal from '../components/ProductoModal';
import AjusteStockModal from '../components/AjusteStockModal';
import CargaMasivaModal from '../components/CargaMasivaModal';
import StockIndicator from '../components/StockIndicator';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import { useTopbar } from '../layouts/TopbarContext';
import useDebounce from '../utils/useDebounce';

const PAGE_SIZE = 7;

export default function Inventario() {

    const queryClient = useQueryClient();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCargaMasivaModalOpen, setIsCargaMasivaModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [page, setPage] = useState(1);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const handleNewProduct = () => { setSelectedProduct(null); setIsProductModalOpen(true); };

    useTopbar({
        title: 'Inventario',
        primaryAction: { label: '+ Nuevo Producto', onClick: handleNewProduct },
    });

    const debouncedSearch = useDebounce(searchTerm.trim(), 300);

    const { data, isLoading, isError } = useQuery<Paginated<Product>>({
        queryKey: ['products', 'list', { page, limit: PAGE_SIZE, search: debouncedSearch, lowStock: filterLowStock }],
        queryFn: () => getProductsPage({ page, limit: PAGE_SIZE, search: debouncedSearch, lowStock: filterLowStock }),
        placeholderData: keepPreviousData,
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery<ProductStats>({
        queryKey: ['products', 'stats'],
        queryFn: getProductStats,
    });

    const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteProductApi(id),
        onSuccess: () => {
            toast.success('Producto eliminado');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setConfirmDelete(null);
            // Si se eliminó el último ítem de una página > 1, volver a la anterior.
            if (items.length === 1 && page > 1) setPage(page - 1);
        },
        onError: (error) => handleApiError(error, 'No se puede eliminar el producto')
    });

    const items = data?.data ?? [];
    const total = data?.meta.total ?? 0;
    const hasActiveFilters = debouncedSearch !== '' || filterLowStock;

    const totalProducts = stats?.total ?? 0;
    const outOfStock = stats?.outOfStock ?? 0;
    const lowStock = stats?.lowStock ?? 0;

    const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };
    const handleLowStockChange = (value: boolean) => { setFilterLowStock(value); setPage(1); };

    const handleEditProduct = (product: Product) => { setSelectedProduct(product); setIsProductModalOpen(true); };
    const handleAdjustStock = (product: Product) => { setSelectedProduct(product); setIsStockModalOpen(true); };
    const handleDeleteProduct = (id: string, name: string) => { setConfirmDelete({ id, name }); };

    const renderStatusBadge = (isReponer: boolean) => (
        isReponer ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-pill bg-alert-bg text-alert-text text-[11.5px] font-semibold">
                <FiAlertTriangle aria-hidden /> Reponer
            </span>
        ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-pill bg-sage-bg text-sage-text text-[11.5px] font-semibold">
                <FiCheckCircle aria-hidden /> En stock
            </span>
        )
    );

    const renderActions = (product: Product) => (
        <>
            <button
                type="button"
                onClick={() => handleAdjustStock(product)}
                title="Ajustar stock"
                className="px-3 py-1.5 text-xs font-semibold bg-surface border border-[var(--dotted)] text-wine rounded-ctrl hover:bg-hover-soft transition-colors flex items-center gap-1.5 cursor-pointer"
            >
                <FiActivity aria-hidden /> Stock
            </button>
            <button
                type="button"
                onClick={() => handleEditProduct(product)}
                title="Editar detalles"
                aria-label={`Editar ${product.name}`}
                className="p-1.5 text-text-3 hover:text-text transition-colors cursor-pointer"
            >
                <FiEdit2 size={16} aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => handleDeleteProduct(product._id, product.name)}
                title="Eliminar producto"
                aria-label={`Eliminar ${product.name}`}
                className="p-1.5 text-text-3 hover:text-alert-text transition-colors cursor-pointer"
            >
                <FiTrash2 size={16} aria-hidden />
            </button>
        </>
    );

    return (
        <div className="max-w-6xl mx-auto">

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {isLoadingStats ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-surface border border-border rounded-card p-6 flex items-center gap-4 animate-pulse">
                            <div className="w-11 h-11 rounded-ctrl bg-surface-2 shrink-0" />
                            <div className="space-y-2 flex-1">
                                <div className="h-2.5 bg-surface-2 rounded w-1/2" />
                                <div className="h-7 bg-surface-2 rounded w-1/3 mt-1" />
                            </div>
                        </div>
                    ))
                ) : (
                    <>
                        <div className="bg-surface border border-border rounded-card p-6 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-ctrl bg-rose-bg text-accent flex items-center justify-center shrink-0">
                                <FiLayers className="text-lg" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[11.5px] font-semibold tracking-wide text-muted uppercase mb-1">Total de productos</h4>
                                <span className="font-serif text-4xl font-semibold text-text leading-tight">{totalProducts}</span>
                            </div>
                        </div>
                        <div className="bg-surface border border-border rounded-card p-6 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-ctrl flex items-center justify-center shrink-0 ${lowStock > 0 ? 'bg-gold-bg text-gold-text' : 'bg-surface-2 text-muted'}`}>
                                <FiAlertTriangle className="text-lg" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[11.5px] font-semibold tracking-wide text-muted uppercase mb-1">Stock bajo (≤ 5)</h4>
                                <span className={`font-serif text-4xl font-semibold leading-tight ${lowStock > 0 ? 'text-alert-text' : 'text-text'}`}>{lowStock}</span>
                            </div>
                        </div>
                        <div className="bg-surface border border-border rounded-card p-6 flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-ctrl flex items-center justify-center shrink-0 ${outOfStock > 0 ? 'bg-alert-bg text-alert-text' : 'bg-surface-2 text-muted'}`}>
                                <FiBox className="text-lg" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[11.5px] font-semibold tracking-wide text-muted uppercase mb-1">Sin stock</h4>
                                <span className={`font-serif text-4xl font-semibold leading-tight ${outOfStock > 0 ? 'text-alert-text' : 'text-text'}`}>{outOfStock}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Búsqueda y filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <FiSearch className="text-muted text-lg" aria-hidden />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o marca..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text placeholder:text-placeholder focus:outline-none focus:border-accent-rose transition-colors"
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-2 bg-surface border border-border px-4 py-2.5 rounded-ctrl">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-accent focus:ring-accent-rose cursor-pointer"
                            checked={filterLowStock}
                            onChange={(e) => handleLowStockChange(e.target.checked)}
                        />
                        <span>Solo stock bajo (≤ 5)</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsCargaMasivaModalOpen(true)}
                        className="shrink-0 bg-surface border border-[var(--dotted)] hover:bg-hover-soft text-wine px-4.5 py-2.5 rounded-ctrl text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <FiUploadCloud aria-hidden /> Importar
                    </button>
                </div>
            </div>

            {/* Listado de productos */}
            <div className="bg-surface border border-border rounded-card overflow-hidden">
                {isLoading ? (
                    <div className="animate-pulse" aria-busy="true">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-[13px] border-b border-border-soft">
                                <div className="h-4 bg-surface-2 rounded w-1/3" />
                                <div className="h-4 bg-surface-2 rounded w-1/4" />
                                <div className="h-6 bg-surface-2 rounded-pill w-20 ml-auto" />
                            </div>
                        ))}
                    </div>
                ) : isError ? (
                    <div className="px-6 py-10">
                        <div className="flex items-center justify-center gap-2 rounded-ctrl bg-alert-bg p-4 text-alert-text">
                            <FiAlertTriangle aria-hidden className="shrink-0" />
                            <span>No pudimos cargar el inventario en este momento. Intentá de nuevo.</span>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-14">
                        <div className="flex flex-col items-center gap-2 text-muted text-center">
                            {hasActiveFilters ? (
                                <>
                                    <FiSearch size={28} aria-hidden />
                                    <p>No se encontraron productos con los filtros aplicados.</p>
                                </>
                            ) : (
                                <>
                                    <FiBox size={32} aria-hidden />
                                    <p className="font-semibold text-text">No hay productos registrados</p>
                                    <p className="text-sm">Agregá tu primer producto para comenzar.</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Cards (mobile) */}
                        <ul className="sm:hidden divide-y divide-border-soft">
                            {items.map((product) => {
                                const isReponer = product.stock <= 5;
                                return (
                                    <li key={product._id} className="p-4 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-text text-sm break-words">{product.name}</p>
                                                {product.brand && <p className="text-muted text-[13px] break-words">{product.brand}</p>}
                                            </div>
                                            {renderStatusBadge(isReponer)}
                                        </div>
                                        <div>
                                            <span className={`text-[13.5px] font-semibold ${isReponer ? 'text-alert-text' : 'text-text'}`}>
                                                {product.stock} u.
                                            </span>
                                            <StockIndicator product={product} className="mt-1.5" />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {renderActions(product)}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Tabla (>= sm) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-2 border-b border-border">
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Producto</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Marca</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase text-center">Stock</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Estado</th>
                                        <th className="px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-muted uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((product) => {
                                        const isReponer = product.stock <= 5;
                                        return (
                                            <tr key={product._id} className="border-b border-border-soft last:border-0 hover:bg-surface-2 transition-colors">
                                                <td className="px-5 py-[13px]">
                                                    <p className="font-semibold text-text text-sm">{product.name}</p>
                                                    {product.description && (
                                                        <p className="text-muted text-xs mt-0.5 truncate max-w-[180px] sm:max-w-xs">{product.description}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-[13px]">
                                                    <span className="text-muted text-[13.5px]">{product.brand}</span>
                                                </td>
                                                <td className="px-5 py-[13px] text-center">
                                                    <span className={`text-[13.5px] font-semibold ${isReponer ? 'text-alert-text' : 'text-text'}`}>
                                                        {product.stock} u.
                                                    </span>
                                                    <StockIndicator product={product} className="mt-1.5 items-center" />
                                                </td>
                                                <td className="px-5 py-[13px]">{renderStatusBadge(isReponer)}</td>
                                                <td className="px-5 py-[13px]">
                                                    <div className="flex justify-end items-center gap-1.5">
                                                        {renderActions(product)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
                    </>
                )}
            </div>

            <ProductoModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} productToEdit={selectedProduct} />
            <AjusteStockModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} product={selectedProduct} />
            <CargaMasivaModal isOpen={isCargaMasivaModalOpen} onClose={() => setIsCargaMasivaModalOpen(false)} />
            <ConfirmModal
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => { if (confirmDelete) deleteProduct(confirmDelete.id); }}
                title="Eliminar producto"
                message={`¿Seguro que querés eliminar el producto "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar producto"
                isPending={isDeleting}
            />
        </div>
    );
}
