import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, podeResolver } from '../lib/auth';
import { useChamado, atualizarStatus, excluirChamado } from '../lib/data';
import { corCategoria, corPrioridade, corStatus, Chip, Lamp, LampStatus } from '../components/Lamp';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import { useToast } from '../components/Toast';
import { tempoDecorrido, txHora } from '../lib/types';
import type { Status } from '../lib/types';
import { ThreadComentarios } from '../components/ThreadComentarios';
import { Modal } from '../components/Modal';

export function TicketDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tid = Number(id);
  const { user } = useAuth();
  const toast = useToast();
  const { data, comentarios, error, loading, recarregar } = useChamado(tid);

  // Estado local para optimistic update do status
  const [statusOtimista, setStatusOtimista] = useState<Status | null>(null);
  const [erroOtimista, setErroOtimista] = useState<string | null>(null);

  // Estado para deletar chamado (modal + optimistic)
  const [deletando, setDeletando] = useState(false);
  const [modalDeletarAberto, setModalDeletarAberto] = useState(false);

  const pode = podeResolver(user?.role);

  // Deriva o status a exibir: otimista (se houver) ou o do servidor.
  const statusExibido: Status = statusOtimista ?? data?.status ?? 'Aberto';

  // Sincroniza o estado otimista com o dado do servidor (reload em background).
  const recarregarSync = useCallback(async () => {
    await recarregar();
    setStatusOtimista(null);
    setErroOtimista(null);
  }, [recarregar]);

  async function mudarStatus(novoStatus: Status) {
    if (!data) return;

    const statusAnterior = data.status;

    // 1) Atualiza a UI imediatamente (optimistic)
    setStatusOtimista(novoStatus);
    setErroOtimista(null);

    // 2) Chama a API em background
    try {
      await atualizarStatus(data.id, novoStatus);
      toast.sucesso(`Chamado #${data.id} em "${novoStatus}".`);
      void recarregarSync(); // resync silencioso
    } catch {
      // 3) Rollback em caso de erro
      setStatusOtimista(null);
      setErroOtimista(`Não foi possível atualizar o status. Revertido para "${statusAnterior}".`);
      toast.erro('Não foi possível atualizar o status do chamado.');
    }
  }

  // --- Deletar chamado (optimistic + modal) ---
  function abrirModalDeletar() {
    setModalDeletarAberto(true);
  }

  function fecharModalDeletar() {
    setModalDeletarAberto(false);
  }

  async function confirmarDeletar() {
    if (!data) return;

    setDeletando(true);

    try {
      // Optimistic: navega imediatamente para a fila
      await excluirChamado(data.id);
      toast.sucesso(`Chamado #${data.id} excluído.`);
      fecharModalDeletar();
      navigate('/chamados', { replace: true });
    } catch {
      toast.erro('Não foi possível excluir o chamado.');
    } finally {
      setDeletando(false);
    }
  }

  if (loading && !data) {
    return <Loading label="Carregando registro…" />;
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
          <LampStatus status={statusExibido} />
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
          <Lamp cor={corStatus[statusExibido].cor} acesa={corStatus[statusExibido].acesa} size={8} />
          {statusExibido}
        </UpdateBox>
        <UpdateBox label="Responsável">
          <Lamp cor={statusExibido !== 'Aberto' ? 'var(--lamp-resolvido)' : 'var(--lamp-apagada)'} acesa={statusExibido !== 'Aberto'} size={8} />
          {statusExibido !== 'Aberto' ? (data.responsavel ?? 'mariana.andrade') : 'Aguardando triagem'}
        </UpdateBox>
        <UpdateBox label="Aberto em">{txHora(data.created_at)}</UpdateBox>
        <UpdateBox label="Espera">{tempoDecorrido(data.created_at)}</UpdateBox>
      </div>

      {erroOtimista && (
        <p className="field__error field__error--form" role="alert" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={14} /> {erroOtimista}
        </p>
      )}

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
          {pode && statusExibido === 'Aberto' && (
            <button className="btn btn--primario" onClick={() => mudarStatus('Em andamento')}>
              <Icon name="bolt" size={15} /> Assumir e iniciar
            </button>
          )}
          {pode && statusExibido === 'Em andamento' && (
            <button className="btn btn--primario" onClick={() => mudarStatus('Resolvido')}>
              <Icon name="check" size={15} /> Marcar resolvido
            </button>
          )}
          {user?.role === 'admin' && (
            <button className="btn btn--perigo" onClick={abrirModalDeletar}>
              <Icon name="trash" size={15} /> Excluir chamado
            </button>
          )}
        </div>
      </section>

      <ThreadComentarios id={data.id} comentarios={comentarios} aoEnviar={recarregarSync} />

      <Modal
        aberto={modalDeletarAberto}
        aoFechar={fecharModalDeletar}
        titulo="Excluir chamado"
        descricao={`Esta ação removerá permanentemente o chamado #${data.id}. Não é possível desfazer.`}
        acaoPrimaria={{
          label: 'Excluir',
          variante: 'perigosa',
          carregando: deletando,
          onClick: confirmarDeletar,
        }}
        acaoSecundaria={{
          label: 'Cancelar',
          onClick: fecharModalDeletar,
        }}
      />
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