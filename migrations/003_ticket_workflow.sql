-- Migração 003: Workflow de resolução (P2.2)
-- • Marcos de atendimento no chamado (1º atendimento, resolução, quem resolveu e justificativa)
-- • Trilha de eventos do chamado (ticket_events) para o histórico visual
-- • Backfill seguro dos chamados já existentes (nenhum dado antigo é perdido)

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS primeiro_atendimento_em TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolvido_por_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolucao TEXT;

-- Backfill: chamados que já saíram da triagem recebem o 1º atendimento em updated_at;
-- chamados resolvidos recebem o marco de resolução (sem justificativa — registro legado).
UPDATE tickets
    SET primeiro_atendimento_em = updated_at
    WHERE status <> 'Aberto' AND primeiro_atendimento_em IS NULL;

UPDATE tickets
    SET resolvido_em = updated_at,
        resolvido_por_id = COALESCE(resolvido_por_id, responsavel_id)
    WHERE status = 'Resolvido' AND resolvido_em IS NULL;

UPDATE tickets
    SET resolvido_em = NULL, resolvido_por_id = NULL, resolucao = NULL
    WHERE status <> 'Resolvido';

DO $$
BEGIN
    -- Um chamado está "Resolvido" se, e somente se, possui o marco de resolução.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_resolvido_em'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT chk_tickets_resolvido_em
            CHECK ((status = 'Resolvido') = (resolvido_em IS NOT NULL));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_resolucao_tamanho'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT chk_tickets_resolucao_tamanho
            CHECK (resolucao IS NULL OR char_length(resolucao) <= 1000);
    END IF;
END $$;

-- Trilha de eventos: o autor pode ser removido sem apagar o histórico (ON DELETE SET NULL).
CREATE TABLE IF NOT EXISTS ticket_events (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    detalhe TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ticket_events_tipo
        CHECK (tipo IN ('criado', 'assumido', 'resolvido', 'reaberto', 'devolvido')),
    CONSTRAINT chk_ticket_events_status_anterior
        CHECK (status_anterior IS NULL OR status_anterior IN ('Aberto', 'Em andamento', 'Resolvido')),
    CONSTRAINT chk_ticket_events_status_novo
        CHECK (status_novo IS NULL OR status_novo IN ('Aberto', 'Em andamento', 'Resolvido')),
    CONSTRAINT chk_ticket_events_detalhe_tamanho
        CHECK (detalhe IS NULL OR char_length(detalhe) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id_created_at
    ON ticket_events (ticket_id, created_at ASC, id ASC);

-- Backfill da trilha: abertura de todos os chamados existentes...
INSERT INTO ticket_events (ticket_id, user_id, tipo, status_novo, created_at)
SELECT t.id, t.user_id, 'criado', 'Aberto', t.created_at
FROM tickets t
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.tipo = 'criado'
);

-- ...início do atendimento dos que já saíram da triagem...
INSERT INTO ticket_events (ticket_id, user_id, tipo, status_anterior, status_novo, created_at)
SELECT t.id, t.responsavel_id, 'assumido', 'Aberto', 'Em andamento', t.primeiro_atendimento_em
FROM tickets t
WHERE t.status <> 'Aberto'
  AND t.primeiro_atendimento_em IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.tipo = 'assumido'
  );

-- ...e resolução dos já resolvidos (sem justificativa: registro anterior ao workflow).
INSERT INTO ticket_events (ticket_id, user_id, tipo, status_anterior, status_novo, created_at)
SELECT t.id, t.resolvido_por_id, 'resolvido', 'Em andamento', 'Resolvido', t.resolvido_em
FROM tickets t
WHERE t.status = 'Resolvido'
  AND t.resolvido_em IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events e WHERE e.ticket_id = t.id AND e.tipo = 'resolvido'
  );
