import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api';
import { demoChamados, demoComentarios, demoHistorico, demoUsuarios } from './demo';
import { IS_DEMO } from './auth';
import {
  calcularResumoChamados,
  filtrarChamadosTexto,
  ordenarChamados,
  type Chamado,
  type Comentario,
  type EventoChamado,
  type FiltrosChamados,
  type ListaChamados,
  type Role,
  type Usuario,
} from './types';

export const DEMO_LABEL = IS_DEMO;

// Camada de dados: mesma interface para API real e modo demo (VITE_DEMO=true,
// dados sintéticos rotulados com selo "Demo" na UI).

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
let demoSeq = 10_000;

function demoStatus(f: FiltrosChamados) {
  let lista = [...demoChamados];
  if (f.status) lista = lista.filter((c) => c.status === f.status);
  if (f.priority) lista = lista.filter((c) => c.priority === f.priority);
  if (f.category) lista = lista.filter((c) => c.category === f.category);
  if (f.q) lista = filtrarChamadosTexto(lista, f.q);
  lista = ordenarChamados(lista, f.sortBy ?? 'created_at', f.sortOrder);
  return lista;
}

export function useChamados(filtros: FiltrosChamados = {}) {
  const [data, setData] = useState<ListaChamados | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(filtros);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_DEMO) {
        await delay(280);
        const listaFiltrada = demoStatus(filtros);
        const paginaAtual = Math.max(1, filtros.page ?? 1);
        const limite = Math.max(1, filtros.limit ?? 10);
        const inicio = (paginaAtual - 1) * limite;
        const paginados = listaFiltrada.slice(inicio, inicio + limite);
        setData({
          paginaAtual,
          limite,
          total: listaFiltrada.length,
          totalPaginas: Math.max(1, Math.ceil(listaFiltrada.length / limite)),
          resumo: calcularResumoChamados(demoChamados),
          tickets: paginados,
        });
      } else {
        const r = await api.listarChamados(filtros);
        setData(r);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao carregar a fila');
    } finally {
      setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { data, error, loading, recarregar: carregar };
}

export function useChamado(id: number) {
  const [data, setData] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historico, setHistorico] = useState<EventoChamado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_DEMO) {
        await delay(280);
        const c = demoChamados.find((x) => x.id === id);
        if (!c) throw new ApiError('Chamado não encontrado', 404);
        setData(c);
        setComentarios(demoComentarios[id] ?? []);
        setHistorico(demoHistorico[id] ?? []);
      } else {
        const [c, cmts, hist] = await Promise.all([
          api.obterChamado(id),
          api.listarComentarios(id),
          api.listarHistorico(id).catch(() => []),
        ]);
        setData(c);
        setComentarios(cmts);
        setHistorico(hist);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao carregar o chamado');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { data, comentarios, historico, error, loading, recarregar: carregar };
}
export function useUsuarios() {
  const [data, setData] = useState<Usuario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_DEMO) {
        await delay(300);
        setData(demoUsuarios);
      } else {
        const r = await api.listarUsuarios();
        setData(r);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { data, error, loading, recarregar: carregar };
}

export async function listarComentarios(id: number): Promise<Comentario[]> {
  if (IS_DEMO) {
    await delay(120);
    return demoComentarios[id] ?? [];
  }
  return api.listarComentarios(id);
}

export async function listarHistorico(id: number): Promise<EventoChamado[]> {
  if (IS_DEMO) {
    await delay(120);
    return demoHistorico[id] ?? [];
  }
  return api.listarHistorico(id);
}

export async function atualizarStatus(
  id: number,
  status: Chamado['status'],
  responsavel?: string,
  opcoes?: { resolucao?: string; motivo?: string },
): Promise<Chamado> {
  if (!IS_DEMO) {
    return opcoes ? api.atualizarStatus(id, status, opcoes) : api.atualizarStatus(id, status);
  }
  await delay(240);
  const c = demoChamados.find((x) => x.id === id);
  if (!c) throw new ApiError('Chamado não encontrado', 404);
  const statusAnterior = c.status;
  c.status = status;
  const agora = new Date().toISOString();
  c.updated_at = agora;

  let respNome = responsavel;
  if (!respNome) {
    try {
      const raw = localStorage.getItem('supdesk_user');
      if (raw) respNome = (JSON.parse(raw) as { username?: string }).username;
    } catch {
      // fallback quando localStorage estiver vazio ou inválido
    }
  }
  const autorNome = respNome ?? 'carlos.menezes';

  if (status === 'Em andamento') {
    c.responsavel = autorNome;
    if (!c.primeiro_atendimento_em) {
      c.primeiro_atendimento_em = agora;
    }
  } else if (status === 'Resolvido') {
    c.responsavel = c.responsavel ?? autorNome;
    if (!c.primeiro_atendimento_em) {
      c.primeiro_atendimento_em = agora;
    }
    c.resolvido_em = agora;
    c.resolvido_por = autorNome;
    c.resolucao = opcoes?.resolucao ?? 'Atendimento finalizado com sucesso.';
  } else if (status === 'Aberto') {
    c.responsavel = null;
    c.resolvido_em = null;
    c.resolvido_por = null;
    c.resolucao = null;
  }

  const tipoEvento: EventoChamado['tipo'] =
    status === 'Resolvido'
      ? 'resolvido'
      : status === 'Em andamento'
        ? statusAnterior === 'Resolvido'
          ? 'reaberto'
          : 'assumido'
        : statusAnterior === 'Resolvido'
          ? 'reaberto'
          : 'devolvido';

  const novoEvento: EventoChamado = {
    id: ++demoSeq,
    tipo: tipoEvento,
    status_anterior: statusAnterior,
    status_novo: status,
    detalhe: status === 'Resolvido' ? (opcoes?.resolucao ?? null) : (opcoes?.motivo ?? null),
    created_at: agora,
    autor: autorNome,
    perfil_do_autor: 'analista',
  };
  demoHistorico[id] = [...(demoHistorico[id] ?? []), novoEvento];

  return { ...c };
}

export async function criarChamado(dados: {
  title: string;
  description: string;
  priority: string;
  category: string;
}): Promise<Chamado> {
  if (!IS_DEMO) return api.criarChamado(dados);
  await delay(340);
  const agora = new Date().toISOString();
  const c: Chamado = {
    id: ++demoSeq,
    title: dados.title,
    description: dados.description,
    status: 'Aberto',
    priority: dados.priority as Chamado['priority'],
    category: dados.category as Chamado['category'],
    created_at: agora,
    updated_at: agora,
    autor_do_chamado: 'você',
    responsavel: null,
    primeiro_atendimento_em: null,
    resolvido_em: null,
    resolvido_por: null,
    resolucao: null,
  };
  demoChamados.unshift(c);
  demoHistorico[c.id] = [
    {
      id: ++demoSeq,
      tipo: 'criado',
      status_anterior: null,
      status_novo: 'Aberto',
      detalhe: null,
      created_at: agora,
      autor: 'você',
      perfil_do_autor: 'usuario',
    },
  ];
  return { ...c };
}

export async function comentarChamado(id: number, message: string): Promise<Comentario> {
  if (!IS_DEMO) return (await api.comentar(id, message)).comment;
  await delay(220);
  let autorNome = 'você';
  let autorPerfil: Role = 'usuario';
  try {
    const raw = localStorage.getItem('supdesk_user');
    if (raw) {
      const u = JSON.parse(raw) as { username?: string; role?: Role };
      if (u.username) autorNome = u.username;
      if (u.role) autorPerfil = u.role;
    }
  } catch {
    // fallback quando localStorage estiver vazio ou inválido
  }
  const c: Comentario = {
    id: ++demoSeq,
    message,
    created_at: new Date().toISOString(),
    autor_do_comentario: autorNome,
    perfil_do_autor: autorPerfil,
  };
  demoComentarios[id] = [...(demoComentarios[id] ?? []), c];
  return c;
}

export async function excluirChamado(id: number): Promise<void> {
  if (!IS_DEMO) return api.excluirChamado(id);
  await delay(200);
  const i = demoChamados.findIndex((x) => x.id === id);
  if (i === -1) throw new ApiError('Chamado não encontrado', 404);
  demoChamados.splice(i, 1);
}

export function useContagemStatus() {
  const { data } = useChamados({ limit: 100 });
  return useMemo(() => {
    const contagem = { Aberto: 0, 'Em andamento': 0, Resolvido: 0 } as Record<
      Chamado['status'],
      number
    >;
    for (const c of data?.tickets ?? []) contagem[c.status] += 1;
    return contagem;
  }, [data]);
}
