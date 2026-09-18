// Integração real: ciclo de vida dos chamados — criação, listagem com escopo
// por papel, filtros, paginação, detalhe, mudança de status, exclusão e
// comentários. Usuários/chamados são reais no banco supdesk_test.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import pool from '../../src/database.js';
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

const CHAMADO_VALIDO = {
    title: 'Impressora travada',
    description: 'A impressora do 3º andar não responde desde ontem.',
    priority: 'Média',
    category: 'Hardware',
};

let alice: UsuarioTeste; // usuário comum
let bob: UsuarioTeste; // usuário comum (para testar isolamento)
let ana: UsuarioTeste; // analista
let adm: UsuarioTeste; // admin
let tokenAlice: string;
let tokenBob: string;
let tokenAna: string;
let tokenAdm: string;

beforeEach(async () => {
    await limparTabelas();
    alice = await criarUsuario({ username: 'alice.user', email: 'alice@empresa.com' });
    bob = await criarUsuario({ username: 'bob.user', email: 'bob@empresa.com' });
    ana = await criarUsuario({
        username: 'ana.analista',
        email: 'ana@empresa.com',
        role: 'analista',
    });
    adm = await criarUsuario({ username: 'ada.admin', email: 'adm@empresa.com', role: 'admin' });
    tokenAlice = await logar(app, alice.email, SENHA_PADRAO);
    tokenBob = await logar(app, bob.email, SENHA_PADRAO);
    tokenAna = await logar(app, ana.email, SENHA_PADRAO);
    tokenAdm = await logar(app, adm.email, SENHA_PADRAO);
});

afterAll(async () => {
    await pool.end();
});

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('POST /chamados', () => {
    it('cria o chamado para o usuário autenticado, com status inicial Aberto', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send(CHAMADO_VALIDO);

        expect(resposta.status).toBe(201);
        const corpo = resposta.body as { user_id: number; status: string; title: string };
        expect(corpo).toMatchObject({
            title: CHAMADO_VALIDO.title,
            status: 'Aberto',
            priority: 'Média',
            category: 'Hardware',
        });
        expect(corpo.user_id).toBe(alice.id);
    });

    it('exige token (401)', async () => {
        const resposta = await agente.post('/chamados').send(CHAMADO_VALIDO);
        expect(resposta.status).toBe(401);
    });

    it('rejeita token inválido (401)', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer('token.falso.123'))
            .send(CHAMADO_VALIDO);
        expect(resposta.status).toBe(401);
    });

    it('valida título curto (400 + detalhes)', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send({ ...CHAMADO_VALIDO, title: 'ab' });
        expect(resposta.status).toBe(400);
        const campos = (resposta.body as { detalhes: { campo: string }[] }).detalhes.map(
            (d) => d.campo,
        );
        expect(campos).toContain('title');
    });

    it('valida descrição curta (400)', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send({ ...CHAMADO_VALIDO, description: 'curta' });
        expect(resposta.status).toBe(400);
    });

    it('valida prioridade fora do domínio (400)', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send({ ...CHAMADO_VALIDO, priority: 'Urgente' });
        expect(resposta.status).toBe(400);
    });

    it('valida categoria fora do domínio (400)', async () => {
        const resposta = await agente
            .post('/chamados')
            .set(bearer(tokenAlice))
            .send({ ...CHAMADO_VALIDO, category: 'Impressora' });
        expect(resposta.status).toBe(400);
    });
});

describe('GET /chamados (listagem e escopo por papel)', () => {
    it('usuário comum vê apenas os próprios chamados, do mais recente', async () => {
        await criarChamadoDireto({ user_id: alice.id, title: 'A-antigo', criadoHaMinutos: 60 });
        await criarChamadoDireto({ user_id: alice.id, title: 'A-recente', criadoHaMinutos: 5 });
        await criarChamadoDireto({ user_id: bob.id, title: 'B-do-bob' });

        const resposta = await agente.get('/chamados').set(bearer(tokenAlice));
        expect(resposta.status).toBe(200);

        const corpo = resposta.body as {
            total: number;
            tickets: { title: string; autor_do_chamado: string }[];
        };
        expect(corpo.total).toBe(2);
        expect(corpo.tickets.map((t) => t.title)).toEqual(['A-recente', 'A-antigo']);
        expect(corpo.tickets[0]).toMatchObject({ autor_do_chamado: 'alice.user' });
    });

    it('admin e analista veem chamados de todos os usuários', async () => {
        await criarChamadoDireto({ user_id: alice.id, title: 'A1' });
        await criarChamadoDireto({ user_id: bob.id, title: 'B1' });

        for (const token of [tokenAdm, tokenAna]) {
            const resposta = await agente.get('/chamados').set(bearer(token));
            const corpo = resposta.body as { total: number };
            expect(corpo.total).toBe(2);
        }
    });

    it('filtra por status, prioridade, categoria — inclusive combinados', async () => {
        await criarChamadoDireto({
            user_id: alice.id,
            title: 'R-Aberto-Alta-Rede',
            status: 'Aberto',
            priority: 'Alta',
            category: 'Rede',
        });
        await criarChamadoDireto({
            user_id: alice.id,
            title: 'R-Resolvido-Baixa-Software',
            status: 'Resolvido',
            priority: 'Baixa',
            category: 'Software',
        });
        await criarChamadoDireto({
            user_id: alice.id,
            title: 'R-Aberto-Media-Hardware',
            status: 'Aberto',
            priority: 'Média',
            category: 'Hardware',
        });

        const titulosDe = async (query: string): Promise<string[]> => {
            const resposta = await agente.get(`/chamados${query}`).set(bearer(tokenAdm));
            return (resposta.body as { tickets: { title: string }[] }).tickets.map((t) => t.title);
        };

        expect(await titulosDe('?status=Aberto')).toEqual(
            expect.arrayContaining(['R-Aberto-Alta-Rede', 'R-Aberto-Media-Hardware']),
        );
        expect(await titulosDe('?priority=Alta')).toEqual(['R-Aberto-Alta-Rede']);
        expect(await titulosDe('?category=Software')).toEqual(['R-Resolvido-Baixa-Software']);
        expect(await titulosDe('?status=Aberto&priority=Média')).toEqual([
            'R-Aberto-Media-Hardware',
        ]);
    });
});

describe('GET /chamados (paginação)', () => {
    beforeEach(async () => {
        // Criados do mais antigo para o mais novo (T1 … T5).
        for (let i = 1; i <= 5; i++) {
            await criarChamadoDireto({
                user_id: alice.id,
                title: `T${i}`,
                criadoHaMinutos: (6 - i) * 10,
            });
        }
    });

    const titulosDaPagina = async (query: string): Promise<string[]> => {
        const resposta = await agente.get(`/chamados${query}`).set(bearer(tokenAlice));
        expect(resposta.status).toBe(200);
        return (resposta.body as { tickets: { title: string }[] }).tickets.map((t) => t.title);
    };

    it('divide em páginas ordenadas do mais recente para o mais antigo', async () => {
        expect(await titulosDaPagina('?limit=2&page=1')).toEqual(['T5', 'T4']);
        expect(await titulosDaPagina('?limit=2&page=2')).toEqual(['T3', 'T2']);
        expect(await titulosDaPagina('?limit=2&page=3')).toEqual(['T1']);
    });

    it('página fora do alcance devolve lista vazia', async () => {
        expect(await titulosDaPagina('?limit=2&page=9')).toEqual([]);
    });

    it('limites não numéricos caem no padrão (10)', async () => {
        const resposta = await agente.get('/chamados?limit=abc&page=zzz').set(bearer(tokenAlice));
        const corpo = resposta.body as { paginaAtual: number; limite: number; total: number };
        expect(corpo).toMatchObject({ paginaAtual: 1, limite: 10, total: 5 });
    });
});

describe('GET /chamados/:id (detalhe)', () => {
    it('o dono obtém o chamado com autor e responsável', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Detalhe-A' });

        const resposta = await agente.get(`/chamados/${criado.id}`).set(bearer(tokenAlice));

        expect(resposta.status).toBe(200);
        expect(resposta.body as { title: string; autor_do_chamado: string }).toMatchObject({
            title: 'Detalhe-A',
            autor_do_chamado: 'alice.user',
            responsavel: null,
        });
    });

    it('outro usuário comum recebe 404 (isolamento entre contas)', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Secreto' });
        const resposta = await agente.get(`/chamados/${criado.id}`).set(bearer(tokenBob));
        expect(resposta.status).toBe(404);
    });

    it('analista enxerga chamado de qualquer usuário', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Visivel-Analista' });
        const resposta = await agente.get(`/chamados/${criado.id}`).set(bearer(tokenAna));
        expect(resposta.status).toBe(200);
    });

    it('404 para id inexistente', async () => {
        const resposta = await agente.get('/chamados/99999').set(bearer(tokenAlice));
        expect(resposta.status).toBe(404);
    });

    it('id não numérico vira 500 (comportamento atual: o SQL rejeita texto)', async () => {
        // Dívida conhecida: '/chamados/abc' poderia responder 400/404.
        const resposta = await agente.get('/chamados/abc').set(bearer(tokenAlice));
        expect(resposta.status).toBe(500);
    });
});

describe('PATCH /chamados/:id (status)', () => {
    it('analista atualiza o status e assume o chamado', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Assumir' });

        const resposta = await agente
            .patch(`/chamados/${criado.id}`)
            .set(bearer(tokenAna))
            .send({ status: 'Em andamento' });

        expect(resposta.status).toBe(200);
        expect(resposta.body as { status: string; responsavel_id: number }).toMatchObject({
            status: 'Em andamento',
            responsavel_id: ana.id,
        });
    });

    it('admin também pode atualizar', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Admin-Patch' });
        const resposta = await agente
            .patch(`/chamados/${criado.id}`)
            .set(bearer(tokenAdm))
            .send({ status: 'Resolvido' });
        expect(resposta.status).toBe(200);
        expect((resposta.body as { status: string }).status).toBe('Resolvido');
    });

    it('usuário comum recebe 403', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Proibido' });
        const resposta = await agente
            .patch(`/chamados/${criado.id}`)
            .set(bearer(tokenAlice))
            .send({ status: 'Resolvido' });
        expect(resposta.status).toBe(403);
    });

    it('400 para status fora do fluxo', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Status-X' });
        const resposta = await agente
            .patch(`/chamados/${criado.id}`)
            .set(bearer(tokenAna))
            .send({ status: 'Fechado' });
        expect(resposta.status).toBe(400);
    });

    it('404 para chamado inexistente', async () => {
        const resposta = await agente
            .patch('/chamados/99999')
            .set(bearer(tokenAna))
            .send({ status: 'Resolvido' });
        expect(resposta.status).toBe(404);
    });
});

describe('DELETE /chamados/:id', () => {
    it('admin exclui e o chamado some da listagem', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Excluir' });

        const resposta = await agente.delete(`/chamados/${criado.id}`).set(bearer(tokenAdm));
        expect(resposta.status).toBe(200);

        const depois = await agente.get(`/chamados/${criado.id}`).set(bearer(tokenAlice));
        expect(depois.status).toBe(404);
    });

    it('analista também pode excluir', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Excluir-Ana' });
        const resposta = await agente.delete(`/chamados/${criado.id}`).set(bearer(tokenAna));
        expect(resposta.status).toBe(200);
    });

    it('usuário comum recebe 403', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Nao-Apague' });
        const resposta = await agente.delete(`/chamados/${criado.id}`).set(bearer(tokenAlice));
        expect(resposta.status).toBe(403);
    });

    it('404 para chamado inexistente', async () => {
        const resposta = await agente.delete('/chamados/99999').set(bearer(tokenAdm));
        expect(resposta.status).toBe(404);
    });
});

describe('comentários (/chamados/:id/comentarios)', () => {
    it('usuário adiciona comentário no próprio chamado', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Com-Fala' });

        const resposta = await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice))
            .send({ message: 'Reiniciei e o problema persiste.' });

        expect(resposta.status).toBe(201);
        const corpo = resposta.body as {
            status: string;
            comment: { message: string; user_id: number };
        };
        expect(corpo.status).toBe('success');
        expect(corpo.comment).toMatchObject({
            message: 'Reiniciei e o problema persiste.',
            user_id: alice.id,
        });
    });

    it('comentário é aceito mesmo em chamado de outro usuário (comportamento atual)', async () => {
        // Hoje qualquer usuário autenticado comenta em qualquer chamado
        // existente — o teste registra o comportamento para discussão futura.
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'De-Outro' });
        const resposta = await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenBob))
            .send({ message: 'Posso ajudar?' });
        expect(resposta.status).toBe(201);
    });

    it('400 para mensagem vazia ou acima de 500 caracteres', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Valida-Coment' });
        const vazio = await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice))
            .send({ message: '' });
        expect(vazio.status).toBe(400);

        const longo = await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice))
            .send({ message: 'a'.repeat(501) });
        expect(longo.status).toBe(400);
    });

    it('404 para chamado inexistente', async () => {
        const resposta = await agente
            .post('/chamados/99999/comentarios')
            .set(bearer(tokenAlice))
            .send({ message: 'Alguém aí?' });
        expect(resposta.status).toBe(404);
    });

    it('exige token (401)', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Sem-Token' });
        const resposta = await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .send({ message: 'anônimo' });
        expect(resposta.status).toBe(401);
    });

    it('lista os comentários em ordem cronológica, com autor e papel', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Thread' });

        await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice))
            .send({ message: 'Primeiro comentário' });
        // Distancia o primeiro comentário no tempo (created_at tem precisão de
        // segundos; sem isso a ordenação ASC entre dois inserts rápidos empata).
        await pool.query("UPDATE ticket_comments SET created_at = created_at - interval '1 hour'");
        await agente
            .post(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAna))
            .send({ message: 'Resposta do suporte' });

        const resposta = await agente
            .get(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice));

        expect(resposta.status).toBe(200);
        const lista = resposta.body as {
            message: string;
            autor_do_comentario: string;
            perfil_do_autor: string;
        }[];
        expect(lista.map((c) => c.message)).toEqual(['Primeiro comentário', 'Resposta do suporte']);
        expect(lista[0]).toMatchObject({
            autor_do_comentario: 'alice.user',
            perfil_do_autor: 'usuario',
        });
        expect(lista[1]).toMatchObject({
            autor_do_comentario: 'ana.analista',
            perfil_do_autor: 'analista',
        });
    });

    it('devolve lista vazia para chamado sem comentários', async () => {
        const criado = await criarChamadoDireto({ user_id: alice.id, title: 'Sem-Coment' });
        const resposta = await agente
            .get(`/chamados/${criado.id}/comentarios`)
            .set(bearer(tokenAlice));
        expect(resposta.status).toBe(200);
        expect(resposta.body).toEqual([]);
    });
});
