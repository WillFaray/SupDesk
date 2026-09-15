import express from 'express';
import pool from '../database.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const CreateTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const user_id = req.user.id;
        const { title, description, priority, category } = req.body;
        const query =
            'INSERT INTO tickets (user_id, title, description, priority, category) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [user_id, title, description, priority || 'Média', category || 'Outros'];
        const result = await pool.query(query, values);
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const listTickets = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id, role } = req.user;

        const { status, priority, category, page = '1', limit = '10' } = req.query;
        const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

        let query =
            'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.priority, tickets.category, tickets.created_at, autor.username AS autor_do_chamado, responsavel.username AS responsavel FROM tickets JOIN users AS autor ON tickets.user_id = autor.id LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id WHERE 1=1';

        let values: any[] = [];
        let valueIndex = 1;

        if (role === 'user') {
            query += ` AND tickets.user_id = $${valueIndex++}`;
            values.push(id);
        }
        if (status) {
            query += ` AND tickets.status = $${valueIndex++}`;
            values.push(status);
        }
        if (priority) {
            query += ` AND tickets.priority = $${valueIndex++}`;
            values.push(priority);
        }
        if (category) {
            query += ` AND tickets.category = $${valueIndex++}`;
            values.push(category);
        }
        query += ' ORDER BY tickets.created_at DESC';
        query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
        values.push(parseInt(limit as string, 10), offset);

        const result = await pool.query(query, values);
        return res.status(200).json({
            paginaAtual: parseInt(page as string, 10),
            limite: parseInt(limit as string, 10),
            total: result.rows.length,
            tickets: result.rows,
        });
    } catch (error) {
        next(error);
    }
};

export const updateTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole !== 'admin' && userRole !== 'analista') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const query =
            'UPDATE tickets SET status = $1, responsavel_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
        const values = [status, userId, id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const deleteTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;

        if (userRole !== 'admin' && userRole !== 'analista') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const query = 'DELETE FROM tickets WHERE id = $1 RETURNING *';
        const values = [id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }
        return res.status(200).json({ message: 'Chamado excluído com sucesso' });
    } catch (error) {
        next(error);
    }
};

export const adicionarComentario = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id: ticketId } = req.params;

        const UserId = req.user.id;
        const { message } = req.body;

        const ticketCheck = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
        if (ticketCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }

        const query =
            'INSERT INTO ticket_comments (ticket_id, user_id, message) VALUES ($1, $2, $3) RETURNING *';
        const result = await pool.query(query, [ticketId, UserId, message]);
        return res.status(201).json({
            status: 'success',
            message: 'Comentário adicionado com sucesso',
            comment: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

export const listarComentarios = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id: ticketId } = req.params;
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

        const result = await pool.query(query, [ticketId]);
        return res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getTicket = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

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

        const values = [id];

        // Usuários comuns só podem ver seus próprios tickets
        if (role === 'user') {
            query += ' AND tickets.user_id = $2';
            values.push(userId);
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};
