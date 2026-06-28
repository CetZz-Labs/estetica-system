import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiBox, FiAlertTriangle, FiPlus, FiEdit2, FiLayers, FiActivity, FiUploadCloud, FiSearch } from 'react-icons/fi';

import { getProducts } from '../api/productApi';
import type { Product } from '../types';
import ProductoModal from '../components/ProductoModal';
import AjusteStockModal from '../components/AjusteStockModal';
import CargaMasivaModal from '../components/CargaMasivaModal';

export default function Inventario() {

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCargaMasivaModalOpen, setIsCargaMasivaModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);

    const { data: products, isLoading } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: getProducts
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

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
                <div>
                    <h2 className="text-xs font-semibold tracking-widest text-gray-400 mb-2 uppercase">Gestión de Insumos</h2>
                    <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Inventario ✿</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button onClick={() => setIsCargaMasivaModalOpen(true)} className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 sm:px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
                        <FiUploadCloud className="text-lg" /> Importar
                    </button>
                    <button onClick={handleNewProduct} className="bg-maison-primary hover:bg-black text-white px-4 sm:px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
                        <FiPlus className="text-lg" /> <span>Nuevo Producto</span>
                    </button>
                </div>
            </header>

            {/* BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4 animate-pulse">
                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                            <div className="space-y-2 flex-1 mt-1"><div className="h-3 bg-gray-200 rounded w-1/2"></div><div className="h-8 bg-gray-200 rounded w-1/4 mt-2"></div></div>
                        </div>
                    ))
                ) : (
                    <>
                        <div className="bg-maison-card border border-maison-border rounded-2xl p-5 flex items-start gap-4">
                            <div className="bg-maison-bg p-3 rounded-xl border border-maison-border"><FiLayers className="text-xl text-gray-600" /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Total de Productos</h4><span className="text-3xl font-serif">{totalProducts}</span></div>
                        </div>
                        <div className={`bg-maison-card border rounded-2xl p-5 flex items-start gap-4 transition-colors ${lowStock > 0 ? 'border-orange-200 bg-orange-50/30' : 'border-maison-border'}`}>
                            <div className={`p-3 rounded-xl border ${lowStock > 0 ? 'bg-orange-100 border-orange-200' : 'bg-maison-bg border-maison-border'}`}><FiAlertTriangle className={`text-xl ${lowStock > 0 ? 'text-orange-500' : 'text-gray-600'}`} /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Stock Bajo (≤ 5)</h4><span className="text-3xl font-serif">{lowStock}</span></div>
                        </div>
                        <div className={`bg-maison-card border rounded-2xl p-5 flex items-start gap-4 transition-colors ${outOfStock > 0 ? 'border-red-200 bg-red-50/30' : 'border-maison-border'}`}>
                            <div className={`p-3 rounded-xl border ${outOfStock > 0 ? 'bg-red-100 border-red-200' : 'bg-maison-bg border-maison-border'}`}><FiBox className={`text-xl ${outOfStock > 0 ? 'text-red-500' : 'text-gray-600'}`} /></div>
                            <div><h4 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Sin Stock</h4><span className="text-3xl font-serif">{outOfStock}</span></div>
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
                        className="w-full pl-11 pr-4 py-2.5 bg-maison-card border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all shadow-sm"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto text-sm font-medium text-gray-700 bg-maison-card border border-maison-border px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-maison-primary focus:ring-maison-primary"
                        checked={filterLowStock}
                        onChange={(e) => setFilterLowStock(e.target.checked)}
                    />
                    <span>Solo stock bajo (≤ 5)</span>
                </label>
            </div>

            {/* TABLE — scroll horizontal en móvil */}
            <div className="bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                            <tr className="border-b border-maison-border bg-maison-bg/50">
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Producto</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase">Marca</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase text-center">Stock</th>
                                <th className="px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-maison-border">
                            {isLoading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                                        <td className="px-4 sm:px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div></td>
                                        <td className="px-4 sm:px-6 py-4 flex justify-end"><div className="h-8 bg-gray-200 rounded w-20"></div></td>
                                    </tr>
                                ))
                            ) : products?.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No hay productos registrados en el inventario.</td></tr>
                            ) : filteredProducts?.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No se encontraron productos con los filtros aplicados.</td></tr>
                            ) : (
                                filteredProducts?.map((product) => {
                                    const isOutOfStock = product.stock === 0;
                                    const isLowStock = product.stock > 0 && product.stock <= 5;
                                    return (
                                        <tr key={product._id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-4 sm:px-6 py-4">
                                                <p className="font-medium text-maison-text">{product.name}</p>
                                                {product.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px] sm:max-w-xs">{product.description}</p>}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4"><span className="text-sm text-gray-600">{product.brand}</span></td>
                                            <td className="px-4 sm:px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${isOutOfStock ? 'bg-red-50 text-red-600 border-red-200' : isLowStock ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                    {product.stock} {product.stock === 1 ? 'unid.' : 'unids.'}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleAdjustStock(product)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer" title="Ajustar Stock"><FiActivity /> Stock</button>
                                                    <button onClick={() => handleEditProduct(product)} className="p-1.5 text-gray-400 hover:text-maison-text transition-colors cursor-pointer" title="Editar detalles"><FiEdit2 size={16} /></button>
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
        </div>
    );
}