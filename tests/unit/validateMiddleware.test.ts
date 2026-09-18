import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middlewares/validateMiddleware.js';
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
