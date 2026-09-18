// Vitest — suíte de testes do FRONTEND (workspace web).
// Execução: `npm run test:web` na raiz (ou `npm test` dentro de web/).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Os testes exercitam os caminhos REAIS da aplicação (API), não o modo
  // demonstração — mesmo que o .env do workspace ative VITE_DEMO=true.
  define: {
    'import.meta.env.VITE_DEMO': '"false"',
  },
  test: {
    // jsdom: componentes, hooks e clientes que usam localStorage/fetch.
    environment: 'jsdom',
    globals: true, // habilita auto-cleanup do Testing Library
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/components/**', 'src/views/**'],
    },
  },
});
