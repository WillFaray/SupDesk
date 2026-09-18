import type express from 'express';
import jwt from 'jsonwebtoken';
import { consultarSessao } from '../authSession.js';
import type { EstadoSessao } from '../authSession.js';
import type { JwtClaims } from '../types/db.js';

export interface AuthRequest<TBody = unknown> extends express.Request {
    body: TBody;
    user?: JwtClaims;
}

const isUserRole = (role: unknown): role is JwtClaims['role'] =>
    role === 'admin' || role === 'analista' || role === 'usuario';

export const verifyToken = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        return;
    }

    const tokenParts = authHeader.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
        res.status(401).json({ error: 'Formato de token inválido.' });
        return;
    }

    const [, token] = tokenParts;

    let claims: JwtClaims;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        if (typeof decoded === 'string') {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const payload = decoded as Record<string, unknown>;
        const { id, role, iat, exp } = payload;
        if (typeof id !== 'number' || !isUserRole(role) || typeof exp !== 'number') {
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        claims = {
            id,
            role,
            exp,
            iat: typeof iat === 'number' ? iat : 0,
        };
    } catch {
        res.status(401).json({ error: 'Token inválido.' });
        return;
    }

    // A assinatura prova que o token é nosso; o banco diz se a sessão e o
    // PAPEL ainda valem agora (conta removida, logout ou papel alterado).
    let estado: EstadoSessao;
    try {
        estado = await consultarSessao(claims.id, token);
    } catch (error) {
        next(error);
        return;
    }

    if (estado.situacao === 'inexistente') {
        res.status(401).json({ error: 'Usuário não encontrado. Faça login novamente.' });
        return;
    }

    if (estado.situacao === 'revogada') {
        res.status(401).json({ error: 'Token revogado. Faça login novamente.' });
        return;
    }

    // O papel efetivo é o do banco — nunca o que ficou congelado no token.
    req.user = { ...claims, role: estado.role };
    next();
};

export const requireRole =
    (...roles: JwtClaims['role'][]) =>
    (req: AuthRequest, res: express.Response, next: express.NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: `Acesso negado. Requer papel: ${roles.join(' ou ')}.`,
            });
            return;
        }
        next();
    };
