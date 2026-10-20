// Provisiona o banco de dados usado pela suíte de testes de integração.
//
// Estratégia: em vez de mockar o `pg`, os testes rodam contra um banco REAL e
// isolado (`supdesk_test`), provisionado pelas migrações versionadas de
// `migrations/`. Assim o SQL dos controllers, constraints e índices são
// exercitados de verdade.
import 'dotenv/config';
import pg from 'pg';
import { resetDatabase } from '../src/db/migrator.js';

const NOME_BANCO_TESTE = process.env.DB_TEST_NAME ?? 'supdesk_test';

/** Configuração de conexão (mesmas credenciais do .env; senha pode ser vazia). */
const configuracao = {
    user: process.env.DB_USER ?? 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    password: process.env.DB_PASSWORD ?? '',
    port: Number(process.env.DB_PORT ?? 5432),
};

export default async function globalSetup(): Promise<void> {
    // 1. Garante que o banco de teste existe (conecta no banco padrão 'postgres').
    const admin = new pg.Client({ ...configuracao, database: 'postgres' });
    try {
        await admin.connect();
        const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
            NOME_BANCO_TESTE,
        ]);
        if (existe.rowCount === 0) {
            await admin.query(`CREATE DATABASE ${NOME_BANCO_TESTE}`);
            console.info(`[testes] Banco "${NOME_BANCO_TESTE}" criado.`);
        }
    } finally {
        await admin.end();
    }

    // 2. Reseta e aplica todas as migrações versionadas em `migrations/`.
    const testPool = new pg.Pool({ ...configuracao, database: NOME_BANCO_TESTE });
    try {
        const resultado = await resetDatabase(testPool);
        console.info(
            `[testes] Esquema aplicado em "${NOME_BANCO_TESTE}" (${resultado.applied.length} migrações).`,
        );
    } finally {
        await testPool.end();
    }
}
