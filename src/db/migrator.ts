import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type pg from 'pg';

export interface MigrationFile {
    version: string;
    filePath: string;
    sql: string;
    checksum: string;
}

export interface MigrationResult {
    applied: string[];
    skipped: string[];
}

export const computeMigrationChecksum = (sql: string): string => {
    const normalized = sql.replace(/\r\n/g, '\n').trim();
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
};

export const loadMigrationFiles = (migrationsDir = path.resolve('migrations')): MigrationFile[] => {
    if (!fs.existsSync(migrationsDir)) {
        return [];
    }

    const entries = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));

    return entries.map((filename) => {
        const filePath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        return {
            version: filename,
            filePath,
            sql,
            checksum: computeMigrationChecksum(sql),
        };
    });
};

export const ensureMigrationsTable = async (
    queryable: Pick<pg.Pool | pg.PoolClient | pg.Client, 'query'>,
): Promise<void> => {
    await queryable.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(100) PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

export const runMigrations = async (
    poolOrClient: pg.Pool,
    migrationsDir = path.resolve('migrations'),
): Promise<MigrationResult> => {
    const files = loadMigrationFiles(migrationsDir);
    const applied: string[] = [];
    const skipped: string[] = [];

    const client = await poolOrClient.connect();
    try {
        await ensureMigrationsTable(client);

        const existingRes = await client.query<{ version: string; checksum: string }>(
            'SELECT version, checksum FROM schema_migrations ORDER BY version ASC',
        );
        const appliedMap = new Map<string, string>(
            existingRes.rows.map((row) => [row.version, row.checksum]),
        );

        for (const migration of files) {
            const recordedChecksum = appliedMap.get(migration.version);
            if (recordedChecksum !== undefined) {
                if (recordedChecksum !== migration.checksum) {
                    throw new Error(
                        `Checksum divergente na migração já aplicada "${migration.version}". Esperado ${recordedChecksum}, encontrado ${migration.checksum}.`,
                    );
                }
                skipped.push(migration.version);
                continue;
            }

            await client.query('BEGIN');
            try {
                await client.query(migration.sql);
                await client.query(
                    'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
                    [migration.version, migration.checksum],
                );
                await client.query('COMMIT');
                applied.push(migration.version);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }
    } finally {
        client.release();
    }

    return { applied, skipped };
};

export const resetDatabase = async (
    poolOrClient: pg.Pool,
    migrationsDir = path.resolve('migrations'),
): Promise<MigrationResult> => {
    await poolOrClient.query(`
        DROP TABLE IF EXISTS ticket_events CASCADE;
        DROP TABLE IF EXISTS ticket_comments CASCADE;
        DROP TABLE IF EXISTS tickets CASCADE;
        DROP TABLE IF EXISTS revoked_tokens CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS schema_migrations CASCADE;
    `);

    return runMigrations(poolOrClient, migrationsDir);
};
