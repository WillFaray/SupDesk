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
            '003_ticket_workflow.sql',
        ]);

        const registros = await pool.query<{ version: string; checksum: string }>(
            'SELECT version, checksum FROM schema_migrations ORDER BY version ASC',
        );
        expect(registros.rows).toHaveLength(3);
        expect(registros.rows[0]?.version).toBe('001_initial_schema.sql');
        expect(registros.rows[1]?.version).toBe('002_constraints_and_indexes.sql');
        expect(registros.rows[2]?.version).toBe('003_ticket_workflow.sql');
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
                'idx_ticket_events_ticket_id_created_at',
            ]),
        );
    });
});

describe('Workflow de resolução no schema (003_ticket_workflow.sql)', () => {
    it('impõe consistência entre status Resolvido e o marco resolvido_em', async () => {
        const userRes = await pool.query<{ id: number }>(
            "INSERT INTO users (username, email, password_hash) VALUES ('w', 'w@e.com', 'h') RETURNING id",
        );
        const userId = userRes.rows[0]!.id;

        // Resolvido sem resolvido_em → viola o CHECK
        await expect(
            pool.query(
                "INSERT INTO tickets (user_id, title, description, status) VALUES ($1, 'T', 'Desc', 'Resolvido')",
                [userId],
            ),
        ).rejects.toMatchObject({ code: '23514' });

        // Aberto com resolvido_em → também viola
        await expect(
            pool.query(
                "INSERT INTO tickets (user_id, title, description, status, resolvido_em) VALUES ($1, 'T', 'Desc', 'Aberto', NOW())",
                [userId],
            ),
        ).rejects.toMatchObject({ code: '23514' });
    });

    it('restringe o tipo do evento e preserva a trilha quando o autor é removido', async () => {
        const autor = await pool.query<{ id: number }>(
            "INSERT INTO users (username, email, password_hash) VALUES ('a', 'a@e.com', 'h') RETURNING id",
        );
        const analista = await pool.query<{ id: number }>(
            "INSERT INTO users (username, email, password_hash, role) VALUES ('b', 'b@e.com', 'h', 'analista') RETURNING id",
        );
        const ticket = await pool.query<{ id: number }>(
            "INSERT INTO tickets (user_id, title, description) VALUES ($1, 'T', 'Desc') RETURNING id",
            [autor.rows[0]!.id],
        );
        const ticketId = ticket.rows[0]!.id;

        await expect(
            pool.query("INSERT INTO ticket_events (ticket_id, tipo) VALUES ($1, 'apagado')", [
                ticketId,
            ]),
        ).rejects.toMatchObject({ code: '23514' });

        await pool.query(
            "INSERT INTO ticket_events (ticket_id, user_id, tipo, status_anterior, status_novo) VALUES ($1, $2, 'assumido', 'Aberto', 'Em andamento')",
            [ticketId, analista.rows[0]!.id],
        );
        await pool.query('DELETE FROM users WHERE id = $1', [analista.rows[0]!.id]);

        const eventos = await pool.query<{ user_id: number | null; tipo: string }>(
            'SELECT user_id, tipo FROM ticket_events WHERE ticket_id = $1',
            [ticketId],
        );
        expect(eventos.rows).toEqual([{ user_id: null, tipo: 'assumido' }]);
    });
});

describe('Seed de desenvolvimento local (src/db/seed.ts)', () => {
    it('popula usuários, chamados, comentários e trilha de eventos de forma idempotente', async () => {
        const primeira = await seedDatabase(pool);
        expect(primeira).toEqual({
            users: 5,
            tickets: 6,
            comments: 4,
            events: 12,
        });
        expect(SEED_DEFAULT_PASSWORD).toBe('SenhaForte123');

        // Chamados resolvidos do seed trazem justificativa e quem resolveu
        const resolvidos = await pool.query<{ resolucao: string | null; resolvido_por_id: number }>(
            "SELECT resolucao, resolvido_por_id FROM tickets WHERE status = 'Resolvido'",
        );
        expect(resolvidos.rows).toHaveLength(2);
        for (const r of resolvidos.rows) {
            expect(r.resolucao?.length).toBeGreaterThanOrEqual(10);
            expect(r.resolvido_por_id).toBeTruthy();
        }

        // Rodar o seed uma segunda vez não duplica chamados nem comentários
        const segunda = await seedDatabase(pool);
        expect(segunda).toEqual({
            users: 5,
            tickets: 0,
            comments: 0,
            events: 0,
        });

        const totalTickets = await pool.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM tickets',
        );
        expect(Number(totalTickets.rows[0]?.count)).toBe(6);
    });
});
