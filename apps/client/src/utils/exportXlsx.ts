import * as XLSX from 'xlsx';

export interface XlsxSheet {
    name: string;
    rows: (string | number)[][]; // primera fila = encabezados
}

/** Genera y descarga un .xlsx con las hojas indicadas. */
export const downloadXlsx = (fileName: string, sheets: XlsxSheet[]): void => {
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name));
    XLSX.writeFile(wb, fileName);
};
