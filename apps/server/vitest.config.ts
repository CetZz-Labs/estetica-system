import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/__tests__/**/*.test.ts'],
        // mongodb-memory-server puede descargar el binario de MongoDB en la primera corrida
        hookTimeout: 120000,
        testTimeout: 30000
    }
});
