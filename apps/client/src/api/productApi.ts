import api from '../libs/axios';
import type { Paginated, Product } from '../types';

export interface ProductFormData {
    name: string;
    brand: string;
    stock?: number;
    description?: string;
}

export interface AjusteStockPayload {
    quantity: number;
    reason?: string;
}

export interface BulkProductData {
    name: string;
    brand: string;
    stock: number;
    description: string;
}

interface BulkResponse {
    message: string;
    products: Product[];
}

export interface ProductPageParams {
    page?: number;
    limit?: number;
    search?: string;
    lowStock?: boolean;
    sort?: 'stock';
}

export interface ProductStats {
    total: number;
    lowStock: number;
    outOfStock: number;
}

export interface ProductOption {
    _id: string;
    name: string;
    brand?: string;
    stock: number;
    currentUnitLevel?: number;
}

export interface ProductOptionsParams {
    search?: string;
    limit?: number;
    ids?: string[];
}

/** GET /api/productos — Página de productos activos (paginado server-side) */
export const getProductsPage = async (
    { page = 1, limit = 7, search, lowStock, sort }: ProductPageParams = {}
): Promise<Paginated<Product>> => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    if (sort) params.sort = sort;
    if (lowStock) params.lowStock = 'true';
    const response = await api.get<Paginated<Product>>('/productos', { params });
    return response.data;
};

/** GET /api/productos/stats — KPIs de inventario */
export const getProductStats = async (): Promise<ProductStats> => {
    const response = await api.get<ProductStats>('/productos/stats');
    return response.data;
};

/** GET /api/productos/opciones — Lista slim para selects */
export const getProductOptions = async (
    { search, limit, ids }: ProductOptionsParams = {}
): Promise<ProductOption[]> => {
    const params: Record<string, string | number> = {};
    if (search) params.search = search;
    if (limit) params.limit = limit;
    if (ids && ids.length > 0) params.ids = ids.join(',');
    const response = await api.get<ProductOption[]>('/productos/opciones', { params });
    return response.data;
};

/** POST /api/productos — Crea un nuevo producto */
export const createProduct = async (data: ProductFormData): Promise<Product> => {
    const payload = { ...data, stock: Number(data.stock) };
    const response = await api.post('/productos', payload);
    return response.data;
};

/** PUT /api/productos/:id — Actualiza info básica (sin stock) */
export const updateProduct = async (
    id: string,
    data: Omit<ProductFormData, 'stock'>
): Promise<Product> => {
    const response = await api.put(`/productos/${id}`, data);
    return response.data;
};

/** POST /api/productos/:id/stock — Ajusta el stock de un producto */
export const adjustStock = async (id: string, payload: AjusteStockPayload): Promise<Product> => {
    const response = await api.post(`/productos/${id}/stock`, payload);
    return response.data;
};

/** POST /api/productos/bulk — Carga masiva de productos desde Excel/CSV */
export const createBulkProducts = async (data: BulkProductData[]): Promise<BulkResponse> => {
    const response = await api.post<BulkResponse>('/productos/bulk', data);
    return response.data;
};

/** DELETE /api/productos/:id — Soft delete de un producto */
export const deleteProduct = async (id: string): Promise<void> => {
    await api.delete(`/productos/${id}`);
};
