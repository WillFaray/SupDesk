// Suíte de regressão (P1.3): concorrência real no PostgreSQL, matriz completa de
// permissões/rebaixamento em tempo real, payloads maliciosos/inválidos em
// endpoints sensíveis e casos reais de erro (413 Payload Too Large, 503 Health).
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import pool from '../../src/database.js';
import { resetMetrics } from '../../src/observability/metrics.js';
import { revokeToken } from '../../src/tokenRevocation.js';
import {
    criarChamadoDireto,
    criarUsuario,
    limparTabelas,
    logar,
    SENHA_PADRAO,
    type UsuarioTeste,
} from '../helpers/db.js';

vi.mock('../../src/middlewares/rateLimitMiddleware.js', () => ({
    apiLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    loginLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    registerLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

const app = createApp();
const agente = supertest(app);
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let alice: UsuarioTeste;
let bob: UsuarioTeste;
let analista1: UsuarioTeste;
let analista2: UsuarioTeste;
let admin: UsuarioTeste;

let tokenAlice: string;
let tokenBob: string;
let tokenAnalista1: string;
let tokenAnalista2: string;
let tokenAdmin: string;

beforeEach(async () => {
    resetMetrics();
    await limparTabelas();

    alice = await criarUsuario({ username: 'alice.user', email: 'alice@empresa.com' });
    bob = await criarUsuario({ username: 'bob.user', email: 'bob@empresa.com' });
    analista1 = await criarUsuario({
        username: 'ana.ti',
        email: 'ana@empresa.com',
        role: 'analista',
    });
    analista2 = await criarUsuario({
        username: 'bruno.ti',
        email: 'bruno@empresa.com',
        role: 'analista',
    });
    admin = await criarUsuario({
        username: 'carlos.admin',
        email: 'carlos@empresa.com',
        role: 'admin',
    });

    tokenAlice = await logar(app, alice.email, SENHA_PADRAO);
    tokenBob = await logar(app, bob.email, SENHA_PADRAO);
    tokenAnalista1 = await logar(app, analista1.email, SENHA_PADRAO);
    tokenAnalista2 = await logar(app, analista2.email, SENHA_PADRAO);
    tokenAdmin = await logar(app, admin.email, SENHA_PADRAO);
});

afterEach(() => {
    vi.restoreAllMocks();
});

afterAll(async () => {
    await pool.end();
});

describe('1. Cenários de concorrência real no PostgreSQL', () => {
    it('cadastro concorrente com o mesmo e-mail: exatamente 1 cria (201) e os demais recebem 409 sem nenhum 500', async () => {
        const payload = {
            username: 'concorrente',
            email: 'disputa@empresa.com',
            password_hash: 'SenhaForte123',
        };

        const respostas = await Promise.all(
            Array.from({ length: 5 }, () => agente.post('/usuarios').send(payload)),
        );

        const statuses = respostas.map((r) => r.status).sort();
        expect(statuses).toEqual([201, 409, 409, 409, 409]);

        const conflitos = respostas.filter((r) => r.status === 409);
        for (const c of conflitos) {
            expect(c.body).toEqual({ error: 'Email já cadastrado.' });
        }

        const noBanco = await pool.query<{ count: string }>(
            'SELECT COUNT(*)::text AS count FROM users WHERE email = $1',
            ['disputa@empresa.com'],
        );
        expect(Number(noBanco.rows[0]?.count)).toBe(1);
    });

    it('revogação concorrente do mesmo token (logout duplo simultâneo) é idempotente e não gera 500', async () => {
        const expFuturo = Math.floor(Date.now() / 1000) + 3600;

        // Dispara 5 revogações simultâneas do mesmo token direto no banco
        await expect(
            Promise.all(Array.from({ length: 5 }, () => revokeToken(tokenAlice, expFuturo))),
        ).resolves.toBeDefined();

        // E ignora silenciosamente token já expirado
        await expect(revokeToken('token-expirado', 1000)).resolves.toBeUndefined();

        const tentativaUso = await agente.get('/usuarios/me').set(bearer(tokenAlice));
        expect(tentativaUso.status).toBe(401);
        expect((tentativaUso.body as { error: string }).error).toContain('revogado');
    });

    it('atualizações de status e comentários simultâneos no mesmo chamado mantêm consistência sem perda', async () => {
        const chamado = await criarChamadoDireto({
            user_id: alice.id,
            title: 'Servidor de arquivos lento',
        });

        const [patch1, patch2, ...comentariosRes] = await Promise.all([
            agente
                .patch(`/chamados/${chamado.id}`)
                .set(bearer(tokenAnalista1))
                .send({ status: 'Em andamento' }),
            agente
                .patch(`/chamados/${chamado.id}`)
                .set(bearer(tokenAnalista2))
                .send({ status: 'Resolvido' }),
            ...Array.from({ length: 6 }, (_, idx) =>
                agente
                    .post(`/chamados/${chamado.id}/comentarios`)
                    .set(bearer(idx % 2 === 0 ? tokenAlice : tokenAnalista1))
                    .send({ message: `Comentário concorrente #${idx + 1}` }),
            ),
        ]);

        expect(patch1.status).toBe(200);
        expect(patch2.status).toBe(200);
        for (const r of comentariosRes) {
            expect(r.status).toBe(201);
        }

        const listaComentarios = await agente
            .get(`/chamados/${chamado.id}/comentarios`)
            .set(bearer(tokenAdmin));
        expect(listaComentarios.status).toBe(200);
        expect(listaComentarios.body).toHaveLength(6);
    });
});

describe('2. Matriz completa de permissões e rebaixamento em tempo real', () => {
    it('garante isolamento completo e bloqueio 403/404 em todos os fluxos por papel', async () => {
        const chamadoAlice = await criarChamadoDireto({
            user_id: alice.id,
            title: 'Chamado exclusivo da Alice',
        });

        // 1. Usuário comum (Bob) não vê, não comenta, não altera status, não exclui e não acessa rotas admin
        expect(
            (await agente.get(`/chamados/${chamadoAlice.id}`).set(bearer(tokenBob))).status,
        ).toBe(404);
        expect(
            (await agente.get(`/chamados/${chamadoAlice.id}/comentarios`).set(bearer(tokenBob)))
                .status,
        ).toBe(404);
        expect(
            (
                await agente
                    .post(`/chamados/${chamadoAlice.id}/comentarios`)
                    .set(bearer(tokenBob))
                    .send({ message: 'Invasão' })
            ).status,
        ).toBe(404);
        expect(
            (
                await agente
                    .patch(`/chamados/${chamadoAlice.id}`)
                    .set(bearer(tokenBob))
                    .send({ status: 'Resolvido' })
            ).status,
        ).toBe(403);
        expect(
            (await agente.delete(`/chamados/${chamadoAlice.id}`).set(bearer(tokenBob))).status,
        ).toBe(403);
        expect((await agente.get('/usuarios').set(bearer(tokenBob))).status).toBe(403);
        expect((await agente.get('/metrics').set(bearer(tokenBob))).status).toBe(403);

        // 2. Analista vê e opera chamados de terceiros, mas é barrado em DELETE /chamados/:id, GET /usuarios e GET /metrics
        expect(
            (await agente.get(`/chamados/${chamadoAlice.id}`).set(bearer(tokenAnalista1))).status,
        ).toBe(200);
        expect(
            (
                await agente
                    .patch(`/chamados/${chamadoAlice.id}`)
                    .set(bearer(tokenAnalista1))
                    .send({ status: 'Em andamento' })
            ).status,
        ).toBe(200);
        expect(
            (await agente.delete(`/chamados/${chamadoAlice.id}`).set(bearer(tokenAnalista1)))
                .status,
        ).toBe(403);
        expect((await agente.get('/usuarios').set(bearer(tokenAnalista1))).status).toBe(403);
        expect((await agente.get('/metrics').set(bearer(tokenAnalista1))).status).toBe(403);
    });

    it('rebaixamento progressivo no banco (admin → analista → usuario) restringe permissões imediatamente no mesmo token', async () => {
        const chamadoAlice = await criarChamadoDireto({
            user_id: alice.id,
            title: 'Chamado para testar rebaixamento',
        });

        // Enquanto é admin: acessa /metrics
        expect((await agente.get('/metrics').set(bearer(tokenAdmin))).status).toBe(200);

        // Rebaixado para analista no banco (sem emitir novo JWT)
        await pool.query("UPDATE users SET role = 'analista' WHERE id = $1", [admin.id]);

        // Perde acesso a /metrics e DELETE imediatamente (403), mas ainda faz PATCH (200)
        expect((await agente.get('/metrics').set(bearer(tokenAdmin))).status).toBe(403);
        expect(
            (await agente.delete(`/chamados/${chamadoAlice.id}`).set(bearer(tokenAdmin))).status,
        ).toBe(403);
        expect(
            (
                await agente
                    .patch(`/chamados/${chamadoAlice.id}`)
                    .set(bearer(tokenAdmin))
                    .send({ status: 'Em andamento' })
            ).status,
        ).toBe(200);

        // Rebaixado para usuario comum no banco
        await pool.query("UPDATE users SET role = 'usuario' WHERE id = $1", [admin.id]);

        // Perde acesso a PATCH (403) e deixa de enxergar chamados de terceiros (404)
        expect(
            (
                await agente
                    .patch(`/chamados/${chamadoAlice.id}`)
                    .set(bearer(tokenAdmin))
                    .send({ status: 'Resolvido' })
            ).status,
        ).toBe(403);
        expect(
            (await agente.get(`/chamados/${chamadoAlice.id}`).set(bearer(tokenAdmin))).status,
        ).toBe(404);
    });
});

describe('3. Dados inválidos e payloads maliciosos em endpoints sensíveis', () => {
    it('rejeita tipos não-string (arrays, objetos, números) e bytes nulos nos endpoints de auth, usuários e chamados', async () => {
        const loginInvalido = await agente
            .post('/auth/login')
            .send({ email: ['array@empresa.com'], password: { obj: true } });
        expect(loginInvalido.status).toBe(400);

        const cadastroComNullByte = await agente.post('/usuarios').send({
            username: 'usuario.valido',
            email: 'valido@empresa.com',
            password_hash: 'SenhaCom\u0000NullByte',
        });
        expect(cadastroComNullByte.status).toBe(400);

        const cadastroSenhaGigante = await agente.post('/usuarios').send({
            username: 'usuario.valido',
            email: 'valido2@empresa.com',
            password_hash: 'A'.repeat(73),
        });
        expect(cadastroSenhaGigante.status).toBe(400);

        const chamadoSoEspacos = await agente.post('/chamados').set(bearer(tokenAlice)).send({
            title: '     ',
            description: '          ',
            priority: 'Alta',
            category: 'Rede',
        });
        expect(chamadoSoEspacos.status).toBe(400);
    });

    it('ignora tentativa de escalonamento de privilégio via PUT /usuarios e preserva papel usuario', async () => {
        const tentativa = await agente
            .put('/usuarios')
            .set(bearer(tokenAlice))
            .send({ username: 'alice.atualizada', role: 'admin', id: 999 });

        expect(tentativa.status).toBe(200);
        expect(tentativa.body).toMatchObject({
            user: {
                id: alice.id,
                username: 'alice.atualizada',
                role: 'usuario',
            },
        });

        const me = await agente.get('/usuarios/me').set(bearer(tokenAlice));
        expect((me.body as { role: string }).role).toBe('usuario');
    });

    it('neutraliza tentativa de SQL injection nos filtros de GET /chamados sem quebrar o banco', async () => {
        await criarChamadoDireto({ user_id: alice.id, title: 'Chamado Intacto' });

        const resposta = await agente
            .get(
                `/chamados?status=${encodeURIComponent("' OR '1'='1")}&category=${encodeURIComponent("Outros'; DROP TABLE tickets;--")}`,
            )
            .set(bearer(tokenAdmin));

        expect(resposta.status).toBe(200);
        expect((resposta.body as { tickets: unknown[] }).tickets).toEqual([]);

        // Confirma que a tabela tickets continua intacta
        const listagemNormal = await agente.get('/chamados').set(bearer(tokenAlice));
        expect(listagemNormal.status).toBe(200);
        expect((listagemNormal.body as { total: number }).total).toBe(1);
    });
});

describe('4. Casos reais de erro de infraestrutura e limites HTTP', () => {
    it('retorna 413 Payload Too Large quando o corpo JSON ultrapassa 16kb', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send({
                title: 'Payload gigante',
                description: 'X'.repeat(20_000),
                priority: 'Baixa',
                category: 'Outros',
            });

        expect(resposta.status).toBe(413);
        expect(resposta.body).toEqual({
            error: 'Corpo da requisição excede o limite permitido.',
        });
    });

    it('GET /health retorna 503 Service Unavailable quando o PostgreSQL falha', async () => {
        vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('conexão recusada'));

        const resposta = await agente.get('/health');

        expect(resposta.status).toBe(503);
        expect(resposta.body).toMatchObject({
            status: 'degraded',
            database: {
                status: 'down',
            },
        });
    });
});
