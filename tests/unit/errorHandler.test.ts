import { afterEach, describe, expect, it, vi } from 'vitest';
import type express from 'express';
import { errorHandler } from '../../src/middlewares/erroHandler.js';
import { resFalsa } from '../helpers/resFalsa.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('errorHandler', () => {
    it('responde 500 com mensagem genérica (sem vazar o erro interno)', () => {
        const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { res, statuses, corpos } = resFalsa();
        const req = { method: 'GET', url: '/chamados' } as express.Request;
        const next = vi.fn();

        errorHandler(new Error('boom: detalhe interno'), req, res, next);

        expect(statuses).toEqual([500]);
        expect(corpos[0]).toMatchObject({
            status: 'error',
            message: 'Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.',
        });
        // A mensagem original fica só no log do servidor, nunca na resposta.
        expect(JSON.stringify(corpos)).not.toContain('boom');
        expect(next).not.toHaveBeenCalled();
        expect(spyConsole).toHaveBeenCalledOnce();
    });
});
