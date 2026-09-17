// Tipos de domínio do backend: claims de JWT e linhas retornadas pelo PostgreSQL.
//
// Os tipos de linha são `type` (e não `interface`) porque o `QueryResult<T>` do
// `pg` exige compatibilidade com `QueryResultRow` ({ [column: string]: any }) —
// e apenas type aliases de objeto recebem index signature implícita no TS.

export type UserRole = 'admin' | 'analista' | 'usuario';

export type TicketStatus = 'Aberto' | 'Em andamento' | 'Resolvido';

export type TicketPriority = 'Baixa' | 'Média' | 'Alta';

export type TicketCategory = 'Hardware' | 'Software' | 'Rede' | 'Outros';

/** Claims assinadas no JWT (login) e validadas em cada request autenticado. */
export type JwtClaims = {
    id: number;
    role: UserRole;
    iat: number;
    /** Expiração em segundos desde o epoch. */
    exp: number;
};

export type UserRow = {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
};

/** Colunas públicas de usuário (nunca expõem password_hash). */
export type UserPublicRow = Pick<UserRow, 'id' | 'username' | 'email' | 'role' | 'created_at'>;

/** Colunas públicas usadas em respostas de atualização. */
export type UserSafeRow = Pick<UserRow, 'id' | 'username' | 'email' | 'role'>;

export type TicketRow = {
    id: number;
    user_id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    responsavel_id: number | null;
    created_at: Date;
    updated_at: Date;
};

/** Linha do JOIN de listagem de chamados (com autor/responsável). */
export type TicketListItemRow = {
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    created_at: Date;
    autor_do_chamado: string;
    responsavel: string | null;
};

/** Linha do GET /chamados/:id (inclui updated_at). */
export type TicketDetailRow = TicketListItemRow & { updated_at: Date };

export type TicketCommentRow = {
    id: number;
    ticket_id: number;
    user_id: number;
    message: string;
    created_at: Date;
};

/** Linha do JOIN de comentários (com autor). */
export type CommentListItemRow = {
    id: number;
    message: string;
    created_at: Date;
    autor_do_comentario: string;
    perfil_do_autor: UserRole;
};
