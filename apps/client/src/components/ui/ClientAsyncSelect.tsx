import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AsyncSelect from "react-select/async";
import type { StylesConfig } from "react-select";

import { getClientOptions, type ClientOption } from "../../api/clientApi";
import { handleApiError } from "../../api/errorHandler";

export interface ClientSelectOption {
    value: string;
    label: string;
}

interface Props {
    /** Id del cliente seleccionado ('' si no hay). */
    value: string;
    onChange: (clientId: string) => void;
    styles?: StylesConfig<ClientSelectOption, false>;
    placeholder?: string;
    isClearable?: boolean;
}

const DEBOUNCE_MS = 300;
const OPTIONS_LIMIT = 20;

const toClientSelectOption = (c: ClientOption): ClientSelectOption => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName ?? ''}`.trim(),
});

/**
 * Picker de clientes con búsqueda server-side (debounced) sobre GET /clientes/opciones.
 * Resuelve el nombre de un id preseleccionado vía `?ids=` si no está en la última selección.
 */
export default function ClientAsyncSelect({ value, onChange, styles, placeholder = "Buscar cliente...", isClearable = false }: Props) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selected, setSelected] = useState<ClientSelectOption | null>(null);

    const needsResolve = !!value && selected?.value !== value;
    const { data: resolved } = useQuery<ClientSelectOption | null>({
        queryKey: ['clients', 'option', value],
        queryFn: async () => {
            const [client] = await getClientOptions({ ids: [value] });
            return client ? toClientSelectOption(client) : null;
        },
        enabled: needsResolve,
        staleTime: 60_000,
    });

    const currentValue: ClientSelectOption | null = !value
        ? null
        : selected?.value === value
            ? selected
            : resolved ?? null;

    const loadOptions = (input: string): Promise<ClientSelectOption[]> =>
        new Promise((resolve) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(async () => {
                try {
                    const clients = await getClientOptions({ search: input.trim() || undefined, limit: OPTIONS_LIMIT });
                    resolve(clients.map(toClientSelectOption));
                } catch (error) {
                    handleApiError(error, 'Error al buscar clientes');
                    resolve([]);
                }
            }, DEBOUNCE_MS);
        });

    return (
        <AsyncSelect<ClientSelectOption, false>
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            placeholder={placeholder}
            styles={styles}
            isClearable={isClearable}
            noOptionsMessage={() => "No se encontró el cliente"}
            loadingMessage={() => "Buscando..."}
            value={currentValue}
            onChange={(option) => {
                setSelected(option);
                onChange(option?.value ?? '');
            }}
        />
    );
}
