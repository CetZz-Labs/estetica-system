import { useRef } from "react";
import AsyncSelect from "react-select/async";
import type { StylesConfig } from "react-select";

import { getProductOptions, type ProductOption } from "../../api/productApi";
import { handleApiError } from "../../api/errorHandler";

export interface ProductSelectOption {
    value: string;
    label: string;
    isDisabled?: boolean;
    product: ProductOption;
}

interface Props {
    value: ProductSelectOption | null;
    onChange: (option: ProductSelectOption | null) => void;
    styles?: StylesConfig<ProductSelectOption, false>;
}

const DEBOUNCE_MS = 300;
const OPTIONS_LIMIT = 20;

const toProductSelectOption = (p: ProductOption): ProductSelectOption => ({
    value: p._id,
    label: `${p.name}${p.brand ? ` (${p.brand})` : ''} - Stock: ${p.stock}`,
    isDisabled: p.stock === 0,
    product: p,
});

/** Picker de insumos con búsqueda server-side (debounced) sobre GET /productos/opciones. */
export default function ProductAsyncSelect({ value, onChange, styles }: Props) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadOptions = (input: string): Promise<ProductSelectOption[]> =>
        new Promise((resolve) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                try {
                    const products = await getProductOptions({ search: input.trim() || undefined, limit: OPTIONS_LIMIT });
                    resolve(products.map(toProductSelectOption));
                } catch (error) {
                    handleApiError(error, 'Error al buscar insumos');
                    resolve([]);
                }
            }, DEBOUNCE_MS);
        });

    return (
        <AsyncSelect<ProductSelectOption, false>
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            placeholder="Buscar insumo..."
            styles={styles}
            noOptionsMessage={() => "Insumo no encontrado"}
            loadingMessage={() => "Buscando..."}
            value={value}
            onChange={onChange}
        />
    );
}
