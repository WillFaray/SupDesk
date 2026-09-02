import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useChamados, listarComentarios } from '../lib/data';
import { corPrioridade, Lamp } from '../components/Lamp';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import type { Comentario, Prioridade } from '../lib/types';

const COLUNAS: Prioridade[] = ['Alta', 'Média', 'Baixa'];

function espera(from: string): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(from).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function BoardView() {
  const { user } = useAuth();
  const { data, error, loading } = useChamados({ status: 'Em andamento', limit: 100 });
  const [chats, setChats] = useState<Record<number, Comentario[]>>({});

  // Quadro mostra os chamados em andamento em que o usuário é responsável ou autor.
  const meus = useMemo(() => {
    if (!data) return [];
    const me = user?.username;
    return data.tickets.filter((c) => c.responsavel === me || c.autor_do_chamado === me);
  }, [data, user?.username]);

  // Prévia do chat: última mensagem de cada chamado do quadro.
  useEffect(() => {
    let vivo = true;
    for (const c of meus) {
      if (chats[c.id]) continue;
      listarComentarios(c.id)
        .then((cs) => { if (vivo) setChats((prev) => ({ ...prev, [c.id]: cs })); })
        .catch(() => { /* silencioso: prévia é opcional */ });
    }
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meus.map((c) => c.id).join(',')]);

  function ultimaMsg(id: number): Comentario | null {
    const cs = chats[id];
    return cs && cs.length > 0 ? cs[cs.length - 1] : null;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Meu painel</h1>
          <p className="page-head__sub">
            {meus.length} {meus.length === 1 ? 'chamado em andamento' : 'chamados em andamento'} com você
          </p>
        </div>
      </div>

      {error && (
        <p className="field__error" role="alert"><Icon name="alert" size={14} /> {error}</p>
      )}

      {loading && !data && (
        <Loading label="Carregando painel…" />
      )}

      {data && meus.length === 0 && !loading && (
        <div className="panel-empty">
          <Icon name="check" size={28} />
          <p><strong>Nada em andamento</strong></p>
          <p>Nenhum chamado em andamento com você como responsável ou autor.</p>
        </div>
      )}

      {data && meus.length > 0 && (
        <div className="board">
          {COLUNAS.map((prio) => {
            const cartoes = meus.filter((c) => c.priority === prio);
            return (
              <section className="board__col" key={prio} aria-label={`Prioridade ${prio}`}>
                <header className="board__colhead">
                  <Lamp cor={corPrioridade[prio]} size={8} />
                  <span>{prio}</span>
                  <span className="board__count">{cartoes.length}</span>
                </header>

                {cartoes.length === 0 && (
                  <p className="board__vazio">—</p>
                )}

                {cartoes.map((c) => {
                  const msg = ultimaMsg(c.id);
                  return (
                    <Link to={`/chamados/${c.id}`} className="board__card" key={c.id}>
                      <div className="board__card-top">
                        <span className="board__id">#{c.id}</span>
                        <span className="board__cat">{c.category}</span>
                      </div>
                      <h3 className="board__titulo">{c.title}</h3>

                      {msg && (
                        <div className="board__chat">
                          <p className="board__chat-msg">
                            <span className="board__chat-autor">{msg.autor_do_comentario}:</span>{' '}
                            {msg.message.length > 90 ? msg.message.slice(0, 90) + '…' : msg.message}
                          </p>
                        </div>
                      )}

                      <div className="board__foot">
                        <span className="board__meta">{c.autor_do_chamado}</span>
                        <span className="board__meta board__meta--espera">
                          <Icon name="clock" size={12} /> {espera(c.created_at)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}