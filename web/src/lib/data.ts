import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api';
import { demoChamados, demoComentarios, demoUsuarios } from './demo';
import { IS_DEMO } from './auth';
import type { Chamado, Comentario, FiltrosChamados, ListaChamados, Usuario } from './types';

export const DEMO_LABEL = IS_DEMO;

/* ============================================================================
   Camada de dados — mesma interface para API real e modo demo.
   O modo demo (VITE_DEMO=true) devolve dados sintéticos ROTULADOS, apenas para
   permitir visualizar o produto sem o backend. A UI exibe o selo "Demo".
   ============================================================================ */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
let demoSeq = 10_000;

function demoStatus(f: FiltrosChamados) {
  let lista = [...demoChamados];
  if (f.status) lista = lista.filter((c) => c.status === f.status);
  if (f.priority) lista = lista.filter((c) => c.priority === f.priority);
  if (f.category) lista = lista.filter((c) => c.category === f.category);
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
        await delay(380);
        const lista = demoStatus(filtros);
        setData({
          paginaAtual: filtros.page ?? 1,
          limite: filtros.limit ?? 10,
          total: lista.length,
          tickets: lista,
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
      } else {
        const [c, cmts] = await Promise.all([api.obterChamado(id), api.listarComentarios(id)]);
        setData(c);
        setComentarios(cmts);
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

  return { data, comentarios, error, loading, recarregar: carregar };
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

/* Ações mutantes — retornam o chamado atualizado. */
export async function listarComentarios(id: number): Promise<Comentario[]> {
  if (IS_DEMO) {
    await delay(120);
    return demoComentarios[id] ?? [];
  }
  return api.listarComentarios(id);
}

export async function atualizarStatus(id: number, status: Chamado['status']): Promise<Chamado> {
  if (!IS_DEMO) return api.atualizarStatus(id, status);
  await delay(240);
  const c = demoChamados.find((x) => x.id === id);
  if (!c) throw new ApiError('Chamado não encontrado', 404);
  c.status = status;
  c.updated_at = new Date().toISOString();
  c.responsavel = c.responsavel ?? 'mariana.andrade';
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
  const c: Chamado = {
    id: ++demoSeq,
    title: dados.title,
    description: dados.description,
    status: 'Aberto',
    priority: dados.priority as Chamado['priority'],
    category: dados.category as Chamado['category'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    autor_do_chamado: 'você',
    responsavel: null,
  };
  demoChamados.unshift(c);
  return { ...c };
}

export async function comentarChamado(id: number, message: string): Promise<Comentario> {
  if (!IS_DEMO) return (await api.comentar(id, message)).comment;
  await delay(220);
  const c: Comentario = {
    id: ++demoSeq,
    message,
    created_at: new Date().toISOString(),
    autor_do_comentario: 'você',
    perfil_do_autor: 'usuario',
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
