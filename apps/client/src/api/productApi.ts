import api from '../libs/axios';
import type { Product } from '../types';

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

/** GET /api/productos — Lista todos los productos activos */
export const getProducts = async (): Promise<Product[]> => {
    const response = await api.get('/productos');
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
