import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, podeResolver } from '../lib/auth';
import { useChamado, atualizarStatus } from '../lib/data';
import { corCategoria, corPrioridade, corStatus, Chip, Lamp, LampStatus } from '../components/Lamp';
import { Icon } from '../components/Icon';
import { tempoDecorrido, txHora } from '../lib/types';
import { ThreadComentarios } from '../components/ThreadComentarios';

export function TicketDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tid = Number(id);
  const { user } = useAuth();
  const { data, comentarios, error, loading, recarregar } = useChamado(tid);
  const [mutando, setMutando] = useState(false);

  const pode = podeResolver(user?.role);

  async function mudarStatus(novoStatus: import('../lib/types').Status) {
    if (!data) return;
    setMutando(true);
    try {
      await atualizarStatus(data.id, novoStatus);
      await recarregar();
    } finally {
      setMutando(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="panel-empty">
        <Icon name="gauge" size={28} />
        <p><strong>Carregando registro…</strong></p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="panel-empty">
        <Icon name="alert" size={28} />
        <p><strong>{error}</strong></p>
        <p><button className="btn" onClick={() => navigate('/chamados')}>Voltar à fila</button></p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="detail">
      <button className="btn btn--fantasma btn--sm" onClick={() => navigate('/chamados')} style={{ marginBottom: 16 }}>
        <Icon name="arrowLeft" size={14} /> Voltar à fila
      </button>

      <div className="detail__head">
        <div className="detail__lamp-col" aria-hidden="true">
          <LampStatus status={data.status} />
          <span className="detail__lamp-label">#{data.id}</span>
        </div>
        <div>
          <h1 className="detail__title">{data.title}</h1>
          <div className="detail__meta">
            <span className="queue__num">
              <Lamp cor={corPrioridade[data.priority]} acesa={data.priority === 'Alta'} size={8} />
              Prioridade {data.priority}
            </span>
            <Chip cor={corCategoria[data.category]}>{data.category}</Chip>
            <span className="u-mono" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
              aberto por {data.autor_do_chamado}
            </span>
          </div>
        </div>
      </div>

      <div className="detail__updates">
        <UpdateBox label="Status">
          <Lamp cor={corStatus[data.status].cor} acesa={corStatus[data.status].acesa} size={8} />
          {data.status}
        </UpdateBox>
        <UpdateBox label="Responsável">
          <Lamp cor={data.responsavel ? 'var(--lamp-verde)' : 'var(--lamp-apagada)'} acesa={!!data.responsavel} size={8} />
          {data.responsavel ?? 'Aguardando triagem'}
        </UpdateBox>
        <UpdateBox label="Aberto em">{txHora(data.created_at)}</UpdateBox>
        <UpdateBox label="Espera">{tempoDecorrido(data.created_at)}</UpdateBox>
      </div>

      <section className="instrument" aria-label="Descrição do chamado">
        <div className="instrument__head">
          <span className="instrument__title"><Icon name="tag" size={13} /> Descrição</span>
        </div>
        <div className="instrument__body">
          <p className="detail__desc">{data.description}</p>
        </div>
      </section>

      <section className="instrument" aria-label="Ações do chamado">
        <div className="instrument__head">
          <span className="instrument__title"><Icon name="bolt" size={13} /> Operação</span>
        </div>
        <div className="instrument__body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pode && data.status === 'Aberto' && (
            <button className="btn btn--primario" disabled={mutando} onClick={() => mudarStatus('Em andamento')}>
              <Icon name="bolt" size={15} /> Assumir e iniciar
            </button>
          )}
          {pode && data.status === 'Em andamento' && (
            <button className="btn btn--primario" disabled={mutando} onClick={() => mudarStatus('Resolvido')}>
              <Icon name="check" size={15} /> Marcar resolvido
            </button>
          )}
        </div>
      </section>

      <ThreadComentarios id={data.id} comentarios={comentarios} aoEnviar={recarregar} />
    </div>
  );
}

function UpdateBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail__update">
      <div className="detail__update-label">{label}</div>
      <div className="detail__update-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}