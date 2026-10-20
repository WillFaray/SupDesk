// Integração real: Express + Postgres (supdesk_test). Fluxo de autenticação:
// login (bcrypt + JWT), logout com revogação e proteção das rotas.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import pool from '../../src/database.js';
import { resetMetrics } from '../../src/observability/metrics.js';
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
    resetMetrics();
    await limparTabelas();
    await criarUsuario({ username: 'maria.souza', email: EMAIL, password: SENHA });
});

afterAll(async () => {
    await pool.end();
});

describe('GET /ping e headers de segurança', () => {
    it('responde 200 com headers de segurança e sem expor X-Powered-By', async () => {
        const resposta = await agente.get('/ping');
        expect(resposta.status).toBe(200);
        expect(resposta.headers['x-powered-by']).toBeUndefined();
        expect(resposta.headers['x-content-type-options']).toBe('nosniff');
        expect(resposta.headers['x-frame-options']).toBe('DENY');
        expect(resposta.headers['referrer-policy']).toBe('no-referrer');
    });

    it('bloqueia origem não autorizada no CORS', async () => {
        const resposta = await agente
            .get('/ping')
            .set('Origin', 'https://origem-maliciosa.exemplo.com');
        expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('POST /auth/login', () => {
    it('retorna token e dados públicos do usuário (inclusive com email em maiúsculas)', async () => {
        const resposta = await agente
            .post('/auth/login')
            .send({ email: '  MARIA@EMPRESA.COM ', password: SENHA });

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

describe('Observabilidade (/health, /metrics e X-Request-Id)', () => {
    it('gera X-Request-Id automaticamente e preserva quando enviado pelo cliente', async () => {
        const gerado = await agente.get('/ping');
        expect(gerado.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);

        const propagado = await agente
            .get('/ping')
            .set('X-Request-Id', 'req-teste-observabilidade');
        expect(propagado.headers['x-request-id']).toBe('req-teste-observabilidade');
    });

    it('GET /health verifica conectividade com o banco e retorna métricas do pool', async () => {
        const resposta = await agente.get('/health');
        expect(resposta.status).toBe(200);
        expect(resposta.body).toMatchObject({
            status: 'ok',
            database: {
                status: 'up',
                pool: {
                    totalCount: expect.any(Number),
                    idleCount: expect.any(Number),
                    waitingCount: expect.any(Number),
                },
            },
        });
    });

    it('GET /metrics exige papel admin e expõe métricas por rota, erros e autenticação', async () => {
        const semToken = await agente.get('/metrics');
        expect(semToken.status).toBe(401);

        const tokenUsuario = await logar(app, EMAIL, SENHA);
        const proibido = await agente
            .get('/metrics')
            .set('Authorization', `Bearer ${tokenUsuario}`);
        expect(proibido.status).toBe(403);

        await criarUsuario({
            username: 'admin.obs',
            email: 'admin.obs@empresa.com',
            password: SENHA,
            role: 'admin',
        });
        const tokenAdmin = await logar(app, 'admin.obs@empresa.com', SENHA);

        const metricas = await agente.get('/metrics').set('Authorization', `Bearer ${tokenAdmin}`);
        expect(metricas.status).toBe(200);

        const corpo = metricas.body as {
            requests: { total: number };
            routes: Record<string, { count: number; avgDurationMs: number }>;
            errorsByType: { unauthorized: number; forbidden: number };
            auth: { loginSuccess: number; forbiddenAccess: number; tokenRejected: number };
        };

        expect(corpo.requests.total).toBeGreaterThanOrEqual(4);
        expect(corpo.routes['POST /auth/login']?.count).toBe(2);
        expect(corpo.errorsByType.unauthorized).toBeGreaterThanOrEqual(1);
        expect(corpo.errorsByType.forbidden).toBeGreaterThanOrEqual(1);
        expect(corpo.auth.loginSuccess).toBe(2);
        expect(corpo.auth.forbiddenAccess).toBe(1);
        expect(corpo.auth.tokenRejected).toBe(1);
    });
});
