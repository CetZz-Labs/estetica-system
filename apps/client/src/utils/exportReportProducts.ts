import type { ProductsReport } from '../api/reportApi';
import { downloadXlsx } from './exportXlsx';

/** Genera y descarga el .xlsx del reporte de productos (hojas: Más usados, Stock bajo). */
export const exportProductsReport = (report: ProductsReport): void => {
    downloadXlsx(`reportes-productos_${report.range.from}_${report.range.to}.xlsx`, [
        {
            name: 'Más usados',
            rows: [
                ['Producto', 'Marca', 'Usos', 'Unidades consumidas', 'Stock actual'],
                ...report.topProducts.map((p) => [p.name, p.brand, p.usages, p.unitsConsumed, p.stock]),
            ],
        },
        {
            name: 'Stock bajo',
            rows: [
                ['Producto', 'Marca', 'Stock', 'Estado'],
                ...report.lowStock.items.map((p) => [p.name, p.brand, p.stock, p.stock === 0 ? 'Agotado' : 'Stock bajo']),
            ],
        },
    ]);
};
