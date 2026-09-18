// Estado da sessão autenticada.
//
// A assinatura do JWT só prova que o token foi emitido por nós. O que a
// autorização precisa saber é o estado ATUAL da conta, e isso vem do banco.
// Esta consulta (uma única ida ao banco por requisição autenticada) resolve
// três verificações de uma vez:
//
//   1. o usuário do token ainda existe  → conta removida = sessão inválida;
//   2. o token não foi revogado          → logout invalida o token na hora;
//   3. o PAPEL atual do usuário          → papel do JWT NUNCA é a fonte da verdade.
//
// (3) é o que fecha o acesso indevido às rotas administrativas: se um admin é
// rebaixado ou removido, o token que ele já tinha deixa de valer como admin no
// próximo request, sem esperar as 8h de expiração.
import pool from './database.js';
import { hashToken } from './tokenRevocation.js';
import type { UserRole } from './types/db.js';

export type EstadoSessao =
    { situacao: 'ok'; role: UserRole } | { situacao: 'revogada' } | { situacao: 'inexistente' };

export const consultarSessao = async (userId: number, token: string): Promise<EstadoSessao> => {
    type SessaoRow = { role: UserRole | null; revogado: boolean };

    const resultado = await pool.query<SessaoRow>(
        `SELECT u.role AS role,
                EXISTS (
                    SELECT 1 FROM revoked_tokens AS r
                     WHERE r.token_hash = $2 AND r.expires_at > NOW()
                ) AS revogado
           FROM users AS u
          WHERE u.id = $1`,
        [userId, hashToken(token)],
    );

    const linha = resultado.rows[0];
    if (!linha || linha.role === null) return { situacao: 'inexistente' };
    if (linha.revogado) return { situacao: 'revogada' };
    return { situacao: 'ok', role: linha.role };
};
