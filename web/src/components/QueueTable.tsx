import { useNavigate, Link } from 'react-router-dom';
import { corPrioridade, corStatus, Lamp } from './Lamp';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { chamadoAtrasado, tempoDecorrido } from '../lib/types';
import type { Chamado, OrdenacaoCampo, OrdenacaoDirecao, Status } from '../lib/types';

export function QueueTable({
  chamados,
  atualizando,
  pode,
  mover,
  sortBy = 'created_at',
  sortOrder = 'desc',
  aoOrdenar,
}: {
  chamados: Chamado[];
  atualizando: number | null;
  pode: boolean;
  mover: (c: Chamado, novo: Status) => void;
  sortBy?: OrdenacaoCampo;
  sortOrder?: OrdenacaoDirecao;
  aoOrdenar?: (campo: OrdenacaoCampo) => void;
}) {
  const navigate = useNavigate();

  function renderColHeader(label: string, campo: OrdenacaoCampo, className?: string) {
    if (!aoOrdenar) {
      return <span className={className}>{label}</span>;
    }
    const ativo = sortBy === campo;
    return (
      <button
        type="button"
        className={`queue__sort-btn${ativo ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => aoOrdenar(campo)}
        aria-label={`Ordenar por ${label.toLowerCase()}`}
        title={`Ordenar por ${label.toLowerCase()}`}
      >
        <span>{label}</span>
        {ativo && <Icon name={sortOrder === 'asc' ? 'up' : 'down'} size={11} />}
      </button>
    );
  }

  return (
    <div className={`queue${atualizando !== null ? ' is-updating' : ''}`}>
      <div className="queue__head">
        {renderColHeader('Nº', 'priority')}
        <span>Chamado</span>
        {renderColHeader('Espera', 'created_at', 'qcol--espera')}
        <span className="qcol--autor">Autor</span>
        <span className="qcol--cat">Categoria</span>
        {renderColHeader('Status', 'status', 'qcol--status')}
        <span className="qcol--acoes">Ações</span>
      </div>

      {chamados.map((c) => {
        const atrasado = chamadoAtrasado(c.created_at, c.status);
        return (
          <div key={c.id} className={`queue__row${atualizando === c.id ? ' is-updating' : ''}`}>
            <div className="queue__cell">
              <span className="queue__num" title={`Prioridade ${c.priority}`}>
                <Lamp cor={corPrioridade[c.priority]} acesa={c.priority === 'Alta'} size={8} />#
                {c.id}
              </span>
            </div>

            <div className="queue__cell">
              <div className="queue__title">
                <Link to={`/chamados/${c.id}`}>{c.title}</Link>
              </div>
              <div className="queue__submeta">
                <span>Prioridade {c.priority}</span>
                {c.responsavel && <span>· resp: {c.responsavel}</span>}
              </div>
            </div>

            <div className="queue__cell qcol--espera">
              <span className={`queue__wait${atrasado ? ' queue__wait--atrasada' : ''}`}>
                {tempoDecorrido(c.created_at)}
              </span>
            </div>

            <div className="queue__cell qcol--autor">
              <span className="u-mono queue__wait">{c.autor_do_chamado}</span>
            </div>

            <div className="queue__cell qcol--cat">
              <span className="queue__cat">{c.category}</span>
            </div>

            <div className="queue__cell qcol--status">
              <span className="queue__status">
                <Lamp cor={corStatus[c.status].cor} acesa={corStatus[c.status].acesa} size={8} />
                {c.status}
              </span>
            </div>

            <div className="queue__cell qcol--acoes">
              <div className="queue__actions">
                {pode && c.status === 'Aberto' && (
                  <button
                    className="btn btn--sm"
                    title="Assumir e marcar em andamento"
                    onClick={() => mover(c, 'Em andamento')}
                    disabled={atualizando === c.id}
                  >
                    {atualizando === c.id ? <Spinner size={13} /> : <Icon name="bolt" size={13} />}{' '}
                    Assumir
                  </button>
                )}
                {pode && c.status === 'Em andamento' && (
                  <button
                    className="btn btn--sm"
                    title="Resolver chamado"
                    onClick={() => mover(c, 'Resolvido')}
                    disabled={atualizando === c.id}
                  >
                    {atualizando === c.id ? <Spinner size={13} /> : <Icon name="check" size={13} />}{' '}
                    Resolver
                  </button>
                )}
                <button
                  className="btn btn--fantasma btn--sm"
                  title="Abrir chamado"
                  onClick={() => navigate(`/chamados/${c.id}`)}
                >
                  <Icon name="arrowRight" size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
