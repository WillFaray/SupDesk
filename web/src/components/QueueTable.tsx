import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { corPrioridade, corStatus, Lamp } from './Lamp';
import { Icon } from './Icon';
import { Spinner } from './Loading';
import { tempoDecorrido } from '../lib/types';
import type { Chamado, Status } from '../lib/types';

export function QueueTable({
  chamados, atualizando, pode, mover,
}: {
  chamados: Chamado[];
  atualizando: number | null;
  pode: boolean;
  mover: (c: Chamado, novo: Status) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className={`queue${atualizando !== null ? ' is-updating' : ''}`}>
      <div className="queue__head">
        <span>Nº</span>
        <span>Chamado</span>
        <span className="qcol--espera">Espera</span>
        <span className="qcol--autor">Autor</span>
        <span className="qcol--cat">Categoria</span>
        <span className="qcol--status">Status</span>
        <span className="qcol--acoes">Ações</span>
      </div>

      {chamados.map((c) => {
        const atrasado = c.status !== 'Resolvido'
          && Date.now() - new Date(c.created_at).getTime() > 24 * 3600_000;
        return (
          <div key={c.id} className={`queue__row${atualizando === c.id ? ' is-updating' : ''}`}>
            <div className="queue__cell">
              <span className="queue__num">
                <Lamp cor={corPrioridade[c.priority]} acesa={c.priority === 'Alta'} size={8} />
                #{c.id}
              </span>
            </div>

            <div className="queue__cell">
              <div className="queue__title">
                <Link to={`/chamados/${c.id}`}>{c.title}</Link>
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
                    {atualizando === c.id ? <Spinner size={13} /> : <Icon name="bolt" size={13} />} Assumir
                  </button>
                )}
                {pode && c.status === 'Em andamento' && (
                  <button
                    className="btn btn--sm"
                    title="Resolver chamado"
                    onClick={() => mover(c, 'Resolvido')}
                    disabled={atualizando === c.id}
                  >
                    {atualizando === c.id ? <Spinner size={13} /> : <Icon name="check" size={13} />} Resolver
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