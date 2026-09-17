// @ts-check
/**
 * ESLint 9 (flat config) — configuração única na raiz do monorepo (npm workspaces).
 *
 * Divisão de responsabilidades:
 * - src/**        → backend (Node + Express): linting COM informação de tipos.
 * - web/src/**    → React: linting SEM informação de tipos (o `tsc -b --noEmit`
 *                   do projeto já cobre a maioria das verificações e mantém o lint rápido).
 * - Prettier cuida da formatação; `eslint-config-prettier` desliga regras conflitantes.
 */
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        name: 'supdesk/ignores',
        ignores: [
            '**/node_modules/**',
            'dist/**',
            'web/dist/**',
            '**/*.tsbuildinfo',
            'package-lock.json',
        ],
    },

    /* ------------------------------------------------------------------ *
     * Regras comuns a todo o JS/TS do repositório
     * ------------------------------------------------------------------ */
    {
        name: 'supdesk/base',
        files: ['**/*.{js,mjs,cjs,ts,tsx}'],
        extends: [js.configs.recommended],
        rules: {
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': ['warn', 'properties'],
            'no-throw-literal': 'error',
        },
    },

    /* ------------------------------------------------------------------ *
     * Backend — src/** (type-aware)
     * ------------------------------------------------------------------ */
    {
        name: 'supdesk/backend',
        files: ['src/**/*.ts'],
        extends: [...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                // Descobre o tsconfig.json da raiz automaticamente para os arquivos de src/**
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: { ...globals.node },
        },
        rules: {
            // O tsconfig da raiz não habilita noUnusedLocals/noUnusedParameters: o ESLint cobre esse vazio.
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // `any` explícito não é aceito (tipos de domínio em src/types/db.ts).
            '@typescript-eslint/no-explicit-any': 'error',
            // DTOs tipados + validação Zod eliminaram o acesso `unsafe` ao body,
            // às linhas do `pg` e ao payload do `jwt.verify`. Regressões viram erro.
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            // Handlers async do Express 5: evita promessas flutuantes (banco, bcrypt, etc.).
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            // Imports de tipo explícitos (o projeto usa verbatimModuleSyntax).
            '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
            '@typescript-eslint/no-import-type-side-effects': 'warn',
            // Logging: erros/avisos são legítimos; `log` fica restrito aos pontos de bootstrap.
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
    {
        // Bootstrap do servidor: banners de inicialização usam console.log de propósito.
        name: 'supdesk/backend-bootstrap',
        files: ['src/server.ts', 'src/swagger.ts'],
        rules: {
            'no-console': 'off',
        },
    },

    /* ------------------------------------------------------------------ *
     * Frontend — web/src/** (React, hooks e react-refresh; sem type-checking)
     * ------------------------------------------------------------------ */
    {
        name: 'supdesk/frontend',
        files: ['web/src/**/*.{ts,tsx}'],
        extends: [
            ...tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            globals: { ...globals.browser },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            // Exportar hooks e objetos/arrays de constantes junto do componente afeta o
            // Fast Refresh; a correção ideal é separar em outro arquivo (Lamp.tsx,
            // Toast.tsx, auth.tsx). Fica como aviso para não travar o lint.
            // Opções idênticas às do preset `vite` (allowConstantExport/allowCompoundComponents),
            // apenas com severidade reduzida.
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true, allowCompoundComponents: true },
            ],
            // Regras novas do React Compiler (react-hooks v7). Este projeto é React 18,
            // sem o compilador, e o data layer busca dados dentro de useEffect: ficam
            // como aviso até a refatoração (use()/Suspense ou biblioteca de queries).
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/purity': 'warn',
        },
    },

    /* ------------------------------------------------------------------ *
     * Arquivos de configuração / tooling (Node, sem JSX)
     * ------------------------------------------------------------------ */
    {
        name: 'supdesk/tooling',
        files: ['*.{js,mjs,cjs}', 'web/*.{ts,js,mjs,cjs}'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },

    // Sempre por último: desliga as regras de estilo que o Prettier já resolve.
    prettier,
);
