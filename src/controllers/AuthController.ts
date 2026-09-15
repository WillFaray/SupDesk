import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const login = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        const { email, password } = req.body;
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' },
        );

        return res.status(200).json({
            message: 'Login bem-sucedido',
            token,
            user: { id: user.id, username: user.username, role: user.role },
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    try {
        return res.status(200).json({
            message: 'Logout realizado com sucesso',
            token: null,
        });
    } catch (error) {
        next(error);
    }
};
