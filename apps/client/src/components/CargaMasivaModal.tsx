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
                style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
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
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
                Cancelar
            </button>
            <button
                onClick={() => mutate(previewData)}
                disabled={isPending || previewData.length === 0}
                className="bg-maison-primary hover:bg-black disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
            <div className="bg-maison-bg border border-maison-border rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-3">Formato del archivo</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-2 border border-maison-border bg-white font-mono font-semibold text-gray-700">Nombre</th>
                                <th className="text-left p-2 border border-maison-border bg-white font-mono font-semibold text-gray-700">Marca</th>
                                <th className="text-left p-2 border border-maison-border bg-white font-mono font-semibold text-gray-700">Stock</th>
                                <th className="text-left p-2 border border-maison-border bg-white font-mono font-semibold text-gray-700">Descripcion</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-2 border border-maison-border"><span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded">Obligatorio</span></td>
                                <td className="p-2 border border-maison-border"><span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded">Obligatorio</span></td>
                                <td className="p-2 border border-maison-border"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded">Opcional</span></td>
                                <td className="p-2 border border-maison-border"><span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded">Opcional</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold mt-3 mb-1 uppercase tracking-widest">Ejemplo</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <tbody>
                            <tr>
                                <td className="p-2 border border-maison-border bg-white text-gray-600">Keratina Premium</td>
                                <td className="p-2 border border-maison-border bg-white text-gray-600">L'Oreal</td>
                                <td className="p-2 border border-maison-border bg-white text-gray-400 italic">10</td>
                                <td className="p-2 border border-maison-border bg-white text-gray-400 italic">Tratamiento intensivo</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-3">Si el producto ya existe (mismo nombre y marca), se suma el stock al existente.</p>
                <div className="flex justify-end mt-3">
                    <button
                        type="button"
                        onClick={downloadProductoEjemplo}
                        className="flex items-center gap-1.5 text-xs text-maison-primary hover:underline cursor-pointer"
                    >
                        <FiDownload className="text-sm" />
                        Descargar archivo de ejemplo
                    </button>
                </div>
            </div>

            {!fileName ? (
                <label
                    className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                        isDragOver
                            ? 'border-maison-primary bg-maison-primary/10'
                            : 'border-gray-200 hover:border-maison-primary hover:bg-maison-primary/5'
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
                    <FiUploadCloud className="text-5xl text-gray-300 group-hover:text-maison-primary mb-4 transition-colors" />
                    <span className="text-gray-600 font-medium">Hacé clic o arrastrá el archivo aquí</span>
                    <span className="text-xs text-gray-400 mt-2">Excel (.xlsx), Excel 97 (.xls) y CSV (.csv)</span>
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                </label>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-maison-bg border border-maison-border rounded-2xl">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-maison-primary">
                            <FiFileText size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-maison-text">{fileName}</p>
                            <p className="text-xs text-gray-500">{previewData.length} productos detectados</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setFileName(''); setPreviewData([]); }}
                            className="text-xs text-maison-red font-semibold hover:underline cursor-pointer"
                        >
                            Cambiar
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-maison-border rounded-xl">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest">Nombre</th>
                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-center">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-maison-border bg-white">
                                {previewData.slice(0, 10).map((p, i) => (
                                    <tr key={i}>
                                        <td className="p-3 font-medium text-gray-700">{p.name} <span className="text-gray-400 font-normal">({p.brand})</span></td>
                                        <td className="p-3 text-center font-bold text-maison-text">{p.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewData.length > 10 && (
                            <p className="p-3 text-center text-gray-400 bg-gray-50 italic">Y {previewData.length - 10} productos más...</p>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}