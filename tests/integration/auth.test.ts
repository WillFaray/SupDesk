// Integração real: Express + Postgres (supdesk_test). Fluxo de autenticação:
// login (bcrypt + JWT), logout com revogação e proteção das rotas.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import pool from '../../src/database.js';
import { criarUsuario, limparTabelas, logar } from '../helpers/db.js';

// Os limites de taxa (ex.: 3 registros/hora, 100 req/15 min) inviabilizariam a
// suíte; o comportamento deles pertence à biblioteca express-rate-limit.
vi.mock('../../src/middlewares/rateLimitMiddleware.js', () => ({
    apiLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    loginLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    registerLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

const app = createApp();
const agente = supertest(app);

const EMAIL = 'maria@empresa.com';
const SENHA = 'SenhaForte123';

beforeEach(async () => {
    await limparTabelas();
    await criarUsuario({ username: 'maria.souza', email: EMAIL, password: SENHA });
});

afterAll(async () => {
    await pool.end();
});

describe('GET /ping', () => {
    it('responde 200', async () => {
        const resposta = await agente.get('/ping');
        expect(resposta.status).toBe(200);
    });
});

describe('POST /auth/login', () => {
    it('retorna token e dados públicos do usuário', async () => {
        const resposta = await agente.post('/auth/login').send({ email: EMAIL, password: SENHA });

        expect(resposta.status).toBe(200);
        const corpo = resposta.body as {
            token: string;
            user: { id: number; username: string; email: string; role: string };
        };
        expect(corpo.token).toEqual(expect.any(String));
        expect(corpo.user).toMatchObject({
            username: 'maria.souza',
            email: EMAIL,
            role: 'usuario',
        });
        // O corpo inteiro nunca pode vazar o hash da senha.
        expect(JSON.stringify(corpo)).not.toContain('password_hash');
    });

    it('rejeita senha errada com 401', async () => {
        const resposta = await agente
            .post('/auth/login')
            .send({ email: EMAIL, password: 'SenhaErrada999' });
        expect(resposta.status).toBe(401);
        expect(resposta.body as { error: string }).toMatchObject({
            error: 'Email ou senha inválidos',
        });
    });

    it('rejeita e-mail inexistente com 401', async () => {
        const resposta = await agente
            .post('/auth/login')
            .send({ email: 'fantasma@empresa.com', password: SENHA });
        expect(resposta.status).toBe(401);
        expect(resposta.body as { error: string }).toMatchObject({
            error: 'Credenciais inválidas',
        });
    });

    it('valida o formato do e-mail antes de bater no banco (400 + detalhes)', async () => {
        const resposta = await agente
            .post('/auth/login')
            .send({ email: 'sem-arroba', password: 'x' });
        expect(resposta.status).toBe(400);
        const corpo = resposta.body as { error: string; detalhes: { campo: string }[] };
        expect(corpo.error).toBe('Erro de validação');
        expect(corpo.detalhes.map((d) => d.campo)).toContain('email');
    });
});

describe('POST /auth/logout', () => {
    it('revoga o token (próximas requisições com ele → 401)', async () => {
        const token = await logar(app, EMAIL, SENHA);

        const saida = await agente.post('/auth/logout').set('Authorization', `Bearer ${token}`);
        expect(saida.status).toBe(200);

        const depois = await agente.get('/usuarios/me').set('Authorization', `Bearer ${token}`);
        expect(depois.status).toBe(401);
        expect((depois.body as { error: string }).error).toContain('revogado');
    });

    it('exige token (401 sem Authorization)', async () => {
        const resposta = await agente.post('/auth/logout');
        expect(resposta.status).toBe(401);
    });
});
