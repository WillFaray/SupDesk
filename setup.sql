-- Reset completo do esquema (para evolução não-destrutiva, use `npm run db:migrate`)
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

CREATE TABLE schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'usuario',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('usuario', 'analista', 'admin'))
);

-- Tokens JWT revogados no logout (guardados por hash até a expiração)
CREATE TABLE revoked_tokens (
    id SERIAL PRIMARY KEY,
    token_hash CHAR(64) UNIQUE NOT NULL,
    revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_revoked_tokens_hash ON revoked_tokens (token_hash);
CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);

-- Tabela de chamados
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Aberto',
    priority VARCHAR(20) NOT NULL DEFAULT 'Média',
    category VARCHAR(50) NOT NULL DEFAULT 'Outros',
    responsavel_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tickets_status CHECK (status IN ('Aberto', 'Em andamento', 'Resolvido')),
    CONSTRAINT chk_tickets_priority CHECK (priority IN ('Baixa', 'Média', 'Alta')),
    CONSTRAINT chk_tickets_category CHECK (category IN ('Hardware', 'Software', 'Rede', 'Outros'))
);

CREATE INDEX idx_tickets_user_id_created_at ON tickets (user_id, created_at DESC);
CREATE INDEX idx_tickets_created_at_desc ON tickets (created_at DESC);
CREATE INDEX idx_tickets_status_priority_category ON tickets (status, priority, category);
CREATE INDEX idx_tickets_responsavel_id ON tickets (responsavel_id);

-- Tabela de comentários dos chamados
CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_comments_ticket_id_created_at
    ON ticket_comments (ticket_id, created_at ASC);
