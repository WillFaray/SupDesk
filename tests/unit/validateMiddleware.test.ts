import { describe, expect, it, vi } from 'vitest';
import type express from 'express';
import { z } from 'zod';
import {
    parsePositiveIntId,
    validate,
    validateIdParam,
} from '../../src/middlewares/validateMiddleware.js';
import type { AuthRequest } from '../../src/middlewares/authMiddleware.js';
import { registerSchema } from '../../src/schemas/userSchema.js';
import type { RegisterDTO } from '../../src/schemas/userSchema.js';
import { resFalsa } from '../helpers/resFalsa.js';

describe('validate', () => {
    it('devolve 400 com detalhes por campo quando o body é inválido', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const schema = z.object({
            nome: z.string().min(5, 'Nome muito curto'),
            email: z.string().email('Email inválido'),
        });
        const req = { body: { nome: 'ab', email: 'x' } } as AuthRequest;

        validate(schema)(req, res, next);

        expect(statuses).toEqual([400]);
        const corpo = corpos[0] as { error: string; detalhes: { campo: string; erro: string }[] };
        expect(corpo.error).toBe('Erro de validação');
        expect(corpo.detalhes).toEqual(
            expect.arrayContaining([
                { campo: 'nome', erro: 'Nome muito curto' },
                { campo: 'email', erro: 'Email inválido' },
            ]),
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('substitui o body pelos dados parseados e chama next', () => {
        const { res, statuses } = resFalsa();
        const next = vi.fn();
        const req = {
            body: {
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'SenhaForte123',
            },
        } as AuthRequest<RegisterDTO>;

        validate(registerSchema)(req, res, next);

        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
        expect(req.body).toEqual({
            username: 'joao.silva',
            email: 'joao@empresa.com',
            password_hash: 'SenhaForte123',
        });
    });

    it('descarta chaves desconhecidas antes de chegarem ao controller', () => {
        const { res, statuses } = resFalsa();
        const next = vi.fn();
        const req = {
            body: {
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'SenhaForte123',
                role: 'admin', // tentativa de escalonamento de privilégio
            },
        } as AuthRequest<RegisterDTO>;

        validate(registerSchema)(req, res, next);

        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
        expect(req.body).not.toHaveProperty('role');
    });
});

describe('parsePositiveIntId e validateIdParam', () => {
    it('aceita inteiros positivos dentro do limite de INT4 do PostgreSQL', () => {
        expect(parsePositiveIntId('1')).toBe(1);
        expect(parsePositiveIntId('42')).toBe(42);
        expect(parsePositiveIntId('2147483647')).toBe(2147483647);
    });

    it('rejeita zero, negativos, decimais, alfanuméricos e overflow de INT4', () => {
        expect(parsePositiveIntId('')).toBeNull();
        expect(parsePositiveIntId('0')).toBeNull();
        expect(parsePositiveIntId('01')).toBeNull();
        expect(parsePositiveIntId('-5')).toBeNull();
        expect(parsePositiveIntId('1.5')).toBeNull();
        expect(parsePositiveIntId('abc')).toBeNull();
        expect(parsePositiveIntId('12abc')).toBeNull();
        expect(parsePositiveIntId('2147483648')).toBeNull();
        expect(parsePositiveIntId(undefined)).toBeNull();
    });

    it('validateIdParam responde 400 antes do controller quando :id é inválido', () => {
        const { res, statuses, corpos } = resFalsa();
        const next = vi.fn();
        const req = { params: { id: 'abc' } } as unknown as express.Request;

        validateIdParam(req, res, next);

        expect(statuses).toEqual([400]);
        expect(corpos[0]).toEqual({ error: 'Identificador inválido' });
        expect(next).not.toHaveBeenCalled();
    });

    it('validateIdParam chama next quando :id é válido', () => {
        const { res, statuses } = resFalsa();
        const next = vi.fn();
        const req = { params: { id: '15' } } as unknown as express.Request;

        validateIdParam(req, res, next);

        expect(statuses).toEqual([]);
        expect(next).toHaveBeenCalledOnce();
    });
});
