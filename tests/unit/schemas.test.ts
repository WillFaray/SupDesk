// Testes unitários dos schemas Zod — primeira linha de defesa da API:
// contrato do body, sanitização, mensagens e descarte de chaves desconhecidas.
import { describe, expect, it } from 'vitest';
import {
    createCommentSchema,
    createTicketSchema,
    updateTicketStatusSchema,
} from '../../src/schemas/ticketSchema.js';
import { loginSchema, registerSchema, updateUserSchema } from '../../src/schemas/userSchema.js';

describe('registerSchema', () => {
    it('aceita um cadastro válido e normaliza email/username', () => {
        const parsed = registerSchema.safeParse({
            username: '  joao.silva  ',
            email: '  Joao@Empresa.COM ',
            password_hash: 'SenhaForte123',
        });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data).toEqual({
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'SenhaForte123',
            });
        }
    });

    it('exige username com pelo menos 3 caracteres úteis (após trim)', () => {
        const parsed = registerSchema.safeParse({
            username: '  ab  ',
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

    it('exige senha entre 8 e 72 caracteres e sem null bytes', () => {
        expect(
            registerSchema.safeParse({
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'curta',
            }).success,
        ).toBe(false);

        expect(
            registerSchema.safeParse({
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'a'.repeat(73),
            }).success,
        ).toBe(false);

        expect(
            registerSchema.safeParse({
                username: 'joao.silva',
                email: 'joao@empresa.com',
                password_hash: 'SenhaForte\u0000123',
            }).success,
        ).toBe(false);
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
    it('aceita credenciais bem formadas e normaliza o email para minúsculas', () => {
        const parsed = loginSchema.safeParse({ email: '  JOAO@Empresa.com ', password: 'x' });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.email).toBe('joao@empresa.com');
        }
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

    it('rejeita payload contendo apenas campos não permitidos (ex.: role)', () => {
        expect(updateUserSchema.safeParse({ role: 'admin' }).success).toBe(false);
    });

    it('rejeita senha abaixo do mínimo ou acima de 72 caracteres', () => {
        expect(updateUserSchema.safeParse({ password_hash: 'curta' }).success).toBe(false);
        expect(updateUserSchema.safeParse({ password_hash: 'a'.repeat(73) }).success).toBe(false);
    });
});

describe('createTicketSchema', () => {
    const valido = {
        title: 'Impressora travada',
        description: 'A impressora do 3º andar não responde desde ontem.',
        priority: 'Média',
        category: 'Hardware',
    };

    it('aceita um chamado válido e aplica trim no título e descrição', () => {
        const parsed = createTicketSchema.safeParse({
            ...valido,
            title: '  Impressora travada  ',
        });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.title).toBe('Impressora travada');
        }
    });

    it('exige título entre 3 e 100 caracteres úteis (rejeita espaços em branco)', () => {
        expect(createTicketSchema.safeParse({ ...valido, title: 'ab' }).success).toBe(false);
        expect(createTicketSchema.safeParse({ ...valido, title: '   ab   ' }).success).toBe(false);
        expect(createTicketSchema.safeParse({ ...valido, title: 'a'.repeat(101) }).success).toBe(
            false,
        );
    });

    it('exige descrição entre 10 e 1000 caracteres úteis', () => {
        expect(createTicketSchema.safeParse({ ...valido, description: 'curta' }).success).toBe(
            false,
        );
        expect(
            createTicketSchema.safeParse({ ...valido, description: '   curta   ' }).success,
        ).toBe(false);
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
    it('aceita os três status do fluxo (Resolvido com justificativa)', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'Aberto' }).success).toBe(true);
        expect(updateTicketStatusSchema.safeParse({ status: 'Em andamento' }).success).toBe(true);
        expect(
            updateTicketStatusSchema.safeParse({
                status: 'Resolvido',
                resolucao: 'Equipamento substituído.',
            }).success,
        ).toBe(true);
    });

    it('exige justificativa útil (≥ 10 caracteres, sem contar espaços nas pontas) ao resolver', () => {
        for (const resolucao of [undefined, '', '   curta   ', '\0\0\0\0\0\0\0\0\0\0\0ok']) {
            const parsed = updateTicketStatusSchema.safeParse({ status: 'Resolvido', resolucao });
            expect(parsed.success).toBe(false);
            if (!parsed.success) {
                expect(parsed.error.issues[0]?.path).toEqual(['resolucao']);
            }
        }
    });

    it('sanitiza justificativa e motivo e limita o tamanho', () => {
        const parsed = updateTicketStatusSchema.safeParse({
            status: 'Resolvido',
            resolucao: '  Driver\0 atualizado com sucesso.  ',
        });
        expect(parsed.success && parsed.data.resolucao).toBe('Driver atualizado com sucesso.');

        expect(
            updateTicketStatusSchema.safeParse({ status: 'Resolvido', resolucao: 'x'.repeat(1001) })
                .success,
        ).toBe(false);
        expect(
            updateTicketStatusSchema.safeParse({ status: 'Aberto', motivo: 'x'.repeat(501) })
                .success,
        ).toBe(false);
        expect(
            updateTicketStatusSchema.safeParse({ status: 'Aberto', motivo: ['injeção'] }).success,
        ).toBe(false);
    });

    it('rejeita status fora do fluxo', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'Fechado' }).success).toBe(false);
        expect(updateTicketStatusSchema.safeParse({}).success).toBe(false);
    });
});

describe('createCommentSchema', () => {
    it('aceita comentário de 1 a 500 caracteres úteis', () => {
        expect(createCommentSchema.safeParse({ message: 'ok' }).success).toBe(true);
        expect(createCommentSchema.safeParse({ message: 'a'.repeat(500) }).success).toBe(true);
    });

    it('rejeita comentário vazio, só com espaços ou acima de 500 caracteres', () => {
        expect(createCommentSchema.safeParse({ message: '' }).success).toBe(false);
        expect(createCommentSchema.safeParse({ message: '     ' }).success).toBe(false);
        expect(createCommentSchema.safeParse({ message: 'a'.repeat(501) }).success).toBe(false);
    });
});
