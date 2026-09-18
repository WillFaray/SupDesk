// Provisiona o banco de dados usado pela suíte de testes de integração.
//
// Estratégia: em vez de mockar o `pg`, os testes rodam contra um banco REAL e
// isolado (`supdesk_test`), criado a partir do mesmo `setup.sql` de
// desenvolvimento. Assim o SQL dos controllers é exercitado de verdade
// (filtros, paginação, FKs, revogação de tokens etc.).
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

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

    // 2. Aplica o esquema do zero (setup.sql derruba e recria as tabelas).
    const db = new pg.Client({ ...configuracao, database: NOME_BANCO_TESTE });
    try {
        await db.connect();
        const esquema = fs.readFileSync(path.resolve('setup.sql'), 'utf8');
        await db.query(esquema);
    } finally {
        await db.end();
    }
    console.info(`[testes] Esquema aplicado em "${NOME_BANCO_TESTE}".`);
}
