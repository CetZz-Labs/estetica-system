import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBox, FiAlertTriangle, FiPlus, FiEdit2, FiTrash2, FiLayers, FiActivity, FiUploadCloud, FiSearch } from 'react-icons/fi';
import { toast } from 'sonner';

import { getProducts, deleteProduct as deleteProductApi } from '../api/productApi';
import { handleApiError } from '../api/errorHandler';
import type { Product } from '../types';
import ProductoModal from '../components/ProductoModal';
import AjusteStockModal from '../components/AjusteStockModal';
import CargaMasivaModal from '../components/CargaMasivaModal';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Inventario() {

    const queryClient = useQueryClient();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCargaMasivaModalOpen, setIsCargaMasivaModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const { data: products, isLoading } = useQuery<Product[]>({
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

    const handleNewProduct = () => { setSelectedProduct(null); setIsProductModalOpen(true); };
    const handleEditProduct = (product: Product) => { setSelectedProduct(product); setIsProductModalOpen(true); };
    const handleAdjustStock = (product: Product) => { setSelectedProduct(product); setIsStockModalOpen(true); };
    const handleDeleteProduct = (id: string, name: string) => { setConfirmDelete({ id, name }); };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-10">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2 uppercase">Gestión de Insumos</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Inventario ✿</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button onClick={() => setIsCargaMasivaModalOpen(true)} className="bg-card border border-border hover:border-primary/40 text-muted-foreground px-4 sm:px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm shadow-sm cursor-pointer">
                        <FiUploadCloud className="text-lg" /> Importar
                    </button>
                    <button onClick={handleNewProduct} className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm shadow-sm cursor-pointer">
                        <FiPlus className="text-lg" /> <span>Nuevo Producto</span>
                    </button>
                </div>
            </header>

            {/* BENTO GRID — Stat Cards (Dashboard pattern) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 bg-muted rounded-lg shrink-0"></div>
                            <div className="space-y-2 flex-1"><div className="h-2.5 bg-muted rounded w-1/2"></div><div className="h-6 bg-muted rounded w-1/4 mt-1"></div></div>
                        </div>
                    ))
                ) : (
                    <>
                        <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-4 flex items-center gap-3 hover:shadow-md hover:border-t-primary/60 transition-all duration-200 cursor-default group">
                            <div className="bg-primary/10 p-2.5 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors"><FiLayers className="text-lg text-primary" /></div>
                            <div className="min-w-0"><h4 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Total de Productos</h4><span className="text-2xl font-serif text-foreground leading-tight">{totalProducts}</span></div>
                        </div>
                        <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 cursor-default group ${lowStock > 0 ? 'border-t-2 border-t-warning/60' : 'border-border border-t-2 border-t-primary/30 hover:border-t-primary/60'}`}>
                            <div className={`p-2.5 rounded-lg shrink-0 group-hover:bg-orange-200/30 transition-colors ${lowStock > 0 ? 'bg-warning/20' : 'bg-primary/10'}`}><FiAlertTriangle className={`text-lg ${lowStock > 0 ? 'text-warning' : 'text-primary'}`} /></div>
                            <div className="min-w-0"><h4 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Stock Bajo (≤ 5)</h4><span className="text-2xl font-serif text-foreground leading-tight">{lowStock}</span></div>
                        </div>
                        <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 cursor-default group ${outOfStock > 0 ? 'border-destructive/40 border-t-2 border-t-destructive' : 'border-border border-t-2 border-t-primary/30 hover:border-t-primary/60'}`}>
                            <div className={`p-2.5 rounded-lg shrink-0 group-hover:bg-red-200/30 transition-colors ${outOfStock > 0 ? 'bg-destructive/20' : 'bg-primary/10'}`}><FiBox className={`text-lg ${outOfStock > 0 ? 'text-destructive' : 'text-primary'}`} /></div>
                            <div className="min-w-0"><h4 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Sin Stock</h4><span className="text-2xl font-serif text-foreground leading-tight">{outOfStock}</span></div>
                        </div>
                    </>
                )}
            </div>

            {/* Filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400 text-lg" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all shadow-sm"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto text-sm font-medium text-muted-foreground bg-card border border-border px-4 py-2.5 rounded-lg shadow-sm hover:bg-muted/50 transition-colors">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
                        checked={filterLowStock}
                        onChange={(e) => setFilterLowStock(e.target.checked)}
                    />
                    <span>Solo stock bajo (≤ 5)</span>
                </label>
            </div>

            {/* TABLE */}
            <div className="bg-card border border-border border-t-2 border-t-primary/30 rounded-lg shadow-sm overflow-hidden hover:border-t-primary/60 transition-all duration-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                            <tr className="border-b border-border bg-background/50">
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">Producto</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">Marca</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-muted-foreground uppercase text-center">Stock</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-muted-foreground uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-muted rounded w-3/4"></div></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-muted rounded w-1/2"></div></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-6 bg-muted rounded-full w-16 mx-auto"></div></td>
                                        <td className="px-4 sm:px-6 py-4 flex justify-end"><div className="h-8 bg-muted rounded w-20"></div></td>
                                    </tr>
                                ))
                            ) : products?.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No hay productos registrados en el inventario.</td></tr>
                            ) : filteredProducts?.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No se encontraron productos con los filtros aplicados.</td></tr>
                            ) : (
                                filteredProducts?.map((product) => {
                                    const isOutOfStock = product.stock === 0;
                                    const isLowStock = product.stock > 0 && product.stock <= 5;
                                    return (
                                        <tr key={product._id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-4 sm:px-6 py-4">
                                                <p className="font-medium text-foreground">{product.name}</p>
                                                {product.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px] sm:max-w-xs">{product.description}</p>}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4"><span className="text-sm text-muted-foreground">{product.brand}</span></td>
                                            <td className="px-4 sm:px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${isOutOfStock ? 'bg-red-50 text-destructive border-red-200' : isLowStock ? 'bg-orange-50 text-warning border-orange-200' : 'bg-green-50 text-ring border-green-200'}`}>
                                                    {product.stock} {product.stock === 1 ? 'unid.' : 'unids.'}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleAdjustStock(product)} className="px-3 py-1.5 text-xs font-medium bg-card border border-border text-muted-foreground rounded-lg hover:border-primary/40 hover:text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm flex items-center gap-1.5 shadow-sm cursor-pointer" title="Ajustar Stock"><FiActivity /> Stock</button>
                                                    <button onClick={() => handleEditProduct(product)} className="p-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer" title="Editar detalles"><FiEdit2 size={16} /></button>
                                                    <button type="button" onClick={() => handleDeleteProduct(product._id, product.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer" title="Eliminar producto"><FiTrash2 size={16} /></button>
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
