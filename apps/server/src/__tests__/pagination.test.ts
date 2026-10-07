import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

describe('parsePagination', () => {
    it('aplica defaults (page 1, limit 7)', () => {
        expect(parsePagination({})).toEqual({ page: 1, limit: 7, skip: 0 });
    });

    it('calcula skip y respeta el tope maxLimit', () => {
        expect(parsePagination({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100, skip: 200 });
    });

    it('ignora valores inválidos', () => {
        expect(parsePagination({ page: '-2', limit: 'abc' })).toEqual({ page: 1, limit: 7, skip: 0 });
    });

    it('admite opciones custom', () => {
        expect(parsePagination({ limit: '50' }, { defaultLimit: 20, maxLimit: 20 }).limit).toBe(20);
        expect(parsePagination({}, { defaultLimit: 20, maxLimit: 20 }).limit).toBe(20);
    });
});

describe('buildPaginationMeta', () => {
    it('calcula totalPages con mínimo 1', () => {
        expect(buildPaginationMeta(15, 1, 7)).toEqual({ total: 15, page: 1, limit: 7, totalPages: 3 });
        expect(buildPaginationMeta(0, 1, 7).totalPages).toBe(1);
    });
});
