import bcrypt from 'bcrypt';
import type pg from 'pg';
import type { TicketCategory, TicketPriority, TicketStatus, UserRole } from '../types/db.js';

export const SEED_DEFAULT_PASSWORD = 'SenhaForte123';

export interface SeedResult {
    users: number;
    tickets: number;
    comments: number;
    events: number;
}

interface SeedUser {
    username: string;
    email: string;
    role: UserRole;
}

interface SeedTicket {
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    autorEmail: string;
    responsavelEmail: string | null;
    horasAtras: number;
    /** Quando o chamado foi assumido (obrigatório se status ≠ Aberto). */
    atendimentoHorasAtras?: number;
    /** Justificativa e momento da resolução (obrigatório se status = Resolvido). */
    resolucao?: { texto: string; horasAtras: number };
    comments: {
        autorEmail: string;
        message: string;
        horasAtras: number;
    }[];
}

const SEED_USERS: SeedUser[] = [
    { username: 'carlos.menezes', email: 'carlos@empresa.com.br', role: 'admin' },
    { username: 'mariana.andrade', email: 'mariana@empresa.com.br', role: 'analista' },
    { username: 'beatriz.lima', email: 'beatriz@empresa.com.br', role: 'analista' },
    { username: 'julia.rocha', email: 'julia@empresa.com.br', role: 'usuario' },
    { username: 'rafael.duarte', email: 'rafael@empresa.com.br', role: 'usuario' },
];

const SEED_TICKETS: SeedTicket[] = [
    {
        title: 'Notebook não inicia após atualização do Windows',
        description:
            'Após a atualização de ontem à noite, o notebook do financeiro não sobe além da tela de login. Tela preta após inserir a senha. Já tentei reiniciar três vezes e o problema persiste.',
        status: 'Em andamento',
        priority: 'Alta',
        category: 'Hardware',
        autorEmail: 'julia@empresa.com.br',
        responsavelEmail: 'mariana@empresa.com.br',
        horasAtras: 2,
        atendimentoHorasAtras: 1.8,
        comments: [
            {
                autorEmail: 'mariana@empresa.com.br',
                message:
                    'Olá, Julia. Vamos checar o registro de eventos do sistema. Consegue me dizer o modelo exato do notebook?',
                horasAtras: 1.5,
            },
            {
                autorEmail: 'julia@empresa.com.br',
                message:
                    'É o Dell Latitude 5420. O problema começou exatamente após a atualização de ontem.',
                horasAtras: 1.2,
            },
        ],
    },
    {
        title: 'Sem acesso à rede sem fio no 3º andar',
        description:
            'O Wi-Fi caiu em todo o 3º andar desde as 9h. Os colegas confirmam que a rede "Corp-5G" não aparece em nenhum dispositivo.',
        status: 'Aberto',
        priority: 'Alta',
        category: 'Rede',
        autorEmail: 'rafael@empresa.com.br',
        responsavelEmail: null,
        horasAtras: 4,
        comments: [
            {
                autorEmail: 'mariana@empresa.com.br',
                message:
                    'Vou acionar o fornecedor do switch do 3º andar agora mesmo. Enquanto isso, pode usar a rede visitante "Corp-Eventos".',
                horasAtras: 3.5,
            },
        ],
    },
    {
        title: 'Solicitar instalação do pacote Office',
        description:
            'Cheguei hoje na empresa e o notebook veio sem o pacote Office instalado. Preciso para as planilhas do dia a dia.',
        status: 'Resolvido',
        priority: 'Baixa',
        category: 'Software',
        autorEmail: 'julia@empresa.com.br',
        responsavelEmail: 'beatriz@empresa.com.br',
        horasAtras: 26,
        atendimentoHorasAtras: 25,
        resolucao: {
            texto: 'Pacote Office instalado e licença ativada na conta corporativa da colaboradora. Validado com ela por chamada.',
            horasAtras: 20,
        },
        comments: [],
    },
    {
        title: 'Impressora do setor comercial sem toner',
        description:
            'A impressora HP da sala 214 indica toner esgotado. Fazemos muitos relatórios por dia e ficamos sem imprimir.',
        status: 'Aberto',
        priority: 'Média',
        category: 'Hardware',
        autorEmail: 'rafael@empresa.com.br',
        responsavelEmail: null,
        horasAtras: 30,
        comments: [],
    },
    {
        title: 'Acesso ao sistema de vendas expirou',
        description:
            'Meu acesso ao CRM de vendas expirou e o botão de redefinir não envia o e-mail de recuperação.',
        status: 'Em andamento',
        priority: 'Média',
        category: 'Software',
        autorEmail: 'julia@empresa.com.br',
        responsavelEmail: 'mariana@empresa.com.br',
        horasAtras: 49,
        atendimentoHorasAtras: 47,
        comments: [
            {
                autorEmail: 'mariana@empresa.com.br',
                message:
                    'Redefini o acesso manualmente, Julia. Tenta logar com a mesma senha dentro de 30 min.',
                horasAtras: 46,
            },
        ],
    },
    {
        title: 'Videoconferência sem áudio na sala de reunião 2',
        description:
            'O equipamento da sala 2 conecta, mas o áudio não sai nos alto-falantes. Já verificamos cabo e conexão Bluetooth.',
        status: 'Resolvido',
        priority: 'Média',
        category: 'Hardware',
        autorEmail: 'rafael@empresa.com.br',
        responsavelEmail: 'beatriz@empresa.com.br',
        horasAtras: 70,
        atendimentoHorasAtras: 69,
        resolucao: {
            texto: 'Driver de áudio do equipamento atualizado e saída padrão reconfigurada para os alto-falantes da sala.',
            horasAtras: 66,
        },
        comments: [],
    },
];

export const seedDatabase = async (
    poolOrClient: pg.Pool,
    defaultPassword = SEED_DEFAULT_PASSWORD,
): Promise<SeedResult> => {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const client = await poolOrClient.connect();

    let usersInsertedOrUpdated = 0;
    let ticketsInserted = 0;
    let commentsInserted = 0;
    let eventsInserted = 0;

    try {
        await client.query('BEGIN');

        const userIdsByEmail = new Map<string, number>();

        for (const u of SEED_USERS) {
            const res = await client.query<{ id: number }>(
                `INSERT INTO users (username, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO UPDATE
                    SET username = EXCLUDED.username,
                        role = EXCLUDED.role,
                        updated_at = CURRENT_TIMESTAMP
                 RETURNING id`,
                [u.username, u.email, passwordHash, u.role],
            );
            const id = res.rows[0]?.id;
            if (id !== undefined) {
                userIdsByEmail.set(u.email, id);
                usersInsertedOrUpdated += 1;
            }
        }

        for (const t of SEED_TICKETS) {
            const autorId = userIdsByEmail.get(t.autorEmail);
            if (!autorId) continue;

            const responsavelId = t.responsavelEmail
                ? (userIdsByEmail.get(t.responsavelEmail) ?? null)
                : null;

            const existingTicket = await client.query<{ id: number }>(
                'SELECT id FROM tickets WHERE user_id = $1 AND title = $2 LIMIT 1',
                [autorId, t.title],
            );

            if (existingTicket.rowCount && existingTicket.rows[0]) {
                continue;
            }

            const minutos = (horas: number | undefined): string | null =>
                horas === undefined ? null : String(Math.round(horas * 60));
            const minutosAtras = minutos(t.horasAtras);
            const atendimentoMinutos =
                t.status === 'Aberto' ? null : minutos(t.atendimentoHorasAtras);
            const resolucaoMinutos =
                t.status === 'Resolvido' ? minutos(t.resolucao?.horasAtras ?? t.horasAtras) : null;
            const resolucaoTexto = t.status === 'Resolvido' ? (t.resolucao?.texto ?? null) : null;
            const resolvidoPorId = t.status === 'Resolvido' ? responsavelId : null;

            const ticketRes = await client.query<{ id: number }>(
                `INSERT INTO tickets (
                    user_id, title, description, status, priority, category, responsavel_id,
                    created_at, updated_at, primeiro_atendimento_em, resolvido_em, resolvido_por_id, resolucao
                 ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    NOW() - ($8::text || ' minutes')::interval,
                    NOW() - (COALESCE($10::text, $9::text, $8::text) || ' minutes')::interval,
                    NOW() - ($9::text || ' minutes')::interval,
                    NOW() - ($10::text || ' minutes')::interval,
                    $11, $12
                 ) RETURNING id`,
                [
                    autorId,
                    t.title,
                    t.description,
                    t.status,
                    t.priority,
                    t.category,
                    responsavelId,
                    minutosAtras,
                    atendimentoMinutos,
                    resolucaoMinutos,
                    resolvidoPorId,
                    resolucaoTexto,
                ],
            );

            const ticketId = ticketRes.rows[0]?.id;
            if (!ticketId) continue;
            ticketsInserted += 1;

            // Trilha de eventos coerente com os marcos do chamado.
            const eventos: {
                userId: number | null;
                tipo: 'criado' | 'assumido' | 'resolvido';
                anterior: TicketStatus | null;
                novo: TicketStatus;
                detalhe: string | null;
                minutos: string | null;
            }[] = [
                {
                    userId: autorId,
                    tipo: 'criado',
                    anterior: null,
                    novo: 'Aberto',
                    detalhe: null,
                    minutos: minutosAtras,
                },
            ];
            if (atendimentoMinutos) {
                eventos.push({
                    userId: responsavelId,
                    tipo: 'assumido',
                    anterior: 'Aberto',
                    novo: 'Em andamento',
                    detalhe: null,
                    minutos: atendimentoMinutos,
                });
            }
            if (resolucaoMinutos) {
                eventos.push({
                    userId: resolvidoPorId,
                    tipo: 'resolvido',
                    anterior: 'Em andamento',
                    novo: 'Resolvido',
                    detalhe: resolucaoTexto,
                    minutos: resolucaoMinutos,
                });
            }
            for (const e of eventos) {
                await client.query(
                    `INSERT INTO ticket_events (ticket_id, user_id, tipo, status_anterior, status_novo, detalhe, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($7 || ' minutes')::interval)`,
                    [ticketId, e.userId, e.tipo, e.anterior, e.novo, e.detalhe, e.minutos],
                );
                eventsInserted += 1;
            }

            for (const c of t.comments) {
                const commentUserId = userIdsByEmail.get(c.autorEmail);
                if (!commentUserId) continue;
                const commentMinutos = String(Math.round(c.horasAtras * 60));

                await client.query(
                    `INSERT INTO ticket_comments (ticket_id, user_id, message, created_at)
                     VALUES ($1, $2, $3, NOW() - ($4 || ' minutes')::interval)`,
                    [ticketId, commentUserId, c.message, commentMinutos],
                );
                commentsInserted += 1;
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return {
        users: usersInsertedOrUpdated,
        tickets: ticketsInserted,
        comments: commentsInserted,
        events: eventsInserted,
    };
};
