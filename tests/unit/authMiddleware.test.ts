import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
    requireRole,
    verifyToken,
    type AuthRequest,
} from '../../src/middlewares/authMiddleware.js';
import { consultarSessao } from '../../src/authSession.js';
import type { JwtClaims } from '../../src/types/db.js';
import { resFalsa } from '../helpers/resFalsa.js';

// O estado da sessão (usuário existe? token revogado? papel atual?) depende do
// banco: aqui ele é simulado.
vi.mock('../../src/authSession.js', () => ({
    consultarSessao: vi.fn(),
}));

const sessao = vi.mocked(consultarSessao);

const segredo = (): string => {
    const valor = process.env.JWT_SECRET;
    if (!valor) throw new Error('JWT_SECRET deveria estar definido pelo setup de testes');
    return valor;
};

const assinar = (payload: Record<string, unknown>, opcoes?: jwt.SignOptions): string =>
    jwt.sign(payload, segredo(), opcoes);

const reqComToken = (token?: string): AuthRequest => {
    const req = {
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
    };
    return req as unknown as AuthRequest;
};

const sucesso = () => {
    const { res, statuses, corpos } = resFalsa();
    return { res, statuses, corpos, next: vi.fn() };
};

beforeEach(() => {
    sessao.mockReset();
    sessao.mockResolvedValue({ situacao: 'ok', role: 'usuario' });
});

describe('verifyToken', () => {
    it('rejeita requisição sem header Authorization', async () => {
        const { res, statuses, corpos, next } = sucesso();
        await verifyToken(reqComToken(), res, next);
        expect(statuses).toEqual([401]);
        expect((corpos[0] as { error: string }).error).toContain('Token não fornecido');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejeita header sem o prefixo Bearer', async () => {
        const { res, statuses, corpos, next } = sucesso();
        const req = {
            headers: { authorization: 'Basic abc' },
        } as unknown as AuthRequest;
        await verifyToken(req, res, next);
        expect(statuses).toEqual([401]);
        expect((corpos[0] as { error: string }).error).toContain('Formato de token inválido');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejeita token impossível de verificar', async () => {
        const { res, statuses, corpos, next } = sucesso();
        await verifyToken(reqComToken('isto.nao.e.um.jwt'), res, next);
        expect(statuses).toEqual([401]);
        expect((corpos[0] as { error: string }).error).toBe('Token inválido.');
        expect(next).not.toHaveBeenCalled();
    });

    it('aceita token válido e injeta as claims em req.user', async () => {
        const { res, statuses, next } = sucesso();
        sessao.mockResolvedValue({ situacao: 'ok', role: 'analista' });
        const token = assinar({ id: 7, role: 'analista' }, { expiresIn: '1h' });
        const req = reqComToken(token);

        await verifyToken(req, res, next);

        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ id: 7, role: 'analista' });
        expect(typeof req.user?.iat).toBe('number');
        expect(typeof req.user?.exp).toBe('number');
        expect(sessao).toHaveBeenCalledWith(7, token);
    });

    it('usa o papel ATUAL do banco, ignorando o congelado no token', async () => {
        // Token emitido quando a conta era admin; o banco diz que virou usuario.
        const { res, statuses, next } = sucesso();
        sessao.mockResolvedValue({ situacao: 'ok', role: 'usuario' });
        const token = assinar({ id: 7, role: 'admin' }, { expiresIn: '1h' });
        const req = reqComToken(token);

        await verifyToken(req, res, next);

        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user?.role).toBe('usuario');
    });

    it('propaga a promoção feita no banco sem exigir novo login', async () => {
        const { res, statuses, next } = sucesso();
        sessao.mockResolvedValue({ situacao: 'ok', role: 'admin' });
        const token = assinar({ id: 7, role: 'usuario' }, { expiresIn: '1h' });
        const req = reqComToken(token);

        await verifyToken(req, res, next);

        expect(statuses).toEqual([]);
        expect(req.user?.role).toBe('admin');
    });

    it('rejeita token com papel desconhecido sem consultar o banco', async () => {
        const { res, statuses, next } = sucesso();
        const token = assinar({ id: 7, role: 'superadmin' }, { expiresIn: '1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([401]);
        expect(next).not.toHaveBeenCalled();
        expect(sessao).not.toHaveBeenCalled();
    });

    it('rejeita token com id não numérico sem consultar o banco', async () => {
        const { res, statuses, next } = sucesso();
        const token = assinar({ id: '7', role: 'admin' }, { expiresIn: '1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([401]);
        expect(next).not.toHaveBeenCalled();
        expect(sessao).not.toHaveBeenCalled();
    });

    it('rejeita token expirado', async () => {
        const { res, statuses, next } = sucesso();
        const token = assinar({ id: 7, role: 'admin' }, { expiresIn: '-1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([401]);
        expect(next).not.toHaveBeenCalled();
        expect(sessao).not.toHaveBeenCalled();
    });

    it('rejeita token revogado (logout)', async () => {
        const { res, statuses, corpos, next } = sucesso();
        sessao.mockResolvedValue({ situacao: 'revogada' });
        const token = assinar({ id: 7, role: 'admin' }, { expiresIn: '1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([401]);
        expect((corpos[0] as { error: string }).error).toContain('revogado');
        expect(next).not.toHaveBeenCalled();
    });

    it('rejeita token de conta removida do banco', async () => {
        const { res, statuses, corpos, next } = sucesso();
        sessao.mockResolvedValue({ situacao: 'inexistente' });
        const token = assinar({ id: 7, role: 'admin' }, { expiresIn: '1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([401]);
        expect((corpos[0] as { error: string }).error).toContain('não encontrado');
        expect(next).not.toHaveBeenCalled();
    });

    it('falha do banco ao consultar a sessão vai para o errorHandler', async () => {
        const { res, statuses, next } = sucesso();
        sessao.mockRejectedValue(new Error('banco fora do ar'));
        const token = assinar({ id: 7, role: 'admin' }, { expiresIn: '1h' });
        await verifyToken(reqComToken(token), res, next);
        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('requireRole', () => {
    const reqComUsuario = (role: JwtClaims['role'] | undefined): AuthRequest =>
        ({
            user: role === undefined ? undefined : { id: 1, role, iat: 0, exp: 9999999999 },
        }) as unknown as AuthRequest;

    it('exige usuário autenticado (401 sem req.user)', () => {
        const { res, statuses, next } = sucesso();
        requireRole('admin')(reqComUsuario(undefined), res, next);
        expect(statuses).toEqual([401]);
        expect(next).not.toHaveBeenCalled();
    });

    it('devolve 403 quando o papel não está na lista', () => {
        const { res, statuses, corpos, next } = sucesso();
        requireRole('admin', 'analista')(reqComUsuario('usuario'), res, next);
        expect(statuses).toEqual([403]);
        expect((corpos[0] as { error: string }).error).toContain('Requer papel: admin ou analista');
        expect(next).not.toHaveBeenCalled();
    });

    it('libera a passagem quando o papel é permitido', () => {
        const { res, statuses, next } = sucesso();
        requireRole('admin', 'analista')(reqComUsuario('analista'), res, next);
        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
    });
});
