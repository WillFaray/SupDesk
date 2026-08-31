import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, podeResolver } from '../lib/auth';
import { useChamados, atualizarStatus } from '../lib/data';
import { QueueTable } from '../components/QueueTable';
import { Icon } from '../components/Icon';
import type { Chamado, Status } from '../lib/types';

type Aba = 'todos' | 'meus' | 'abertos';

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'meus', label: 'Meus chamados' },
  { valor: 'abertos', label: 'Em aberto' },
];

const PRIORIDADES: (Chamado['priority'] | 'Todas')[] = ['Todas', 'Baixa', 'Média', 'Alta'];
const CATEGORIAS: (Chamado['category'] | 'Todas')[] = ['Todas', 'Hardware', 'Software', 'Rede', 'Outros'];

export function QueueView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('todos');
  const [prioridade, setPrioridade] = useState<Chamado['priority'] | 'Todas'>('Todas');
  const [categoria, setCategoria] = useState<Chamado['category'] | 'Todas'>('Todas');
  const [atualizando, setAtualizando] = useState<number | null>(null);

  const filtros = useMemo(() => ({
    status: aba === 'abertos' ? ('Aberto' as Status) : undefined,
    priority: prioridade === 'Todas' ? undefined : prioridade,
    category: categoria === 'Todas' ? undefined : categoria,
    limit: 50,
  }), [aba, prioridade, categoria]);

  const { data, error, loading, recarregar } = useChamados(filtros);

  // Aba "Meus chamados": chamados abertos pelo usuário ou atribuídos a ele.
  // (Para papel `usuario` a fila já traz só os próprios; o filtro cobre analista/admin.)
  const chamados = useMemo(() => {
    if (!data) return [];
    if (aba !== 'meus') return data.tickets;
    const me = user?.username;
    return data.tickets.filter((c) => c.autor_do_chamado === me || c.responsavel === me);
  }, [data, aba, user?.username]);

  const total = data ? (aba === 'meus' ? chamados.length : data.total) : null;

  async function mover(c: Chamado, novo: Status) {
    setAtualizando(c.id);
    try {
      await atualizarStatus(c.id, novo);
      await recarregar();
    } catch { /* mantém estado anterior */ } finally {
      setAtualizando(null);
    }
  }

  const pode = podeResolver(user?.role);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Chamados</h1>
          {total !== null && (
            <p className="page-head__sub">
              {total} {total === 1 ? 'chamado' : 'chamados'}
            </p>
          )}
        </div>
        <button className="btn btn--primario" onClick={() => navigate('/chamados/novo')}>
          <Icon name="plus" size={15} />
          Novo chamado
        </button>
      </div>

      <div className="filterbar">
        <div className="tabs" role="group" aria-label="Filtrar chamados">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              className="tab"
              aria-pressed={aba === a.valor}
              onClick={() => setAba(a.valor)}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="filters__selects">
          <select
            className="select"
            aria-label="Filtrar por categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Chamado['category'] | 'Todas')}
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="select"
            aria-label="Filtrar por prioridade"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as Chamado['priority'] | 'Todas')}
          >
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      {loading && !data && (
        <div className="panel-empty">
          <p><strong>Carregando…</strong></p>
        </div>
      )}

      {data && chamados.length === 0 && !loading && (
        <div className="panel-empty">
          <p><strong>Nenhum chamado</strong></p>
          <p>Nada com este filtro.</p>
          <p style={{ marginTop: 14 }}>
            <button className="btn btn--primario btn--sm" onClick={() => navigate('/chamados/novo')}>
              <Icon name="plus" size={14} /> Abrir chamado
            </button>
          </p>
        </div>
      )}

      {data && chamados.length > 0 && (
        <QueueTable chamados={chamados} atualizando={atualizando} pode={pode} mover={mover} />
      )}
    </div>
  );
}