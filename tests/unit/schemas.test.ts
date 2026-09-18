// Testes unitários dos schemas Zod — primeira linha de defesa da API:
// contrato do body, mensagens e descarte de chaves desconhecidas.
import { describe, expect, it } from 'vitest';
import {
    createCommentSchema,
    createTicketSchema,
    updateTicketStatusSchema,
} from '../../src/schemas/ticketSchema.js';
import { loginSchema, registerSchema, updateUserSchema } from '../../src/schemas/userSchema.js';

describe('registerSchema', () => {
    it('aceita um cadastro válido', () => {
        const parsed = registerSchema.safeParse({
            username: 'joao.silva',
            email: 'joao@empresa.com',
            password_hash: 'SenhaForte123',
        });
        expect(parsed.success).toBe(true);
    });

    it('exige username com pelo menos 3 caracteres', () => {
        const parsed = registerSchema.safeParse({
            username: 'ab',
            email: 'joao@empresa.com',
            password_hash: 'SenhaForte123',
        });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.issues[0]?.message).toContain('mínimo 3');
        }
    });

    it('exige e-mail com formato válido', () => {
        const parsed = registerSchema.safeParse({
            username: 'joao.silva',
            email: 'joao#empresa.com',
            password_hash: 'SenhaForte123',
        });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.issues[0]?.message).toBe('Email inválido');
        }
    });

    it('exige senha com pelo menos 8 caracteres', () => {
        const parsed = registerSchema.safeParse({
            username: 'joao.silva',
            email: 'joao@empresa.com',
            password_hash: 'curta',
        });
        expect(parsed.success).toBe(false);
    });

    it('descarta chaves desconhecidas (tentativa de elevar papel no cadastro)', () => {
        const parsed = registerSchema.parse({
            username: 'joao.silva',
            email: 'joao@empresa.com',
            password_hash: 'SenhaForte123',
            role: 'admin',
        });
        expect(parsed).not.toHaveProperty('role');
    });
});

describe('loginSchema', () => {
    it('aceita credenciais bem formadas', () => {
        const parsed = loginSchema.safeParse({ email: 'joao@empresa.com', password: 'x' });
        expect(parsed.success).toBe(true);
    });

    it('rejeita e-mail inválido', () => {
        expect(loginSchema.safeParse({ email: 'sem-arroba', password: 'x' }).success).toBe(false);
    });

    it('exige senha não vazia', () => {
        expect(loginSchema.safeParse({ email: 'joao@empresa.com', password: '' }).success).toBe(
            false,
        );
    });
});

describe('updateUserSchema', () => {
    it('aceita qualquer campo isolado', () => {
        expect(updateUserSchema.safeParse({ username: 'novo.nome' }).success).toBe(true);
        expect(updateUserSchema.safeParse({ password_hash: 'SenhaForte123' }).success).toBe(true);
    });

    it('rejeita objeto vazio (nada a atualizar)', () => {
        expect(updateUserSchema.safeParse({}).success).toBe(false);
    });

    it('rejeita senha abaixo do mínimo', () => {
        expect(updateUserSchema.safeParse({ password_hash: 'curta' }).success).toBe(false);
    });
});

describe('createTicketSchema', () => {
    const valido = {
        title: 'Impressora travada',
        description: 'A impressora do 3º andar não responde desde ontem.',
        priority: 'Média',
        category: 'Hardware',
    };

    it('aceita um chamado válido', () => {
        expect(createTicketSchema.safeParse(valido).success).toBe(true);
    });

    it('exige título entre 3 e 100 caracteres', () => {
        expect(createTicketSchema.safeParse({ ...valido, title: 'ab' }).success).toBe(false);
        expect(createTicketSchema.safeParse({ ...valido, title: 'a'.repeat(101) }).success).toBe(
            false,
        );
    });

    it('exige descrição entre 10 e 1000 caracteres', () => {
        expect(createTicketSchema.safeParse({ ...valido, description: 'curta' }).success).toBe(
            false,
        );
        expect(
            createTicketSchema.safeParse({ ...valido, description: 'x'.repeat(1001) }).success,
        ).toBe(false);
    });

    it('limita prioridade aos valores do domínio', () => {
        expect(createTicketSchema.safeParse({ ...valido, priority: 'Urgente' }).success).toBe(
            false,
        );
        expect(createTicketSchema.safeParse({ ...valido, priority: 'Alta' }).success).toBe(true);
    });

    it('limita categoria aos valores do domínio', () => {
        expect(createTicketSchema.safeParse({ ...valido, category: 'Impressora' }).success).toBe(
            false,
        );
        expect(createTicketSchema.safeParse({ ...valido, category: 'Rede' }).success).toBe(true);
    });
});

describe('updateTicketStatusSchema', () => {
    it('aceita os três status do fluxo', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'Aberto' }).success).toBe(true);
        expect(updateTicketStatusSchema.safeParse({ status: 'Em andamento' }).success).toBe(true);
        expect(updateTicketStatusSchema.safeParse({ status: 'Resolvido' }).success).toBe(true);
    });

    it('rejeita status fora do fluxo', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'Fechado' }).success).toBe(false);
        expect(updateTicketStatusSchema.safeParse({}).success).toBe(false);
    });
});

describe('createCommentSchema', () => {
    it('aceita comentário de 1 a 500 caracteres', () => {
        expect(createCommentSchema.safeParse({ message: 'ok' }).success).toBe(true);
        expect(createCommentSchema.safeParse({ message: 'a'.repeat(500) }).success).toBe(true);
    });

    it('rejeita comentário vazio ou acima de 500 caracteres', () => {
        expect(createCommentSchema.safeParse({ message: '' }).success).toBe(false);
        expect(createCommentSchema.safeParse({ message: 'a'.repeat(501) }).success).toBe(false);
    });
});
