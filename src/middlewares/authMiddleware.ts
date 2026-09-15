import type express from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends express.Request {
    user?: any;
}

export const verifyToken = (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    const tokenParts = authHeader.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
        return res.status(401).json({ error: 'Formato de token inválido.' });
    }

    const [, token] = tokenParts;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        return next();
    } catch {
        return res.status(401).json({ error: 'Token inválido.' });
    }
};
