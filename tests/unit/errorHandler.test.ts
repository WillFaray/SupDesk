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
        // A mensagem original fica só no log do servidor, nunca na resposta.
        expect(JSON.stringify(corpos)).not.toContain('boom');
        expect(next).not.toHaveBeenCalled();
        expect(spyConsole).toHaveBeenCalledOnce();
    });

    it('serializa AppError com statusCode e detalhes opcionais', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const erro = AppError.badRequest('Erro de validação', [
            { campo: 'title', erro: 'Título obrigatório' },
        ]);

        errorHandler(erro, reqPadrao(), res, next);

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'Erro de validação',
            detalhes: [{ campo: 'title', erro: 'Título obrigatório' }],
        });
    });

    it('converte ZodError em 400 com detalhes padronizados', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const schema = z.object({ email: z.string().email('Email inválido') });
        const parsed = schema.safeParse({ email: 'invalido' });
        if (parsed.success) throw new Error('Deveria falhar');

        errorHandler(parsed.error, reqPadrao(), res, next);

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'Erro de validação',
            detalhes: [{ campo: 'email', erro: 'Email inválido' }],
        });
    });

    it('converte SyntaxError de JSON malformado (express.json) em 400', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const syntaxErr = Object.assign(new SyntaxError('Unexpected end of JSON input'), {
            status: 400,
            type: 'entity.parse.failed',
        });

        errorHandler(syntaxErr, reqPadrao(), res, next);

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'JSON malformado no corpo da requisição.',
        });
    });

    it('mapeia violação de unicidade de email do PostgreSQL (23505) para 409', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const pgErr = Object.assign(
            new Error('duplicate key value violates unique constraint "users_email_key"'),
            {
                code: '23505',
                constraint: 'users_email_key',
                detail: 'Key (email)=(dup@empresa.com) already exists.',
            },
        );

        errorHandler(pgErr, reqPadrao(), res, next);

        expect(statuses).toEqual([409]);
        expect(corpos[0]).toEqual({
            error: 'Email já cadastrado.',
        });
    });

    it('mapeia erros de tipo/identificador do PostgreSQL (22P02 / 22003) para 400', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const pgErr = Object.assign(new Error('invalid input syntax for type integer: "abc"'), {
            code: '22P02',
        });

        errorHandler(pgErr, reqPadrao(), res, next);

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({
            error: 'Identificador inválido',
        });
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
