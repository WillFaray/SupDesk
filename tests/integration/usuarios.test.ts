// Integração real: rotas de usuário — cadastro público, anti-escalação de
// privilégio, perfil (me), listagem só-admin e autoatendimento (PUT).
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import pool from '../../src/database.js';
import { criarUsuario, limparTabelas, logar, SENHA_PADRAO } from '../helpers/db.js';

vi.mock('../../src/middlewares/rateLimitMiddleware.js', () => ({
    apiLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    loginLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
    registerLimiter: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

const app = createApp();
const agente = supertest(app);

const ADMIN = { username: 'ada.admin', email: 'admin@empresa.com', role: 'admin' as const };
const USUARIO = { username: 'hugo.user', email: 'hugo@empresa.com', role: 'usuario' as const };
const ANALISTA = {
    username: 'ana.analista',
    email: 'ana@empresa.com',
    role: 'analista' as const,
};

let tokenAdmin: string;
let tokenUsuario: string;
let tokenAnalista: string;

beforeEach(async () => {
    await limparTabelas();
    await criarUsuario(ADMIN);
    await criarUsuario(USUARIO);
    await criarUsuario(ANALISTA);
    tokenAdmin = await logar(app, ADMIN.email, SENHA_PADRAO);
    tokenUsuario = await logar(app, USUARIO.email, SENHA_PADRAO);
    tokenAnalista = await logar(app, ANALISTA.email, SENHA_PADRAO);
});

afterAll(async () => {
    await pool.end();
});

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('POST /usuarios (cadastro público)', () => {
    it('cria usuário comum, sem vazar o hash, e a senha informada funciona', async () => {
        const resposta = await agente.post('/usuarios').send({
            username: 'joao.lima',
            email: 'joao@empresa.com',
            password_hash: 'SenhaForte123',
        });

        expect(resposta.status).toBe(201);
        const corpo = resposta.body as { id: number; username: string; role: string };
        expect(corpo).toMatchObject({ username: 'joao.lima', role: 'usuario' });
        expect(JSON.stringify(corpo)).not.toContain('password_hash');

        // O hash foi feito no servidor: a senha em claro autentica.
        const token = await logar(app, 'joao@empresa.com', 'SenhaForte123');
        expect(token).toEqual(expect.any(String));
    });

    it('descarta tentativa de auto-promoção (role no body é ignorado)', async () => {
        const resposta = await agente.post('/usuarios').send({
            username: 'hackerman',
            email: 'hack@empresa.com',
            password_hash: 'SenhaForte123',
            role: 'admin',
        });

        expect(resposta.status).toBe(201);
        expect((resposta.body as { role: string }).role).toBe('usuario');
    });

    it('valida os campos e devolve a lista de erros (400)', async () => {
        const resposta = await agente.post('/usuarios').send({
            username: 'ab',
            email: 'invalido',
            password_hash: 'curta',
        });

        expect(resposta.status).toBe(400);
        const campos = (resposta.body as { detalhes: { campo: string }[] }).detalhes.map(
            (d) => d.campo,
        );
        expect(campos).toEqual(expect.arrayContaining(['username', 'email', 'password_hash']));
    });

    it('não permite e-mail duplicado (comportamento atual: 500 — o Swagger promete 409)', async () => {
        await agente.post('/usuarios').send({
            username: 'primeiro',
            email: 'dup@empresa.com',
            password_hash: 'SenhaForte123',
        });
        const resposta = await agente.post('/usuarios').send({
            username: 'segundo',
            email: 'dup@empresa.com',
            password_hash: 'SenhaForte123',
        });

        // Violação de UNIQUE cai no errorHandler genérico; dívida registrada.
        expect(resposta.status).toBe(500);
        expect((resposta.body as { status: string }).status).toBe('error');
    });
});

describe('GET /usuarios/me', () => {
    it('retorna os dados do próprio usuário autenticado', async () => {
        const resposta = await agente.get('/usuarios/me').set(bearer(tokenUsuario));

        expect(resposta.status).toBe(200);
        expect(resposta.body as { email: string; role: string }).toMatchObject({
            email: USUARIO.email,
            role: 'usuario',
        });
        expect(JSON.stringify(resposta.body)).not.toContain('password_hash');
    });

    it('exige token (401)', async () => {
        const resposta = await agente.get('/usuarios/me');
        expect(resposta.status).toBe(401);
    });

    it('rejeita token malformado (401)', async () => {
        const resposta = await agente.get('/usuarios/me').set(bearer('lixo.totalmente.invalido'));
        expect(resposta.status).toBe(401);
    });
});

describe('GET /usuarios (somente admin)', () => {
    it('admin lista os usuários sem hashes', async () => {
        const resposta = await agente.get('/usuarios').set(bearer(tokenAdmin));

        expect(resposta.status).toBe(200);
        const lista = resposta.body as { email: string }[];
        expect(lista).toHaveLength(3);
        expect(lista.map((u) => u.email)).toEqual(
            expect.arrayContaining([ADMIN.email, USUARIO.email, ANALISTA.email]),
        );
        expect(JSON.stringify(resposta.body)).not.toContain('password_hash');
    });

    it('usuário comum recebe 403 sem nenhum dado de usuário vazar', async () => {
        const resposta = await agente.get('/usuarios').set(bearer(tokenUsuario));

        expect(resposta.status).toBe(403);
        expect((resposta.body as { error: string }).error).toContain('Requer papel: admin');

        // O corpo do 403 não pode conter e-mails nem hashes alheios.
        const corpo = JSON.stringify(resposta.body);
        expect(corpo).not.toContain(ADMIN.email);
        expect(corpo).not.toContain(USUARIO.email);
        expect(corpo).not.toContain('password_hash');
    });

    it('analista também recebe 403', async () => {
        const resposta = await agente.get('/usuarios').set(bearer(tokenAnalista));
        expect(resposta.status).toBe(403);
        expect((resposta.body as { error: string }).error).toContain('Requer papel: admin');
    });

    it('exige token (401)', async () => {
        const resposta = await agente.get('/usuarios');
        expect(resposta.status).toBe(401);
    });

    it('rejeita token inválido (401)', async () => {
        const resposta = await agente.get('/usuarios').set(bearer('nao.e.um.jwt'));
        expect(resposta.status).toBe(401);
    });

    it('rejeita token revogado no logout, mesmo de admin (401)', async () => {
        const saida = await agente.post('/auth/logout').set(bearer(tokenAdmin));
        expect(saida.status).toBe(200);

        const resposta = await agente.get('/usuarios').set(bearer(tokenAdmin));
        expect(resposta.status).toBe(401);
    });

    it('admin rebaixado no banco perde o acesso na hora, com o token que já tinha (403)', async () => {
        // O token foi emitido com role 'admin' e ainda está dentro da validade:
        // como a autorização consulta o banco, o 403 é imediato (não espera 8h).
        await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['usuario', ADMIN.email]);

        const resposta = await agente.get('/usuarios').set(bearer(tokenAdmin));

        expect(resposta.status).toBe(403);
    });

    it('promoção a admin no banco vale na hora para o token existente (200)', async () => {
        await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', USUARIO.email]);

        const resposta = await agente.get('/usuarios').set(bearer(tokenUsuario));

        expect(resposta.status).toBe(200);
    });

    it('conta removida do banco tem o token invalidado (401)', async () => {
        await pool.query('DELETE FROM users WHERE email = $1', [ADMIN.email]);

        const resposta = await agente.get('/usuarios').set(bearer(tokenAdmin));

        expect(resposta.status).toBe(401);
        expect((resposta.body as { error: string }).error).toContain('não encontrado');
    });
});

describe('PUT /usuarios (autoatendimento)', () => {
    it('atualiza username e email do próprio usuário', async () => {
        const resposta = await agente
            .put('/usuarios')
            .set(bearer(tokenUsuario))
            .send({ username: 'hugo.novo', email: 'hugo.novo@empresa.com' });

        expect(resposta.status).toBe(200);
        expect((resposta.body as { user: { username: string } }).user).toMatchObject({
            username: 'hugo.novo',
        });

        const me = await agente.get('/usuarios/me').set(bearer(tokenUsuario));
        expect(me.body as { username: string; email: string }).toMatchObject({
            username: 'hugo.novo',
            email: 'hugo.novo@empresa.com',
        });
    });

    it('re-hasheia a senha: a antiga deixa de funcionar e a nova passa', async () => {
        const resposta = await agente
            .put('/usuarios')
            .set(bearer(tokenUsuario))
            .send({ password_hash: 'SenhaNovissima123' });
        expect(resposta.status).toBe(200);

        const antiga = await agente
            .post('/auth/login')
            .send({ email: USUARIO.email, password: SENHA_PADRAO });
        expect(antiga.status).toBe(401);

        const nova = await agente
            .post('/auth/login')
            .send({ email: USUARIO.email, password: 'SenhaNovissima123' });
        expect(nova.status).toBe(200);
    });

    it('rejeita body vazio (400)', async () => {
        const resposta = await agente.put('/usuarios').set(bearer(tokenUsuario)).send({});
        expect(resposta.status).toBe(400);
    });

    it('exige token (401)', async () => {
        const resposta = await agente.put('/usuarios').send({ username: 'anonimo' });
        expect(resposta.status).toBe(401);
    });
});
