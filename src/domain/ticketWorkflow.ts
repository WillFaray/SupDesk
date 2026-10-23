// Regras do workflow de resolução (P2.2) — puras e sem I/O, para serem testadas
// isoladamente e reaproveitadas pelo controller.
//
// Etapas: Aberto (triagem) → Em andamento (atendimento) → Resolvido.
// Toda mudança de status gera um evento na trilha do chamado (ticket_events).
import type { TicketEventType, TicketStatus } from '../types/db.js';

export type TransitionType = Exclude<TicketEventType, 'criado'>;

export const MIN_RESOLUTION_LENGTH = 10;

/**
 * Classifica a transição entre dois status. Retorna `null` quando o status não
 * muda (o controller responde 409 — evita "reassumir" um chamado em disputa).
 */
export const classifyTransition = (from: TicketStatus, to: TicketStatus): TransitionType | null => {
    if (from === to) return null;
    if (to === 'Resolvido') return 'resolvido';
    if (from === 'Resolvido') return 'reaberto';
    if (to === 'Em andamento') return 'assumido';
    return 'devolvido';
};

/**
 * Monta o UPDATE de cada transição. `$1` = status novo, `$2` = id do chamado,
 * `$3` = id do usuário que executa a ação, `$4` = justificativa (só em "resolvido").
 * `paramCount` indica quantos desses parâmetros o SQL usa (o driver `pg` exige
 * exatamente a quantidade referenciada).
 */
export const buildTransitionUpdate = (
    tipo: TransitionType,
    to: TicketStatus,
): { sql: string; paramCount: 2 | 3 | 4 } => {
    const clearResolution = 'resolvido_em = NULL, resolvido_por_id = NULL, resolucao = NULL';
    const assignActor =
        'responsavel_id = $3, primeiro_atendimento_em = COALESCE(primeiro_atendimento_em, NOW())';

    let sets: string;
    let paramCount: 2 | 3 | 4;
    switch (tipo) {
        case 'assumido':
            sets = `${assignActor}, ${clearResolution}`;
            paramCount = 3;
            break;
        case 'resolvido':
            // Mantém o responsável que conduziu o atendimento; se ninguém havia
            // assumido, quem resolve passa a ser o responsável.
            sets =
                'responsavel_id = COALESCE(responsavel_id, $3), primeiro_atendimento_em = COALESCE(primeiro_atendimento_em, NOW()), resolvido_em = NOW(), resolvido_por_id = $3, resolucao = $4';
            paramCount = 4;
            break;
        case 'reaberto':
            if (to === 'Em andamento') {
                sets = `${assignActor}, ${clearResolution}`;
                paramCount = 3;
            } else {
                sets = `responsavel_id = NULL, ${clearResolution}`;
                paramCount = 2;
            }
            break;
        case 'devolvido':
        default:
            sets = `responsavel_id = NULL, ${clearResolution}`;
            paramCount = 2;
            break;
    }

    return {
        sql: `UPDATE tickets SET status = $1, ${sets}, updated_at = NOW() WHERE id = $2 RETURNING *`,
        paramCount,
    };
};
