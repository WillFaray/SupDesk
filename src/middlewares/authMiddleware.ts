import type express from 'express';
import jwt from 'jsonwebtoken';
import { consultarSessao } from '../authSession.js';
import type { EstadoSessao } from '../authSession.js';
import { recordAuthEvent } from '../observability/metrics.js';
import type { JwtClaims } from '../types/db.js';

export interface AuthRequest<TBody = unknown> extends express.Request {
    body: TBody;
    user?: JwtClaims;
}

const MAX_TOKEN_LENGTH = 2048;

const isUserRole = (role: unknown): role is JwtClaims['role'] =>
    role === 'admin' || role === 'analista' || role === 'usuario';

const isValidPositiveId = (id: unknown): id is number =>
    typeof id === 'number' && Number.isSafeInteger(id) && id >= 1;

export const verifyToken = async (
    req: AuthRequest,
    res: express.Response,
    next: express.NextFunction,
): Promise<void> => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
        recordAuthEvent('tokenRejected');
        res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        return;
    }

    const tokenParts = authHeader.trim().split(' ');

    if (
        tokenParts.length !== 2 ||
        tokenParts[0] !== 'Bearer' ||
        !tokenParts[1] ||
        tokenParts[1].length > MAX_TOKEN_LENGTH ||
        /\s/.test(tokenParts[1])
    ) {
        recordAuthEvent('tokenRejected');
        res.status(401).json({ error: 'Formato de token inválido.' });
        return;
    }

    const [, token] = tokenParts;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        next(new Error('JWT_SECRET não definido'));
        return;
    }

    let claims: JwtClaims;
    try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        if (typeof decoded === 'string') {
            recordAuthEvent('tokenRejected');
            res.status(401).json({ error: 'Token inválido.' });
            return;
        }
        const payload = decoded as Record<string, unknown>;
        const { id, role, iat, exp } = payload;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const validIat =
            iat === undefined || (typeof iat === 'number' && Number.isFinite(iat) && iat >= 0);

        if (
            !isValidPositiveId(id) ||
            !isUserRole(role) ||
            typeof exp !== 'number' ||
            !Number.isFinite(exp) ||
            exp <= nowSeconds ||
            !validIat
        ) {
            recordAuthEvent('tokenRejected');
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
        recordAuthEvent('tokenRejected');
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
        recordAuthEvent('tokenRejected');
        res.status(401).json({ error: 'Usuário não encontrado. Faça login novamente.' });
        return;
    }

    if (estado.situacao === 'revogada') {
        recordAuthEvent('tokenRevokedRejected');
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
            recordAuthEvent('tokenRejected');
            res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            recordAuthEvent('forbiddenAccess');
            res.status(403).json({
                error: `Acesso negado. Requer papel: ${roles.join(' ou ')}.`,
            });
            return;
        }
        next();
    };
