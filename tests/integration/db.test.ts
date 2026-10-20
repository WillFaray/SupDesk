import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import pool from '../../src/database.js';
import { computeMigrationChecksum, resetDatabase, runMigrations } from '../../src/db/migrator.js';
import { SEED_DEFAULT_PASSWORD, seedDatabase } from '../../src/db/seed.js';
import { limparTabelas } from '../helpers/db.js';

beforeEach(async () => {
    await limparTabelas();
});

afterAll(async () => {
    await pool.end();
});

describe('Migrações versionadas (src/db/migrator.ts)', () => {
    it('registra as migrações em schema_migrations e é idempotente ao rodar novamente', async () => {
        const segundaExecucao = await runMigrations(pool);
        expect(segundaExecucao.applied).toEqual([]);
        expect(segundaExecucao.skipped).toEqual([
            '001_initial_schema.sql',
            '002_constraints_and_indexes.sql',
        ]);

        const registros = await pool.query<{ version: string; checksum: string }>(
            'SELECT version, checksum FROM schema_migrations ORDER BY version ASC',
        );
        expect(registros.rows).toHaveLength(2);
        expect(registros.rows[0]?.version).toBe('001_initial_schema.sql');
        expect(registros.rows[1]?.version).toBe('002_constraints_and_indexes.sql');
    });

    it('detecta divergência de checksum se uma migração aplicada foi adulterada no banco', async () => {
        await pool.query('UPDATE schema_migrations SET checksum = $1 WHERE version = $2', [
            '0'.repeat(64),
            '001_initial_schema.sql',
        ]);

        await expect(runMigrations(pool)).rejects.toThrow(/Checksum divergente/);

        // Restaura o estado íntegro para os demais testes
        await resetDatabase(pool);
    });

    it('normaliza quebras de linha CRLF e LF no cálculo do checksum', () => {
        const lf = 'CREATE TABLE t (\n  id INT\n);\n';
        const crlf = 'CREATE TABLE t (\r\n  id INT\r\n);\r\n';
        expect(computeMigrationChecksum(lf)).toBe(computeMigrationChecksum(crlf));
    });
});

describe('Constraints e índices do schema (002_constraints_and_indexes.sql)', () => {
    it('impõe CHECK constraints em users.role e tickets (status, priority, category)', async () => {
        await expect(
            pool.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES ('x', 'x@e.com', 'h', 'superadmin')",
            ),
        ).rejects.toMatchObject({ code: '23514' });

        const userRes = await pool.query<{ id: number }>(
            "INSERT INTO users (username, email, password_hash, role) VALUES ('valido', 'v@e.com', 'h', 'usuario') RETURNING id",
        );
        const userId = userRes.rows[0]!.id;

        await expect(
            pool.query(
                "INSERT INTO tickets (user_id, title, description, status) VALUES ($1, 'T', 'Desc', 'Invalido')",
                [userId],
            ),
        ).rejects.toMatchObject({ code: '23514' });

        await expect(
            pool.query(
                "INSERT INTO tickets (user_id, title, description, priority) VALUES ($1, 'T', 'Desc', 'Urgente')",
                [userId],
            ),
        ).rejects.toMatchObject({ code: '23514' });

        await expect(
            pool.query(
                "INSERT INTO tickets (user_id, title, description, category) VALUES ($1, 'T', 'Desc', 'Impressora')",
                [userId],
            ),
        ).rejects.toMatchObject({ code: '23514' });
    });

    it('cria os índices de performance nas tabelas tickets, ticket_comments e revoked_tokens', async () => {
        const res = await pool.query<{ indexname: string }>(
            `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
        );
        const indices = res.rows.map((r) => r.indexname);

        expect(indices).toEqual(
            expect.arrayContaining([
                'idx_revoked_tokens_hash',
                'idx_revoked_tokens_expires_at',
                'idx_tickets_user_id_created_at',
                'idx_tickets_created_at_desc',
                'idx_tickets_status_priority_category',
                'idx_tickets_responsavel_id',
                'idx_ticket_comments_ticket_id_created_at',
            ]),
        );
    });
});

describe('Seed de desenvolvimento local (src/db/seed.ts)', () => {
    it('popula usuários, chamados e comentários de forma idempotente', async () => {
        const primeira = await seedDatabase(pool);
        expect(primeira).toEqual({
            users: 5,
            tickets: 6,
            comments: 4,
        });
        expect(SEED_DEFAULT_PASSWORD).toBe('SenhaForte123');

        // Rodar o seed uma segunda vez não duplica chamados nem comentários
        const segunda = await seedDatabase(pool);
        expect(segunda).toEqual({
            users: 5,
            tickets: 0,
            comments: 0,
        });

        const totalTickets = await pool.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM tickets',
        );
        expect(Number(totalTickets.rows[0]?.count)).toBe(6);
    });
});
