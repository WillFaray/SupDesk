import { afterEach, describe, expect, it, vi } from 'vitest';
import type express from 'express';
import { z } from 'zod';
import { AppError } from '../../src/errors/AppError.js';
import { errorHandler } from '../../src/middlewares/erroHandler.js';
import { resFalsa } from '../helpers/resFalsa.js';

afterEach(() => {
    vi.restoreAllMocks();
});

const reqPadrao = () => ({ method: 'POST', url: '/chamados' }) as express.Request;

describe('errorHandler', () => {
    it('responde 500 com JSON padronizado ({ error }) sem vazar o erro interno', () => {
        const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();

        errorHandler(new Error('boom: detalhe interno'), reqPadrao(), res, next);

        expect(statuses).toEqual([500]);
        expect(corpos[0]).toEqual({
            error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
        });
        expect(JSON.stringify(corpos)).not.toContain('boom');
        expect(next).not.toHaveBeenCalled();
        expect(spyConsole).toHaveBeenCalledOnce();
    });

    it('serializa AppError e todas as suas fábricas estáticas (400, 401, 403, 404, 409)', () => {
        const casos: { erro: AppError; status: number; body: Record<string, unknown> }[] = [
            {
                erro: AppError.badRequest('Erro de validação', [
                    { campo: 'title', erro: 'Título obrigatório' },
                ]),
                status: 400,
                body: {
                    error: 'Erro de validação',
                    detalhes: [{ campo: 'title', erro: 'Título obrigatório' }],
                },
            },
            {
                erro: AppError.unauthorized('Sessão inválida'),
                status: 401,
                body: { error: 'Sessão inválida' },
            },
            {
                erro: AppError.forbidden('Sem permissão'),
                status: 403,
                body: { error: 'Sem permissão' },
            },
            {
                erro: AppError.notFound('Não achou'),
                status: 404,
                body: { error: 'Não achou' },
            },
            {
                erro: AppError.conflict('Conflito de dados'),
                status: 409,
                body: { error: 'Conflito de dados' },
            },
        ];

        for (const c of casos) {
            const { res, statuses, corpos } = resFalsa();
            errorHandler(c.erro, reqPadrao(), res, vi.fn());
            expect(statuses).toEqual([c.status]);
            expect(corpos[0]).toEqual(c.body);
        }
    });

    it('converte ZodError em 400 com detalhes padronizados', () => {
        const { res, statuses, corpos } = resFalsa();
        const schema = z.object({ email: z.string().email('Email inválido') });
        const parsed = schema.safeParse({ email: 'invalido' });
        if (parsed.success) throw new Error('Deveria falhar');

        errorHandler(parsed.error, reqPadrao(), res, vi.fn());

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'Erro de validação',
            detalhes: [{ campo: 'email', erro: 'Email inválido' }],
        });
    });

    it('converte SyntaxError de JSON malformado (express.json) em 400', () => {
        const { res, statuses, corpos } = resFalsa();
        const syntaxErr = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
            status: 400,
            type: 'entity.parse.failed',
        });

        errorHandler(syntaxErr, reqPadrao(), res, vi.fn());

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'JSON malformado no corpo da requisição.',
        });
    });

    it('converte erro de payload acima do limite (entity.too.large) em 413', () => {
        const { res, statuses, corpos } = resFalsa();
        const largeErr = Object.assign(new Error('request entity too large'), {
            status: 413,
            type: 'entity.too.large',
        });

        errorHandler(largeErr, reqPadrao(), res, vi.fn());

        expect(statuses).toEqual([413]);
        expect(corpos[0]).toEqual({
            error: 'Corpo da requisição excede o limite permitido.',
        });
    });

    it('mapeia códigos conhecidos do PostgreSQL (23505, 23503, 23502, 23514, 22P02, 22001, 22003) e erros genéricos de banco', () => {
        const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
        const casosPg: {
            code: string;
            constraint?: string;
            esperadoStatus: number;
            esperadoErro: string;
        }[] = [
            {
                code: '23505',
                constraint: 'users_email_key',
                esperadoStatus: 409,
                esperadoErro: 'Email já cadastrado.',
            },
            {
                code: '23505',
                constraint: 'revoked_tokens_token_hash_key',
                esperadoStatus: 409,
                esperadoErro: 'Registro duplicado.',
            },
            {
                code: '23503',
                esperadoStatus: 400,
                esperadoErro: 'Referência inválida para o recurso informado.',
            },
            {
                code: '23502',
                esperadoStatus: 400,
                esperadoErro: 'Campo obrigatório não informado.',
            },
            {
                code: '23514',
                esperadoStatus: 400,
                esperadoErro: 'Valor inválido para as regras do recurso.',
            },
            {
                code: '22P02',
                esperadoStatus: 400,
                esperadoErro: 'Identificador inválido',
            },
            {
                code: '22001',
                esperadoStatus: 400,
                esperadoErro: 'Valor excede o tamanho máximo permitido.',
            },
            {
                code: '22003',
                esperadoStatus: 400,
                esperadoErro: 'Identificador inválido',
            },
            {
                code: '08006',
                esperadoStatus: 500,
                esperadoErro:
                    'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
            },
        ];

        for (const item of casosPg) {
            const { res, statuses, corpos } = resFalsa();
            const pgErr = Object.assign(new Error('erro pg'), {
                code: item.code,
                constraint: item.constraint,
            });
            errorHandler(pgErr, reqPadrao(), res, vi.fn());
            expect(statuses).toEqual([item.esperadoStatus]);
            expect(corpos[0]).toEqual({ error: item.esperadoErro });
        }

        expect(spyConsole).toHaveBeenCalledOnce();
    });

    it('mascara senhas, Bearer tokens e JWTs nos logs de erro crítico', () => {
        const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { res } = resFalsa();
        const req = {
            method: 'POST',
            url: '/auth/login?token=segredo123&password=MinhaSenhaSecreta',
        } as express.Request;
        const erroComSegredo = new Error(
            'Falha ao validar Bearer tok_abc123 e password_hash=HashSecreto999 e eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.assinatura',
        );

        errorHandler(erroComSegredo, req, res, vi.fn());

        expect(spyConsole).toHaveBeenCalledOnce();
        const logCompleto = JSON.stringify(spyConsole.mock.calls[0]);
        expect(logCompleto).not.toContain('segredo123');
        expect(logCompleto).not.toContain('MinhaSenhaSecreta');
        expect(logCompleto).not.toContain('tok_abc123');
        expect(logCompleto).not.toContain('HashSecreto999');
        expect(logCompleto).not.toContain('eyJhbGciOiJIUzI1NiJ9');
        expect(logCompleto).toContain('[REDACTED]');
    });
});
