import * as XLSX from 'xlsx';
import type { ProductsReport } from '../api/reportApi';

/** Genera y descarga el .xlsx del reporte de productos (hojas: Más usados, Stock bajo). */
export const exportProductsReport = (report: ProductsReport): void => {
    const topSheet = XLSX.utils.aoa_to_sheet([
        ['Producto', 'Marca', 'Usos', 'Unidades consumidas', 'Stock actual'],
        ...report.topProducts.map((p) => [p.name, p.brand, p.usages, p.unitsConsumed, p.stock]),
    ]);
    const lowSheet = XLSX.utils.aoa_to_sheet([
        ['Producto', 'Marca', 'Stock', 'Estado'],
        ...report.lowStock.items.map((p) => [p.name, p.brand, p.stock, p.stock === 0 ? 'Agotado' : 'Stock bajo']),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, topSheet, 'Más usados');
    XLSX.utils.book_append_sheet(wb, lowSheet, 'Stock bajo');
    XLSX.writeFile(wb, `reportes-productos_${report.range.from}_${report.range.to}.xlsx`);
};
