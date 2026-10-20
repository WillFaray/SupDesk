-- Migração 002: Padronização de constraints de domínio (CHECK / NOT NULL) e índices operacionais

DO $$
BEGIN
    -- Normaliza eventuais nulos legados antes de reforçar NOT NULL / CHECK
    UPDATE users SET role = 'usuario' WHERE role IS NULL;
    UPDATE tickets SET status = 'Aberto' WHERE status IS NULL;
    UPDATE tickets SET priority = 'Média' WHERE priority IS NULL;
    UPDATE tickets SET category = 'Outros' WHERE category IS NULL;

    ALTER TABLE users ALTER COLUMN role SET NOT NULL;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'usuario';

    ALTER TABLE tickets ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE tickets ALTER COLUMN status SET NOT NULL;
    ALTER TABLE tickets ALTER COLUMN priority SET NOT NULL;
    ALTER TABLE tickets ALTER COLUMN category SET NOT NULL;

    ALTER TABLE ticket_comments ALTER COLUMN ticket_id SET NOT NULL;
    ALTER TABLE ticket_comments ALTER COLUMN user_id SET NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role
            CHECK (role IN ('usuario', 'analista', 'admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_status'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT chk_tickets_status
            CHECK (status IN ('Aberto', 'Em andamento', 'Resolvido'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_priority'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT chk_tickets_priority
            CHECK (priority IN ('Baixa', 'Média', 'Alta'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_category'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT chk_tickets_category
            CHECK (category IN ('Hardware', 'Software', 'Rede', 'Outros'));
    END IF;
END $$;

-- Índices para filtros, ordenação da fila, comentários e limpeza de tokens expirados
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
    ON revoked_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id_created_at
    ON tickets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_created_at_desc
    ON tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_status_priority_category
    ON tickets (status, priority, category);

CREATE INDEX IF NOT EXISTS idx_tickets_responsavel_id
    ON tickets (responsavel_id);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id_created_at
    ON ticket_comments (ticket_id, created_at ASC);
