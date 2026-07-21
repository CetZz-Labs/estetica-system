import { useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FiUploadCloud, FiFileText, FiCheckCircle, FiDownload } from 'react-icons/fi';
import { createBulkProducts, type BulkProductData } from '../api/productApi';
import { handleApiError } from '../api/errorHandler';
import Modal from './ui/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}



interface ExcelRow {
    Nombre?: string;
    name?: string;
    Marca?: string;
    brand?: string;
    Stock?: string | number;
    stock?: string | number;
    Descripcion?: string;
    description?: string;
    [key: string]: unknown;
}



function downloadProductoEjemplo() {
    const ws = XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Marca', 'Stock', 'Descripcion'],
        ['Keratina Premium', "L'Oreal", 10, 'Tratamiento intensivo'],
        ['Tinte Rubio', 'Wella', 5, ''],
        ['Mascarilla Hidratante', 'Schwarzkopf', 3, 'Para cabello seco'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'ejemplo-importacion-productos.xlsx');
}

export default function CargaMasivaModal({ isOpen, onClose }: Props) {
    const queryClient = useQueryClient();

    const [previewData, setPreviewData] = useState<BulkProductData[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [isDragOver, setIsDragOver] = useState(false);

    const { mutate, isPending } = useMutation({
        mutationFn: (data: BulkProductData[]) => createBulkProducts(data),
        onSuccess: (data) => {
            toast.success(data.message, {
                style: { background: '#EEF0E6', color: '#71774F', borderColor: '#8C9178' }
            });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleClose();
        },
        onError: (error) => handleApiError(error, 'Error al subir los productos. Revisa el formato del archivo.')
    });

    const processFile = (file: File) => {
        setFileName(file.name);
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const reader = new FileReader();

        reader.onload = (evt: ProgressEvent<FileReader>) => {
            let wb: XLSX.WorkBook;

            if (isCSV) {
                const text = evt.target?.result;
                if (typeof text !== 'string') return;
                wb = XLSX.read(text, { type: 'string' });
            } else {
                const arrayBuffer = evt.target?.result;
                if (!(arrayBuffer instanceof ArrayBuffer)) return;
                wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            }

            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<ExcelRow>(ws);

            const mappedData: BulkProductData[] = data
                .map((row) => ({
                    name: String(row.Nombre || row.name || ''),
                    brand: String(row.Marca || row.brand || ''),
                    stock: Number(row.Stock || row.stock || 0),
                    description: String(row.Descripcion || row.description || '')
                }))
                .filter(p => p.name.trim() !== '' && p.brand.trim() !== '');

            setPreviewData(mappedData);
        };

        if (isCSV) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const handleClose = () => {
        setPreviewData([]);
        setFileName('');
        onClose();
    };

    const footer = (
        <>
            <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-ctrl text-sm font-semibold text-muted hover:text-text transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                onClick={() => mutate(previewData)}
                disabled={isPending || previewData.length === 0}
                className="bg-accent hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-ctrl text-sm font-semibold transition-opacity flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
                {isPending ? 'Procesando...' : <><FiCheckCircle /> Confirmar Carga</>}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Importar productos"
            subtitle="Subí un archivo Excel (.xlsx o .csv) con tus productos."
            maxWidth="max-w-xl"
            containerClassName="flex flex-col max-h-[85vh]"
            footer={footer}
        >
            {/* Guía de formato — siempre visible */}
            <div className="bg-bg border border-border rounded-ctrl p-4 mb-4">
                <p className="text-[11.5px] font-semibold tracking-wide text-muted uppercase mb-3">Formato del archivo</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-2 border border-border bg-surface-2 font-mono font-semibold text-text-2">Nombre</th>
                                <th className="text-left p-2 border border-border bg-surface-2 font-mono font-semibold text-text-2">Marca</th>
                                <th className="text-left p-2 border border-border bg-surface-2 font-mono font-semibold text-text-2">Stock</th>
                                <th className="text-left p-2 border border-border bg-surface-2 font-mono font-semibold text-text-2">Descripcion</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-alert-bg text-alert-text text-[10px] font-semibold rounded-pill">Obligatorio</span></td>
                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-alert-bg text-alert-text text-[10px] font-semibold rounded-pill">Obligatorio</span></td>
                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-surface-2 text-muted text-[10px] font-semibold rounded-pill">Opcional</span></td>
                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-surface-2 text-muted text-[10px] font-semibold rounded-pill">Opcional</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-muted font-semibold mt-3 mb-1 uppercase tracking-widest">Ejemplo</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <tbody>
                            <tr>
                                <td className="p-2 border border-border bg-surface text-text-2">Keratina Premium</td>
                                <td className="p-2 border border-border bg-surface text-text-2">L'Oreal</td>
                                <td className="p-2 border border-border bg-surface text-muted italic">10</td>
                                <td className="p-2 border border-border bg-surface text-muted italic">Tratamiento intensivo</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-muted mt-3">Si el producto ya existe (mismo nombre y marca), se suma el stock al existente.</p>
                <div className="flex justify-end mt-3">
                    <button
                        type="button"
                        onClick={downloadProductoEjemplo}
                        className="flex items-center gap-1.5 text-xs text-accent hover:underline cursor-pointer"
                    >
                        <FiDownload className="text-sm" />
                        Descargar archivo de ejemplo
                    </button>
                </div>
            </div>

            {!fileName ? (
                <label
                    className={`border-2 border-dashed rounded-card p-12 flex flex-col items-center justify-center transition-colors cursor-pointer group ${
                        isDragOver
                            ? 'border-accent bg-rose-bg/60'
                            : 'border-[var(--dotted)] hover:border-accent-rose hover:bg-rose-bg/40'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) processFile(file);
                    }}
                >
                    <FiUploadCloud className="text-5xl text-dotted group-hover:text-accent mb-4 transition-colors" />
                    <span className="text-text-2 font-medium">Hacé clic o arrastrá el archivo aquí</span>
                    <span className="text-xs text-muted mt-2">Excel (.xlsx), Excel 97 (.xls) y CSV (.csv)</span>
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                </label>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-bg border border-border rounded-ctrl">
                        <div className="p-3 bg-surface border border-border rounded-ctrl text-accent">
                            <FiFileText size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-text">{fileName}</p>
                            <p className="text-xs text-muted">{previewData.length} productos detectados</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setFileName(''); setPreviewData([]); }}
                            className="text-xs text-alert-text font-semibold hover:underline cursor-pointer"
                        >
                            Cambiar
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-border rounded-ctrl">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-surface-2 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold text-muted uppercase tracking-widest">Nombre</th>
                                    <th className="p-3 font-semibold text-muted uppercase tracking-widest text-center">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-soft bg-surface">
                                {previewData.slice(0, 10).map((p, i) => (
                                    <tr key={i}>
                                        <td className="p-3 font-medium text-text">{p.name} <span className="text-muted font-normal">({p.brand})</span></td>
                                        <td className="p-3 text-center font-bold text-text">{p.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.length > 10 && (
                            <p className="p-3 text-center text-muted bg-surface-2 italic">Y {previewData.length - 10} productos más...</p>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}