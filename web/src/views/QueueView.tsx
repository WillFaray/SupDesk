import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, podeResolver } from '../lib/auth';
import { useChamados, atualizarStatus } from '../lib/data';
import { QueueTable } from '../components/QueueTable';
import { FilterSelect } from '../components/FilterSelect';
import { ModalResolucao } from '../components/ModalResolucao';
import { Lamp } from '../components/Lamp';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import { useToast } from '../components/Toast';
import {
  calcularResumoChamados,
  filtrarChamadosTexto,
  ordenarChamados,
  type Chamado,
  type OrdenacaoCampo,
  type OrdenacaoDirecao,
  type Status,
} from '../lib/types';

type Aba = 'todos' | 'meus' | 'abertos' | 'andamento' | 'resolvidos';
type OpcaoOrdenacao =
  'recentes' | 'antigos' | 'prioridade_desc' | 'prioridade_asc' | 'status_asc' | 'status_desc';

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'meus', label: 'Meus chamados' },
  { valor: 'abertos', label: 'Em aberto' },
  { valor: 'andamento', label: 'Em andamento' },
  { valor: 'resolvidos', label: 'Resolvidos' },
];

const PRIORIDADES: (Chamado['priority'] | 'Todas')[] = ['Todas', 'Baixa', 'Média', 'Alta'];
const CATEGORIAS: (Chamado['category'] | 'Todas')[] = [
  'Todas',
  'Hardware',
  'Software',
  'Rede',
  'Outros',
];

const ORDENACOES: { valor: OpcaoOrdenacao; label: string }[] = [
  { valor: 'recentes', label: 'Mais recentes' },
  { valor: 'antigos', label: 'Mais antigos' },
  { valor: 'prioridade_desc', label: 'Prioridade: Alta → Baixa' },
  { valor: 'prioridade_asc', label: 'Prioridade: Baixa → Alta' },
  { valor: 'status_asc', label: 'Status: Aberto → Resolvido' },
  { valor: 'status_desc', label: 'Status: Resolvido → Aberto' },
];

const LIMITES_PAGINA: { valor: string; label: string }[] = [
  { valor: '10', label: '10 / pág.' },
  { valor: '25', label: '25 / pág.' },
  { valor: '50', label: '50 / pág.' },
];

function decodificarOrdenacao(op: OpcaoOrdenacao): {
  sortBy: OrdenacaoCampo;
  sortOrder: OrdenacaoDirecao;
} {
  switch (op) {
    case 'antigos':
      return { sortBy: 'created_at', sortOrder: 'asc' };
    case 'prioridade_desc':
      return { sortBy: 'priority', sortOrder: 'desc' };
    case 'prioridade_asc':
      return { sortBy: 'priority', sortOrder: 'asc' };
    case 'status_asc':
      return { sortBy: 'status', sortOrder: 'asc' };
    case 'status_desc':
      return { sortBy: 'status', sortOrder: 'desc' };
    case 'recentes':
    default:
      return { sortBy: 'created_at', sortOrder: 'desc' };
  }
}

function statusDaAba(aba: Aba): Status | undefined {
  if (aba === 'abertos') return 'Aberto';
  if (aba === 'andamento') return 'Em andamento';
  if (aba === 'resolvidos') return 'Resolvido';
  return undefined;
}

export function QueueView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const queryUrl = searchParams.get('q') ?? '';
  const [aba, setAba] = useState<Aba>('todos');
  const [prioridade, setPrioridade] = useState<Chamado['priority'] | 'Todas'>('Todas');
  const [categoria, setCategoria] = useState<Chamado['category'] | 'Todas'>('Todas');
  const [busca, setBusca] = useState<string>(queryUrl);
  const [prevQueryUrl, setPrevQueryUrl] = useState<string>(queryUrl);
  const [ordenacao, setOrdenacao] = useState<OpcaoOrdenacao>('recentes');
  const [pagina, setPagina] = useState<number>(1);
  const [limite, setLimite] = useState<number>(50);
  const [atualizando, setAtualizando] = useState<number | null>(null);
  const [chamadoParaResolver, setChamadoParaResolver] = useState<Chamado | null>(null);
  const [recarregandoManual, setRecarregandoManual] = useState(false);

  // Sincroniza quando o usuário pesquisa pelo SearchBox do cabeçalho (?q=...).
  if (queryUrl !== prevQueryUrl) {
    setPrevQueryUrl(queryUrl);
    setBusca(queryUrl);
    setPagina(1);
  }

  const { sortBy, sortOrder } = decodificarOrdenacao(ordenacao);
  const statusFiltro = statusDaAba(aba);
  const termoBusca = busca.trim();

  const filtros = useMemo(() => {
    const base: {
      status?: Status;
      priority?: Chamado['priority'];
      category?: Chamado['category'];
      q?: string;
      sortBy?: OrdenacaoCampo;
      sortOrder?: OrdenacaoDirecao;
      page?: number;
      limit: number;
    } = {
      status: statusFiltro,
      priority: prioridade === 'Todas' ? undefined : prioridade,
      category: categoria === 'Todas' ? undefined : categoria,
      limit: limite,
    };
    if (termoBusca) base.q = termoBusca;
    if (ordenacao !== 'recentes') {
      base.sortBy = sortBy;
      base.sortOrder = sortOrder;
    }
    if (pagina > 1) base.page = pagina;
    return base;
  }, [
    statusFiltro,
    prioridade,
    categoria,
    limite,
    termoBusca,
    ordenacao,
    sortBy,
    sortOrder,
    pagina,
  ]);

  const { data, error, loading, recarregar } = useChamados(filtros);

  // Aplica escopo "Meus chamados", busca textual e ordenação consistente.
  const chamados = useMemo(() => {
    if (!data) return [];
    let lista = data.tickets;
    if (statusFiltro) {
      lista = lista.filter((c) => c.status === statusFiltro);
    }
    if (aba === 'meus') {
      const me = user?.username;
      lista = lista.filter((c) => c.autor_do_chamado === me || c.responsavel === me);
    }
    if (prioridade !== 'Todas') {
      lista = lista.filter((c) => c.priority === prioridade);
    }
    if (categoria !== 'Todas') {
      lista = lista.filter((c) => c.category === categoria);
    }
    if (termoBusca) {
      lista = filtrarChamadosTexto(lista, termoBusca);
    }
    return ordenarChamados(lista, sortBy, sortOrder);
  }, [
    data,
    statusFiltro,
    aba,
    user?.username,
    prioridade,
    categoria,
    termoBusca,
    sortBy,
    sortOrder,
  ]);

  const resumo = useMemo(() => {
    if (data?.resumo) return data.resumo;
    return calcularResumoChamados(data?.tickets ?? []);
  }, [data]);

  const total = data
    ? aba === 'meus' || (termoBusca && !data.resumo)
      ? chamados.length
      : statusFiltro && data.resumo
        ? statusFiltro === 'Aberto'
          ? data.resumo.abertos
          : statusFiltro === 'Em andamento'
            ? data.resumo.emAndamento
            : data.resumo.resolvidos
        : data.total
    : null;

  const totalPaginas = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, data?.totalPaginas ?? Math.ceil(total / limite));
  }, [total, data?.totalPaginas, limite]);

  const temFiltrosAtivos =
    aba !== 'todos' ||
    prioridade !== 'Todas' ||
    categoria !== 'Todas' ||
    termoBusca.length > 0 ||
    ordenacao !== 'recentes';

  function atualizarBusca(valor: string) {
    setBusca(valor);
    setPagina(1);
    if (!valor.trim() && searchParams.has('q')) {
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      setSearchParams(next, { replace: true });
    }
  }

  function limparFiltros() {
    setAba('todos');
    setPrioridade('Todas');
    setCategoria('Todas');
    setBusca('');
    setOrdenacao('recentes');
    setPagina(1);
    if (searchParams.has('q')) {
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      setSearchParams(next, { replace: true });
    }
    toast.info('Filtros limpos.');
  }

  function alternarOrdenacaoColuna(campo: OrdenacaoCampo) {
    setPagina(1);
    if (campo === 'created_at') {
      setOrdenacao((prev) => (prev === 'recentes' ? 'antigos' : 'recentes'));
    } else if (campo === 'priority') {
      setOrdenacao((prev) => (prev === 'prioridade_desc' ? 'prioridade_asc' : 'prioridade_desc'));
    } else {
      setOrdenacao((prev) => (prev === 'status_asc' ? 'status_desc' : 'status_asc'));
    }
  }

  async function atualizarFilaManual() {
    setRecarregandoManual(true);
    try {
      await recarregar();
      toast.info('Fila sincronizada.');
    } finally {
      setRecarregandoManual(false);
    }
  }

  async function mover(c: Chamado, novo: Status) {
    if (novo === 'Resolvido') {
      setChamadoParaResolver(c);
      return;
    }
    setAtualizando(c.id);
    try {
      await atualizarStatus(c.id, novo, user?.username);
      await recarregar();
      toast.sucesso(`Chamado #${c.id} em "${novo}".`);
    } catch {
      toast.erro(`Não foi possível atualizar o chamado #${c.id}.`);
    } finally {
      setAtualizando(null);
    }
  }

  async function confirmarResolucaoFila(resolucao: string) {
    if (!chamadoParaResolver) return;
    const cid = chamadoParaResolver.id;
    setAtualizando(cid);
    try {
      await atualizarStatus(cid, 'Resolvido', user?.username, { resolucao });
      await recarregar();
      toast.sucesso(`Chamado #${cid} em "Resolvido".`);
    } catch {
      toast.erro(`Não foi possível resolver o chamado #${cid}.`);
    } finally {
      setAtualizando(null);
      setChamadoParaResolver(null);
    }
  }

  const pode = podeResolver(user?.role);
  const inicioFaixa = total && total > 0 ? (pagina - 1) * limite + 1 : 0;
  const fimFaixa = total ? Math.min(total, (pagina - 1) * limite + chamados.length) : 0;

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
        <div className="page-head__actions">
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={atualizarFilaManual}
            disabled={loading || recarregandoManual}
            title="Sincronizar fila"
            aria-label="Sincronizar fila"
          >
            <Icon name="refresh" size={14} />
            Sincronizar
          </button>
          <button className="btn btn--primario" onClick={() => navigate('/chamados/novo')}>
            <Icon name="plus" size={15} />
            Novo chamado
          </button>
        </div>
      </div>

      {data && (
        <section className="qsummary" aria-label="Resumo operacional da fila">
          <button
            type="button"
            className={`qsummary__card${aba === 'abertos' ? ' is-active' : ''}`}
            onClick={() => {
              setAba((a) => (a === 'abertos' ? 'todos' : 'abertos'));
              setPagina(1);
            }}
          >
            <span className="qsummary__label">
              <Lamp cor="var(--lamp-aberto)" acesa size={8} />
              Aguardando triagem
            </span>
            <strong className="qsummary__val">{resumo.abertos}</strong>
          </button>

          <button
            type="button"
            className={`qsummary__card${aba === 'andamento' ? ' is-active' : ''}`}
            onClick={() => {
              setAba((a) => (a === 'andamento' ? 'todos' : 'andamento'));
              setPagina(1);
            }}
          >
            <span className="qsummary__label">
              <Lamp cor="var(--lamp-andamento)" acesa size={8} />
              Em atendimento
            </span>
            <strong className="qsummary__val">{resumo.emAndamento}</strong>
          </button>

          <button
            type="button"
            className={`qsummary__card${aba === 'resolvidos' ? ' is-active' : ''}`}
            onClick={() => {
              setAba((a) => (a === 'resolvidos' ? 'todos' : 'resolvidos'));
              setPagina(1);
            }}
          >
            <span className="qsummary__label">
              <Lamp cor="var(--lamp-resolvido)" acesa={false} size={8} />
              Concluídos
            </span>
            <strong className="qsummary__val">{resumo.resolvidos}</strong>
          </button>

          <button
            type="button"
            className={`qsummary__card${prioridade === 'Alta' ? ' is-active' : ''}`}
            onClick={() => {
              setPrioridade((p) => (p === 'Alta' ? 'Todas' : 'Alta'));
              setPagina(1);
            }}
          >
            <span className="qsummary__label">
              <Lamp cor="var(--lamp-vermelha)" acesa size={8} />
              Urgência alta
            </span>
            <strong className="qsummary__val">{resumo.altaPrioridade}</strong>
          </button>
        </section>
      )}

      <div className="filterbar">
        <div className="tabs" role="group" aria-label="Filtrar chamados">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              className="tab"
              aria-pressed={aba === a.valor}
              onClick={() => {
                setAba(a.valor);
                setPagina(1);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="filters__selects">
          <div className="qsearch">
            <Icon name="search" size={13} />
            <input
              type="search"
              value={busca}
              onChange={(e) => atualizarBusca(e.target.value)}
              placeholder="Buscar chamado ou #ID…"
              aria-label="Filtrar chamados por texto"
            />
            {busca && (
              <button
                type="button"
                className="qsearch__clear"
                onClick={() => atualizarBusca('')}
                aria-label="Limpar busca"
                title="Limpar busca"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>

          <FilterSelect
            label="Categoria"
            opcoes={CATEGORIAS.map((c) => ({ valor: c, label: c }))}
            valor={categoria}
            onChange={(v) => {
              setCategoria(v);
              setPagina(1);
            }}
          />
          <FilterSelect
            label="Prioridade"
            opcoes={PRIORIDADES.map((p) => ({ valor: p, label: p }))}
            valor={prioridade}
            onChange={(v) => {
              setPrioridade(v);
              setPagina(1);
            }}
          />
          <FilterSelect
            label="Ordenar"
            opcoes={ORDENACOES}
            valor={ordenacao}
            onChange={(v) => {
              setOrdenacao(v);
              setPagina(1);
            }}
          />
        </div>
      </div>

      {temFiltrosAtivos && (
        <div className="active-filters" aria-label="Filtros ativos">
          <span className="active-filters__label">Filtros ativos:</span>
          {aba !== 'todos' && (
            <span className="active-filters__tag">
              Visão: {ABAS.find((a) => a.valor === aba)?.label}
            </span>
          )}
          {categoria !== 'Todas' && (
            <span className="active-filters__tag">Categoria: {categoria}</span>
          )}
          {prioridade !== 'Todas' && (
            <span className="active-filters__tag">Prioridade: {prioridade}</span>
          )}
          {termoBusca && (
            <span className="active-filters__tag">Busca: &ldquo;{termoBusca}&rdquo;</span>
          )}
          {ordenacao !== 'recentes' && (
            <span className="active-filters__tag">
              Ordem: {ORDENACOES.find((o) => o.valor === ordenacao)?.label}
            </span>
          )}
          <button
            type="button"
            className="btn btn--fantasma btn--sm active-filters__clear"
            onClick={limparFiltros}
          >
            <Icon name="x" size={12} /> Limpar filtros
          </button>
        </div>
      )}

      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      {loading && !data && <Loading label="Carregando chamados…" />}

      {data && chamados.length === 0 && !loading && (
        <div className="panel-empty">
          <p>
            <strong>Nenhum chamado</strong>
          </p>
          <p>Nada com este filtro.</p>
          <p style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
            {temFiltrosAtivos && (
              <button className="btn btn--sm" onClick={limparFiltros}>
                <Icon name="x" size={14} /> Limpar filtros
              </button>
            )}
            <button
              className="btn btn--primario btn--sm"
              onClick={() => navigate('/chamados/novo')}
            >
              <Icon name="plus" size={14} /> Abrir chamado
            </button>
          </p>
        </div>
      )}

      {data && chamados.length > 0 && (
        <>
          <QueueTable
            chamados={chamados}
            atualizando={atualizando}
            pode={pode}
            mover={mover}
            sortBy={sortBy}
            sortOrder={sortOrder}
            aoOrdenar={alternarOrdenacaoColuna}
          />

          <nav className="qpagination" aria-label="Paginação da fila">
            <div className="qpagination__info">
              <span>
                Mostrando <strong>{inicioFaixa}</strong>–<strong>{fimFaixa}</strong> de{' '}
                <strong>{total}</strong>
              </span>
              <FilterSelect
                label="Itens por página"
                opcoes={LIMITES_PAGINA}
                valor={String(limite)}
                onChange={(v) => {
                  setLimite(Number(v));
                  setPagina(1);
                }}
              />
            </div>

            <div className="qpagination__controls">
              <button
                type="button"
                className="btn btn--sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                <Icon name="arrowLeft" size={13} /> Anterior
              </button>

              <span className="qpagination__pages">
                Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
              </span>

              <button
                type="button"
                className="btn btn--sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                Próxima <Icon name="arrowRight" size={13} />
              </button>
            </div>
          </nav>
        </>
      )}

      <ModalResolucao
        aberto={!!chamadoParaResolver}
        chamadoId={chamadoParaResolver?.id ?? 0}
        aoFechar={() => setChamadoParaResolver(null)}
        aoConfirmar={confirmarResolucaoFila}
      />
    </div>
  );
}
