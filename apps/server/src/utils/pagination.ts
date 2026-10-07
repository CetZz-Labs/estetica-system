// Utilidades puras de paginación (sin dependencias de Express/Mongoose). UX-91.

export const DEFAULT_PAGE_SIZE = 7;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface PaginationOptions {
    defaultLimit?: number;
    maxLimit?: number;
}

const toPositiveInt = (value: unknown): number | null => {
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
};

export const parsePagination = (
    query: Record<string, unknown> | undefined,
    { defaultLimit = DEFAULT_PAGE_SIZE, maxLimit = MAX_PAGE_SIZE }: PaginationOptions = {}
): PaginationParams => {
    const page = toPositiveInt(query?.page) ?? 1;
    const limit = Math.min(toPositiveInt(query?.limit) ?? defaultLimit, maxLimit);
    return { page, limit, skip: (page - 1) * limit };
};

export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => ({
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
});
