import { useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FiUploadCloud, FiFileText, FiCheckCircle } from 'react-icons/fi';
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



export default function CargaMasivaModal({ isOpen, onClose }: Props) {
    const queryClient = useQueryClient();

    const [previewData, setPreviewData] = useState<BulkProductData[]>([]);
    const [fileName, setFileName] = useState<string>('');

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

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
                className="bg-maison-primary hover:bg-black disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
                {isPending ? 'Procesando...' : <><FiCheckCircle /> Confirmar Carga</>}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Carga Masiva"
            subtitle="Subí un archivo Excel (.xlsx o .csv) con tus productos."
            maxWidth="max-w-xl"
            containerClassName="flex flex-col max-h-[85vh]"
            footer={footer}
        >
            {!fileName ? (
                <label className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center hover:border-maison-primary hover:bg-maison-primary/5 transition-all cursor-pointer group">
                    <FiUploadCloud className="text-5xl text-gray-300 group-hover:text-maison-primary mb-4 transition-colors" />
                    <span className="text-gray-600 font-medium">Hacé clic o arrastrá el archivo aquí</span>
                    <span className="text-xs text-gray-400 mt-2">Columnas sugeridas: Nombre, Marca, Stock, Descripcion</span>
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
                            onClick={() => { setFileName(''); setPreviewData([]); }}
                            className="text-xs text-maison-red font-semibold hover:underline"
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