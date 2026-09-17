import type express from 'express';
import pool from '../database.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import type {
    CreateCommentDTO,
    CreateTicketDTO,
    UpdateTicketStatusDTO,
} from '../schemas/ticketSchema.js';
import type {
    CommentListItemRow,
    TicketCommentRow,
    TicketDetailRow,
    TicketListItemRow,
    TicketRow,
} from '../types/db.js';

const queryStr = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

const paramId = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

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
        const result = await pool.query<TicketRow>(
            'INSERT INTO tickets (user_id, title, description, priority, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, title, description, priority, category],
        );
        const ticket = result.rows[0];

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

        let query =
            'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.priority, tickets.category, tickets.created_at, autor.username AS autor_do_chamado, responsavel.username AS responsavel FROM tickets JOIN users AS autor ON tickets.user_id = autor.id LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id WHERE 1=1';

        const values: (string | number)[] = [];
        let valueIndex = 1;

        // Usuário comum vê apenas os próprios chamados; admin/analista veem todos.
        if (role === 'usuario') {
            query += ` AND tickets.user_id = $${valueIndex++}`;
            values.push(id);
        }

        const status = queryStr(req.query.status);
        if (status) {
            query += ` AND tickets.status = $${valueIndex++}`;
            values.push(status);
        }

        const priority = queryStr(req.query.priority);
        if (priority) {
            query += ` AND tickets.priority = $${valueIndex++}`;
            values.push(priority);
        }

        const category = queryStr(req.query.category);
        if (category) {
            query += ` AND tickets.category = $${valueIndex++}`;
            values.push(category);
        }

        query += ' ORDER BY tickets.created_at DESC';
        query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
        values.push(limit, offset);

        const result = await pool.query<TicketListItemRow>(query, values);

        res.status(200).json({
            paginaAtual: page,
            limite: limit,
            total: result.rows.length,
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
        const { status } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }

        const result = await pool.query<TicketRow>(
            'UPDATE tickets SET status = $1, responsavel_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status, userId, id],
        );
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
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const { message } = req.body;

        const ticketCheck = await pool.query<{ id: number }>(
            'SELECT id FROM tickets WHERE id = $1',
            [ticketId],
        );
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
                autor.username AS autor_do_chamado,
                responsavel.username AS responsavel 
            FROM tickets 
            JOIN users AS autor ON tickets.user_id = autor.id 
            LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id 
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
