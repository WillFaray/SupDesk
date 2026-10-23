import type express from 'express';
import pool from '../database.js';
import { buildTransitionUpdate, classifyTransition } from '../domain/ticketWorkflow.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { parsePositiveIntId } from '../middlewares/validateMiddleware.js';
import type {
    CreateCommentDTO,
    CreateTicketDTO,
    UpdateTicketStatusDTO,
} from '../schemas/ticketSchema.js';
import type {
    CommentListItemRow,
    TicketCommentRow,
    TicketDetailRow,
    TicketEventListItemRow,
    TicketListItemRow,
    TicketRow,
    TicketStatus,
} from '../types/db.js';

const queryStr = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const paramId = (value: unknown): number | undefined => parsePositiveIntId(value) ?? undefined;

const escapeLike = (term: string): string => term.replace(/[\\%_]/g, '\\$&');

type SortByField = 'created_at' | 'priority' | 'status' | 'updated_at';
type SortDirection = 'asc' | 'desc';

const buildOrderByClause = (sortBy: SortByField, sortOrder: SortDirection): string => {
    const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    switch (sortBy) {
        case 'priority':
            return `CASE tickets.priority WHEN 'Alta' THEN 3 WHEN 'Média' THEN 2 WHEN 'Baixa' THEN 1 ELSE 0 END ${dir}, tickets.created_at DESC, tickets.id DESC`;
        case 'status':
            return `CASE tickets.status WHEN 'Aberto' THEN 1 WHEN 'Em andamento' THEN 2 WHEN 'Resolvido' THEN 3 ELSE 4 END ${dir}, tickets.created_at DESC, tickets.id DESC`;
        case 'updated_at':
            return `tickets.updated_at ${dir}, tickets.id ${dir}`;
        case 'created_at':
        default:
            return `tickets.created_at ${dir}, tickets.id ${dir}`;
    }
};

export const CreateTicket = async (
    req: AuthRequest<CreateTicketDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }

        const { title, description, priority, category } = req.body;

        // Criação + evento "criado" na mesma transação: a trilha nunca fica órfã.
        const client = await pool.connect();
        let ticket: TicketRow | undefined;
        try {
            await client.query('BEGIN');
            const result = await client.query<TicketRow>(
                'INSERT INTO tickets (user_id, title, description, priority, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [userId, title, description, priority, category],
            );
            ticket = result.rows[0];
            if (ticket) {
                await client.query(
                    `INSERT INTO ticket_events (ticket_id, user_id, tipo, status_novo, created_at)
                     VALUES ($1, $2, 'criado', 'Aberto', $3)`,
                    [ticket.id, userId, ticket.created_at],
                );
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        if (!ticket) {
            res.status(500).json({ error: 'Erro ao criar chamado' });
            return;
        }

        res.status(201).json(ticket);
    } catch (error) {
        next(error);
    }
};

export const listTickets = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const claims = req.user;
        if (!claims) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { id, role } = claims;

        const page = Math.max(1, Number.parseInt(queryStr(req.query.page) ?? '1', 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(queryStr(req.query.limit) ?? '10', 10) || 10),
        );
        const offset = (page - 1) * limit;

        const baseFrom =
            'FROM tickets JOIN users AS autor ON tickets.user_id = autor.id LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id WHERE 1=1';

        let whereClause = '';
        const filterValues: (string | number)[] = [];
        let valueIndex = 1;

        // Usuário comum vê apenas os próprios chamados; admin/analista veem todos.
        if (role === 'usuario') {
            whereClause += ` AND tickets.user_id = $${valueIndex++}`;
            filterValues.push(id);
        }

        const status = queryStr(req.query.status);
        if (status) {
            whereClause += ` AND tickets.status = $${valueIndex++}`;
            filterValues.push(status);
        }

        const priority = queryStr(req.query.priority);
        if (priority) {
            whereClause += ` AND tickets.priority = $${valueIndex++}`;
            filterValues.push(priority);
        }

        const category = queryStr(req.query.category);
        if (category) {
            whereClause += ` AND tickets.category = $${valueIndex++}`;
            filterValues.push(category);
        }

        const rawSearch = queryStr(req.query.q) ?? queryStr(req.query.search);
        if (rawSearch) {
            const cleanedId = rawSearch.startsWith('#') ? rawSearch.slice(1).trim() : rawSearch;
            const pattern = `%${escapeLike(cleanedId)}%`;
            whereClause += ` AND (tickets.title ILIKE $${valueIndex} ESCAPE '\\' OR tickets.description ILIKE $${valueIndex} ESCAPE '\\' OR autor.username ILIKE $${valueIndex} ESCAPE '\\' OR COALESCE(responsavel.username, '') ILIKE $${valueIndex} ESCAPE '\\' OR CAST(tickets.id AS TEXT) ILIKE $${valueIndex} ESCAPE '\\')`;
            valueIndex++;
            filterValues.push(pattern);
        }

        const rawSortBy = queryStr(req.query.sortBy);
        const sortBy: SortByField =
            rawSortBy === 'priority' ||
            rawSortBy === 'status' ||
            rawSortBy === 'updated_at' ||
            rawSortBy === 'created_at'
                ? rawSortBy
                : 'created_at';

        const rawSortOrder = queryStr(req.query.sortOrder)?.toLowerCase();
        const sortOrder: SortDirection =
            rawSortOrder === 'asc' || rawSortOrder === 'desc'
                ? rawSortOrder
                : sortBy === 'status'
                  ? 'asc'
                  : 'desc';

        const orderByClause = buildOrderByClause(sortBy, sortOrder);

        const listQuery = `SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.priority, tickets.category, tickets.created_at, tickets.updated_at, autor.username AS autor_do_chamado, responsavel.username AS responsavel ${baseFrom}${whereClause} ORDER BY ${orderByClause} LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
        const listValues = [...filterValues, limit, offset];

        const countQuery = `SELECT COUNT(*)::int AS total ${baseFrom}${whereClause}`;

        const scopeWhere = role === 'usuario' ? 'WHERE tickets.user_id = $1' : '';
        const scopeValues = role === 'usuario' ? [id] : [];
        const summaryQuery = `
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE tickets.status = 'Aberto')::int AS abertos,
                COUNT(*) FILTER (WHERE tickets.status = 'Em andamento')::int AS em_andamento,
                COUNT(*) FILTER (WHERE tickets.status = 'Resolvido')::int AS resolvidos,
                COUNT(*) FILTER (WHERE tickets.priority = 'Alta' AND tickets.status <> 'Resolvido')::int AS alta_prioridade
            FROM tickets
            ${scopeWhere}
        `;

        const [result, countResult, summaryResult] = await Promise.all([
            pool.query<TicketListItemRow>(listQuery, listValues),
            pool.query<{ total: number }>(countQuery, filterValues),
            pool.query<{
                total: number;
                abertos: number;
                em_andamento: number;
                resolvidos: number;
                alta_prioridade: number;
            }>(summaryQuery, scopeValues),
        ]);

        const total = countResult.rows[0]?.total ?? result.rows.length;
        const totalPaginas = Math.max(1, Math.ceil(total / limit));
        const sumRow = summaryResult.rows[0];

        res.status(200).json({
            paginaAtual: page,
            limite: limit,
            total,
            totalPaginas,
            resumo: {
                total: sumRow?.total ?? total,
                abertos: sumRow?.abertos ?? 0,
                emAndamento: sumRow?.em_andamento ?? 0,
                resolvidos: sumRow?.resolvidos ?? 0,
                altaPrioridade: sumRow?.alta_prioridade ?? 0,
            },
            tickets: result.rows,
        });
    } catch (error) {
        next(error);
    }
};

export const updateTicket = async (
    req: AuthRequest<UpdateTicketStatusDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const id = paramId(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }
        const { status, resolucao, motivo } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }

        // Transação + SELECT ... FOR UPDATE serializa transições concorrentes no
        // mesmo chamado: dois analistas clicando "Assumir" ao mesmo tempo resultam
        // em um 200 e um 409 — nunca em responsável sobrescrito silenciosamente.
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const current = await client.query<{ status: TicketStatus }>(
                'SELECT status FROM tickets WHERE id = $1 FOR UPDATE',
                [id],
            );
            const atual = current.rows[0];
            if (!atual) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Chamado não encontrado' });
                return;
            }

            const tipo = classifyTransition(atual.status, status);
            if (!tipo) {
                await client.query('ROLLBACK');
                res.status(409).json({
                    error: `O chamado já está "${status}". Atualize a página para ver o estado mais recente.`,
                });
                return;
            }

            const { sql, paramCount } = buildTransitionUpdate(tipo, status);
            const params = [status, id, userId, resolucao ?? null].slice(0, paramCount);
            const result = await client.query<TicketRow>(sql, params);
            const ticket = result.rows[0];

            const detalhe = tipo === 'resolvido' ? (resolucao ?? null) : motivo || null;
            await client.query(
                `INSERT INTO ticket_events (ticket_id, user_id, tipo, status_anterior, status_novo, detalhe)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, userId, tipo, atual.status, status, detalhe],
            );

            await client.query('COMMIT');
            res.status(200).json(ticket);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
};

export const deleteTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const id = paramId(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }

        const result = await pool.query<TicketRow>(
            'DELETE FROM tickets WHERE id = $1 RETURNING id',
            [id],
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }
        res.status(200).json({ message: 'Chamado excluído com sucesso' });
    } catch (error) {
        next(error);
    }
};

export const adicionarComentario = async (
    req: AuthRequest<CreateCommentDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const ticketId = paramId(req.params.id);
        if (!ticketId) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }
        const claims = req.user;
        if (!claims) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { id: userId, role } = claims;
        const { message } = req.body;

        const ticketCheckQuery =
            role === 'usuario'
                ? 'SELECT id FROM tickets WHERE id = $1 AND user_id = $2'
                : 'SELECT id FROM tickets WHERE id = $1';
        const ticketCheckValues = role === 'usuario' ? [ticketId, userId] : [ticketId];

        const ticketCheck = await pool.query<{ id: number }>(ticketCheckQuery, ticketCheckValues);
        if (!ticketCheck.rowCount) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }

        const result = await pool.query<TicketCommentRow>(
            'INSERT INTO ticket_comments (ticket_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
            [ticketId, userId, message],
        );
        const comment = result.rows[0];

        if (!comment) {
            res.status(500).json({ error: 'Erro ao adicionar comentário' });
            return;
        }

        res.status(201).json({
            status: 'success',
            message: 'Comentário adicionado com sucesso',
            comment,
        });
    } catch (error) {
        next(error);
    }
};

export const listarComentarios = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const ticketId = paramId(req.params.id);
        if (!ticketId) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }
        const claims = req.user;
        if (!claims) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { id: userId, role } = claims;

        const ticketCheckQuery =
            role === 'usuario'
                ? 'SELECT id FROM tickets WHERE id = $1 AND user_id = $2'
                : 'SELECT id FROM tickets WHERE id = $1';
        const ticketCheckValues = role === 'usuario' ? [ticketId, userId] : [ticketId];

        const ticketCheck = await pool.query<{ id: number }>(ticketCheckQuery, ticketCheckValues);
        if (!ticketCheck.rowCount) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }

        const query = `
            SELECT 
                ticket_comments.id, 
                ticket_comments.message, 
                ticket_comments.created_at,
                users.username AS autor_do_comentario,
                users.role AS perfil_do_autor
            FROM ticket_comments
            JOIN users ON ticket_comments.user_id = users.id
            WHERE ticket_comments.ticket_id = $1
            ORDER BY ticket_comments.created_at ASC;
        `;

        const result = await pool.query<CommentListItemRow>(query, [ticketId]);
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const id = paramId(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }
        const claims = req.user;
        if (!claims) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { role, id: userId } = claims;

        let query = `
            SELECT 
                tickets.id, 
                tickets.title, 
                tickets.description, 
                tickets.status, 
                tickets.priority, 
                tickets.category, 
                tickets.created_at,
                tickets.updated_at,
                tickets.primeiro_atendimento_em,
                tickets.resolvido_em,
                tickets.resolucao,
                autor.username AS autor_do_chamado,
                responsavel.username AS responsavel,
                resolvedor.username AS resolvido_por
            FROM tickets 
            JOIN users AS autor ON tickets.user_id = autor.id 
            LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id 
            LEFT JOIN users AS resolvedor ON tickets.resolvido_por_id = resolvedor.id 
            WHERE tickets.id = $1`;

        const values: (string | number)[] = [id];

        if (role === 'usuario') {
            query += ' AND tickets.user_id = $2';
            values.push(userId);
        }

        const result = await pool.query<TicketDetailRow>(query, values);
        const ticket = result.rows[0];

        if (!ticket) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }

        res.status(200).json(ticket);
    } catch (error) {
        next(error);
    }
};

export const listarHistorico = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const ticketId = paramId(req.params.id);
        if (!ticketId) {
            res.status(400).json({ error: 'Identificador inválido' });
            return;
        }
        const claims = req.user;
        if (!claims) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { id: userId, role } = claims;

        // Mesmo escopo dos comentários: usuário comum só vê a trilha dos próprios chamados.
        const ticketCheckQuery =
            role === 'usuario'
                ? 'SELECT id FROM tickets WHERE id = $1 AND user_id = $2'
                : 'SELECT id FROM tickets WHERE id = $1';
        const ticketCheckValues = role === 'usuario' ? [ticketId, userId] : [ticketId];

        const ticketCheck = await pool.query<{ id: number }>(ticketCheckQuery, ticketCheckValues);
        if (!ticketCheck.rowCount) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }

        const result = await pool.query<TicketEventListItemRow>(
            `SELECT
                ticket_events.id,
                ticket_events.tipo,
                ticket_events.status_anterior,
                ticket_events.status_novo,
                ticket_events.detalhe,
                ticket_events.created_at,
                users.username AS autor,
                users.role AS perfil_do_autor
            FROM ticket_events
            LEFT JOIN users ON ticket_events.user_id = users.id
            WHERE ticket_events.ticket_id = $1
            ORDER BY ticket_events.created_at ASC, ticket_events.id ASC`,
            [ticketId],
        );
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};
