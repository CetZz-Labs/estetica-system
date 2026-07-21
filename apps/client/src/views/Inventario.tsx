import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBox, FiAlertTriangle, FiEdit2, FiTrash2, FiLayers, FiActivity, FiUploadCloud, FiSearch, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'sonner';

import { getProducts, deleteProduct as deleteProductApi } from '../api/productApi';
import { handleApiError } from '../api/errorHandler';
import type { Product } from '../types';
import ProductoModal from '../components/ProductoModal';
import AjusteStockModal from '../components/AjusteStockModal';
import CargaMasivaModal from '../components/CargaMasivaModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useTopbar } from '../layouts/TopbarContext';

export default function Inventario() {

    const queryClient = useQueryClient();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCargaMasivaModalOpen, setIsCargaMasivaModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const handleNewProduct = () => { setSelectedProduct(null); setIsProductModalOpen(true); };

    useTopbar({
        title: 'Inventario',
        primaryAction: { label: '+ Nuevo Producto', onClick: handleNewProduct },
    });

    const { data: products, isLoading, isError } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: getProducts
    });

    const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteProductApi(id),
        onSuccess: () => {
            toast.success('Producto eliminado');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setConfirmDelete(null);
        },
        onError: (error) => handleApiError(error, 'No se puede eliminar el producto')
    });

    const filteredProducts = products?.filter(product => {
        const term = searchTerm.toLowerCase();
        const matchNameBrand = product.name.toLowerCase().includes(term) || (product.brand?.toLowerCase() || '').includes(term);
        const matchStock = filterLowStock ? product.stock <= 5 : true;
        return matchNameBrand && matchStock;
    });

    const totalProducts = products?.length || 0;
    const outOfStock = products?.filter(p => p.stock === 0).length || 0;
    const lowStock = products?.filter(p => p.stock > 0 && p.stock <= 5).length || 0;

    const handleEditProduct = (product: Product) => { setSelectedProduct(product); setIsProductModalOpen(true); };
    const handleAdjustStock = (product: Product) => { setSelectedProduct(product); setIsStockModalOpen(true); };
    const handleDeleteProduct = (id: string, name: string) => { setConfirmDelete({ id, name }); };

    return (
        <div className="max-w-6xl mx-auto">

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {isLoading ? (
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
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text placeholder:text-placeholder focus:outline-none focus:border-accent-rose transition-colors"
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-2 bg-surface border border-border px-4 py-2.5 rounded-ctrl">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-accent focus:ring-accent-rose cursor-pointer"
                            checked={filterLowStock}
                            onChange={(e) => setFilterLowStock(e.target.checked)}
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

            {/* Tabla de productos */}
            <div className="bg-surface border border-border rounded-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
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
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border-soft animate-pulse">
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-3/4" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-1/2" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-4 bg-surface-2 rounded w-10 mx-auto" /></td>
                                        <td className="px-5 py-[13px]"><div className="h-6 bg-surface-2 rounded-pill w-20" /></td>
                                        <td className="px-5 py-[13px] flex justify-end"><div className="h-8 bg-surface-2 rounded w-24" /></td>
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10">
                                        <div className="flex items-center justify-center gap-2 rounded-ctrl bg-alert-bg p-4 text-alert-text">
                                            <FiAlertTriangle aria-hidden className="shrink-0" />
                                            <span>No pudimos cargar el inventario en este momento. Intentá de nuevo.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14">
                                        <div className="flex flex-col items-center gap-2 text-muted text-center">
                                            <FiBox size={32} aria-hidden />
                                            <p className="font-semibold text-text">No hay productos registrados</p>
                                            <p className="text-sm">Agregá tu primer producto para comenzar.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14">
                                        <div className="flex flex-col items-center gap-2 text-muted text-center">
                                            <FiSearch size={28} aria-hidden />
                                            <p>No se encontraron productos con los filtros aplicados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts?.map((product) => {
                                    const isOutOfStock = product.stock === 0;
                                    const isLowStock = product.stock > 0 && product.stock <= 5;
                                    const isReponer = isOutOfStock || isLowStock;
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
                                                    {product.stock} {product.stock === 1 ? 'u.' : 'u.'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-[13px]">
                                                {isReponer ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-alert-bg text-alert-text text-[11.5px] font-semibold">
                                                        <FiAlertTriangle aria-hidden /> Reponer
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-sage-bg text-sage-text text-[11.5px] font-semibold">
                                                        <FiCheckCircle aria-hidden /> En stock
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-[13px]">
                                                <div className="flex justify-end items-center gap-1.5">
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
                                                        className="p-1.5 text-text-3 hover:text-text transition-colors cursor-pointer"
                                                    >
                                                        <FiEdit2 size={16} aria-hidden />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteProduct(product._id, product.name)}
                                                        title="Eliminar producto"
                                                        className="p-1.5 text-text-3 hover:text-alert-text transition-colors cursor-pointer"
                                                    >
                                                        <FiTrash2 size={16} aria-hidden />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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
