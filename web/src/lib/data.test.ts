// Hooks da camada de dados (lib/data.ts) contra a API mockada:
// estados de carregamento/erro, recarga e as funções de escrita.
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  comentarChamado,
  criarChamado,
  excluirChamado,
  atualizarStatus,
  listarComentarios,
  useChamado,
  useChamados,
  useContagemStatus,
  useUsuarios,
} from './data';
import { api, ApiError } from './api';
import type { Chamado, Comentario, Usuario } from './types';

// Mantém ApiError real (usado em instanceof); mocka apenas as chamadas de rede.
vi.mock('./api', () => {
  class ApiErrorFalso extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
  return {
    ApiError: ApiErrorFalso,
    api: {
      login: vi.fn(),
      logout: vi.fn(),
      listarUsuarios: vi.fn(),
      listarChamados: vi.fn(),
      obterChamado: vi.fn(),
      criarChamado: vi.fn(),
      atualizarStatus: vi.fn(),
      excluirChamado: vi.fn(),
      comentar: vi.fn(),
      listarComentarios: vi.fn(),
    },
  };
});

const chamado = (id: number, status: Chamado['status'] = 'Aberto'): Chamado => ({
  id,
  title: `Chamado ${id}`,
  description: 'Descrição do chamado',
  status,
  priority: 'Média',
  category: 'Outros',
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
  autor_do_chamado: 'joao',
  responsavel: null,
});

const comentario: Comentario = {
  id: 1,
  message: 'Reiniciou?',
  created_at: '2026-06-01T11:00:00Z',
  autor_do_comentario: 'ana',
  perfil_do_autor: 'analista',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useChamados', () => {
  it('começa carregando e entrega a lista quando a API responde', async () => {
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 10,
      total: 1,
      tickets: [chamado(1)],
    });

    const { result } = renderHook(() => useChamados());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data?.tickets[0]?.title).toBe('Chamado 1');
  });

  it('repassa os filtros para a API', async () => {
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 10,
      total: 0,
      tickets: [],
    });

    renderHook(() => useChamados({ status: 'Aberto', priority: 'Alta' }));

    await waitFor(() =>
      expect(api.listarChamados).toHaveBeenCalledWith({
        status: 'Aberto',
        priority: 'Alta',
      }),
    );
  });

  it('expõe a mensagem da ApiError quando a requisição falha', async () => {
    vi.mocked(api.listarChamados).mockRejectedValue(new ApiError('Falha 500', 500));

    const { result } = renderHook(() => useChamados());

    await waitFor(() => expect(result.current.error).toBe('Falha 500'));
    expect(result.current.data).toBeNull();
  });

  it('traduz erro desconhecido para mensagem amigável', async () => {
    vi.mocked(api.listarChamados).mockRejectedValue(new Error('qualquer coisa'));

    const { result } = renderHook(() => useChamados());

    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar a fila'));
  });

  it('recarregar busca os dados novamente', async () => {
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 10,
      total: 0,
      tickets: [],
    });

    const { result } = renderHook(() => useChamados());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.recarregar();
    await waitFor(() => expect(api.listarChamados).toHaveBeenCalledTimes(2));
  });
});

describe('useChamado', () => {
  it('carrega o chamado e os comentários juntos', async () => {
    vi.mocked(api.obterChamado).mockResolvedValue(chamado(7));
    vi.mocked(api.listarComentarios).mockResolvedValue([comentario]);

    const { result } = renderHook(() => useChamado(7));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.id).toBe(7);
    expect(result.current.comentarios).toEqual([comentario]);
  });

  it('registra erro quando o chamado não existe', async () => {
    vi.mocked(api.obterChamado).mockRejectedValue(new ApiError('Chamado não encontrado', 404));
    vi.mocked(api.listarComentarios).mockResolvedValue([]);

    const { result } = renderHook(() => useChamado(999));

    await waitFor(() => expect(result.current.error).toBe('Chamado não encontrado'));
  });
});

describe('useContagemStatus', () => {
  it('conta os chamados por status do painel', async () => {
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 100,
      total: 3,
      tickets: [chamado(1), chamado(2), chamado(3, 'Resolvido')],
    });

    const { result } = renderHook(() => useContagemStatus());

    await waitFor(() =>
      expect(result.current).toEqual({
        Aberto: 2,
        'Em andamento': 0,
        Resolvido: 1,
      }),
    );
  });
});

describe('useUsuarios', () => {
  it('entrega as credenciais do sistema quando a API responde', async () => {
    const usuarios: Usuario[] = [
      {
        id: 1,
        username: 'ana.admin',
        email: 'ana@empresa.com',
        role: 'admin',
        created_at: '2026-05-01T09:00:00Z',
      },
    ];
    vi.mocked(api.listarUsuarios).mockResolvedValue(usuarios);

    const { result } = renderHook(() => useUsuarios());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(usuarios));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('traduz falha desconhecida para mensagem amigável', async () => {
    vi.mocked(api.listarUsuarios).mockRejectedValue(new Error('sem rede'));

    const { result } = renderHook(() => useUsuarios());

    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar usuários'));
    expect(result.current.data).toBeNull();
  });
});

describe('funções de escrita', () => {
  it('comentarChamado devolve o comentário criado', async () => {
    vi.mocked(api.comentar).mockResolvedValue({ comment: comentario });

    const criado = await comentarChamado(1, 'Reiniciou?');

    expect(api.comentar).toHaveBeenCalledWith(1, 'Reiniciou?');
    expect(criado).toEqual(comentario);
  });

  it('atualizarStatus repassa o novo status para a API', async () => {
    vi.mocked(api.atualizarStatus).mockResolvedValue(chamado(3, 'Resolvido'));

    const atualizado = await atualizarStatus(3, 'Resolvido');

    expect(api.atualizarStatus).toHaveBeenCalledWith(3, 'Resolvido');
    expect(atualizado.status).toBe('Resolvido');
  });

  it('criarChamado envia os dados do formulário e devolve o chamado aberto', async () => {
    const dados = {
      title: 'Notebook não liga',
      description: 'Desde a atualização não liga de jeito nenhum',
      priority: 'Alta',
      category: 'Hardware',
    };
    vi.mocked(api.criarChamado).mockResolvedValue(chamado(321));

    const criado = await criarChamado(dados);

    expect(api.criarChamado).toHaveBeenCalledWith(dados);
    expect(criado.id).toBe(321);
  });

  it('excluirChamado delega a remoção para a API', async () => {
    vi.mocked(api.excluirChamado).mockResolvedValue(undefined);

    await excluirChamado(5);

    expect(api.excluirChamado).toHaveBeenCalledWith(5);
  });

  it('listarComentarios devolve a thread do chamado', async () => {
    vi.mocked(api.listarComentarios).mockResolvedValue([comentario]);

    await expect(listarComentarios(7)).resolves.toEqual([comentario]);
    expect(api.listarComentarios).toHaveBeenCalledWith(7);
  });
});
