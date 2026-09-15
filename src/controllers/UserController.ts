import type express from 'express';
import pool from '../database.js';
import bcrypt from 'bcrypt';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const CreateUser = async (req: express.Request, res: express.Response) => {
    try {
        const { username, email, password_hash, role } = req.body;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        const query =
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *';
        const values = [username, email, hashedPassword, role];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

export const listUsers = async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query('SELECT id, username, email, role FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

export const updateUser = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const userId = req.user.id;
        const { username, email, password_hash } = req.body;

        // Construir query dinâmica baseada no que foi fornecido
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (username !== undefined) {
            updates.push(`username = $${paramIndex++}`);
            values.push(username);
        }

        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }

        if (password_hash !== undefined) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        return res.status(200).json({
            message: 'Usuário atualizado com sucesso',
            user: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};
