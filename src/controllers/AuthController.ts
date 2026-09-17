import type express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database.js';
import { revokeToken } from '../tokenRevocation.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import type { LoginDTO } from '../schemas/userSchema.js';
import type { JwtClaims, UserRow } from '../types/db.js';

export const login = async (
    req: AuthRequest<LoginDTO>,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const { email, password } = req.body;
        const userResult = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [
            email,
        ]);
        const user = userResult.rows[0];

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            res.status(401).json({ error: 'Email ou senha inválidos' });
            return;
        }

        const claims: Omit<JwtClaims, 'iat' | 'exp'> = {
            id: user.id,
            role: user.role,
        };

        const token = jwt.sign(claims, process.env.JWT_SECRET as string, {
            expiresIn: '8h',
        });

        res.status(200).json({
            message: 'Login bem-sucedido',
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        const claims = req.user;

        if (!token || !claims) {
            res.status(401).json({ error: 'Token não fornecido.' });
            return;
        }

        await revokeToken(token, claims.exp);

        res.status(200).json({
            message: 'Logout realizado com sucesso. O token foi revogado no servidor.',
            token: null,
        });
    } catch (error) {
        next(error);
    }
};
