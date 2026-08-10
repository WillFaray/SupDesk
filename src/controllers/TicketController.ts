import express from 'express';
import pool from '../database.js';

export const CreateTicket = async (req: express.Request, res: express.Response) => {
    try {
        const { user_id, title, description } = req.body;
        const query = 'INSERT INTO tickets (user_id, title, description) VALUES ($1, $2, $3) RETURNING *';
        const values = [user_id, title, description];
        const result = await pool.query(query, values);
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao criar chamado' });
    }
};

export const listTickets = async (req: express.Request, res: express.Response) => {
    try {
        const query = 'SELECT tickets.id, tickets.title, tickets.description, tickets.status, tickets.created_at, tickets.updated_at, users.username AS autor_do_chamado FROM tickets JOIN users ON tickets.user_id = users.id ORDER BY tickets.created_at DESC';
        const result = await pool.query(query);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar chamados' });
    }
};

export const updateTicket = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const query = 'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        const values = [status, id];
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

export const deleteTicket = async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
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
