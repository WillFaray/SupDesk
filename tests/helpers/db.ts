// Fábrica de dados para os testes de integração: usuários, chamados e logins
// REAIS no banco supdesk_test (bcrypt de verdade, JWT emitido pela aplicação).
import bcrypt from 'bcrypt';
import type { Express } from 'express';
import supertest from 'supertest';
import pool from '../../src/database.js';
import type { UserRole } from '../../src/types/db.js';

export const SENHA_PADRAO = 'SenhaForte123';

export interface UsuarioTeste {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    /** Senha em claro, para login nos testes. */
    password: string;
}

/** Zera todas as tabelas (identidades reiniciadas → IDs determinísticos). */
export const limparTabelas = async (): Promise<void> => {
    await pool.query(
        'TRUNCATE ticket_comments, tickets, revoked_tokens, users RESTART IDENTITY CASCADE',
    );
};

/** Insere um usuário com hash de senha de verdade. */
export const criarUsuario = async (dados: {
    username: string;
    email: string;
    role?: UserRole;
    password?: string;
}): Promise<UsuarioTeste> => {
    const password = dados.password ?? SENHA_PADRAO;
    const resultado = await pool.query<{
        id: number;
        username: string;
        email: string;
        role: UserRole;
    }>(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
        [dados.username, dados.email, await bcrypt.hash(password, 10), dados.role ?? 'usuario'],
    );
    const linha = resultado.rows[0];
    if (!linha) throw new Error('Falha ao criar usuário de teste');
    return { ...linha, password };
};

/** Faz login pela rota real e devolve o JWT emitido pela aplicação. */
export const logar = async (app: Express, email: string, password: string): Promise<string> => {
    const resposta = await supertest(app).post('/auth/login').send({ email, password });
    if (resposta.status !== 200) {
        throw new Error(`Login de teste falhou (${resposta.status}) para ${email}`);
    }
    const corpo = resposta.body as { token?: string };
    if (!corpo.token) throw new Error(`Login sem token para ${email}`);
    return corpo.token;
};

export interface ChamadoTeste {
    id: number;
    user_id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
}

/**
 * Insere um chamado direto no banco — usado quando o teste precisa controlar
 * created_at (ordenação/paginação dependem de TIMESTAMP com precisão de
 * segundos; pela API, dois inserts no mesmo segundo empatariam).
 */
export const criarChamadoDireto = async (dados: {
    user_id: number;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    category?: string;
    /** Idade do chamado em minutos (controla a ordenação por created_at). */
    criadoHaMinutos?: number;
}): Promise<ChamadoTeste> => {
    const idade = String(dados.criadoHaMinutos ?? 0);
    const resultado = await pool.query<ChamadoTeste>(
        `INSERT INTO tickets (user_id, title, description, status, priority, category, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7 || ' minutes')::interval, NOW() - ($7 || ' minutes')::interval)
         RETURNING id, user_id, title, description, status, priority, category`,
        [
            dados.user_id,
            dados.title,
            dados.description ?? 'Descrição suficientemente longa para o teste',
            dados.status ?? 'Aberto',
            dados.priority ?? 'Média',
            dados.category ?? 'Outros',
            idade,
        ],
    );
    const linha = resultado.rows[0];
    if (!linha) throw new Error('Falha ao criar chamado de teste');
    return linha;
};
