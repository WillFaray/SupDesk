import 'dotenv/config';
import pg from 'pg';
import { logger } from './observability/logger.js';

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

// Evita crash do processo Node caso uma conexão ociosa do pool caia.
pool.on('error', (err) => {
    logger.error('Erro inesperado em conexão ociosa do PostgreSQL', {
        errorType: 'database_error',
        detail: err.message,
    });
});

export default pool;
