import type express from 'express';
import pool from '../database.js';
import bcrypt from 'bcrypt';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import type { RegisterDTO, UpdateUserDTO } from '../schemas/userSchema.js';
import type { UserPublicRow, UserSafeRow } from '../types/db.js';

export const CreateUser = async (
    req: AuthRequest<RegisterDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const { username, email, password_hash } = req.body;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        const result = await pool.query<UserPublicRow>(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
            [username, email, hashedPassword, 'usuario'],
        );
        const user = result.rows[0];

        if (!user) {
            res.status(500).json({ error: 'Erro ao criar usuário' });
            return;
        }

        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
};

export const getMe = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }

        const result = await pool.query<UserPublicRow>(
            'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
            [userId],
        );
        const user = result.rows[0];

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

export const listUsers = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const result = await pool.query<UserPublicRow>(
            'SELECT id, username, email, role, created_at FROM users',
        );
        res.status(200).json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (
    req: AuthRequest<UpdateUserDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }

        const { username, email, password_hash } = req.body;

        const updates: string[] = [];
        const values: (string | number)[] = [];
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
            res.status(400).json({ error: 'Nenhum campo para atualizar' });
            return;
        }

        updates.push('updated_at = NOW()');
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role`;
        const result = await pool.query<UserSafeRow>(query, values);
        const user = result.rows[0];

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        res.status(200).json({
            message: 'Usuário atualizado com sucesso',
            user,
        });
    } catch (error) {
        next(error);
    }
};
