// Vitest — suíte de testes do BACKEND (API).
//
// Frontend (workspace web) tem configuração própria: web/vitest.config.ts.
// Execução: `npm run test:api` (ou `npm test` para rodar as duas suítes).
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Integração usa Node + Postgres real (supdesk_test, provisionado em
        // tests/globalSetup.ts). Arquivos rodam em série para não disputar as
        // mesmas tabelas (cada arquivo truncua os dados no beforeEach).
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        globalSetup: ['tests/globalSetup.ts'],
        setupFiles: ['tests/setup.ts'],
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 30_000,
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            exclude: [
                'src/server.ts', // bootstrap (listen) — coberto indiretamente pela app
                'src/swagger.ts', // documentação
                'src/types/**', // só tipos
            ],
        },
    },
});
