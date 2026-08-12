import express from 'express';
import pool from '../database.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const CreateTicket = async (req: AuthRequest, res: express.Response) => {
    try {
        const user_id = req.user.id;
        const { title, description, priority, category } = req.body;
        const query = 'INSERT INTO tickets (user_id, title, description, priority, category) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [user_id, title, description, priority || 'Média', category || 'Outros'];
        const result = await pool.query(query, values);
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao criar chamado' });
    }
};

export const listTickets = async (req: AuthRequest, res: express.Response) => {
    try {
        const { id, role } = req.user;

        let query = 'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.priority, tickets.category, tickets.created_at, tickets.updated_at, users.username AS autor_do_chamado, responsavel.username AS responsavel FROM tickets JOIN users AS autor ON tickets.user_id = users.id LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id ORDER BY tickets.created_at DESC';

        let values = [];

        if (role === 'user') {
            query = 'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.priority, tickets.category, tickets.created_at, tickets.updated_at, users.username AS autor_do_chamado, responsavel.username AS responsavel FROM tickets JOIN users AS autor ON tickets.user_id = users.id LEFT JOIN users AS responsavel ON tickets.responsavel_id = responsavel.id ';
            values.push(id);
        } else {
            query += ' ORDER BY tickets.created_at DESC';
        }
        const result = await pool.query(query, values);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar chamados' });
    }
};

export const updateTicket = async (req: AuthRequest, res: express.Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole !== 'admin' && userRole !== 'analista') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const query = 'UPDATE tickets SET status = $1, responsavel_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
        const values = [status, userId, id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado' });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao atualizar chamado' });
    }
}

export const deleteTicket = async (req: AuthRequest, res: express.Response) => {
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
        console.error(error);
        return res.status(500).json({ error: 'Erro ao excluir chamado' });
    }
};
