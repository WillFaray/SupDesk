// Cliente HTTP (lib/api.ts) com fetch simulado: headers, conversão de erros,
// logout automático em 401 e proteção da rota de login.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, definirAoNaoAutorizado, getToken, setToken } from './api';

const resposta = (status: number, corpo: unknown): Response =>
  ({ ok: status < 400, status, json: async () => corpo }) as Response;

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  definirAoNaoAutorizado(null);
});

describe('camada HTTP', () => {
  it('anexa Authorization quando há token e monta a query de filtros', async () => {
    setToken('meu-token');
    fetchMock.mockResolvedValue(resposta(200, { tickets: [] }));

    await api.listarChamados({ status: 'Aberto', page: 2, limit: 5 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chamados?status=Aberto&page=2&limit=5');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer meu-token');
  });

  it('não envia Authorization sem token e usa paginação padrão', async () => {
    fetchMock.mockResolvedValue(resposta(200, { tickets: [] }));

    await api.listarChamados();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chamados?page=1&limit=10');
    expect(init.headers as Record<string, string>).not.toHaveProperty('Authorization');
  });

  it('envia Content-Type junto do corpo JSON', async () => {
    fetchMock.mockResolvedValue(resposta(201, { id: 1 }));

    await api.criarChamado({
      title: 'Título',
      description: 'Descrição grande o bastante para passar',
      priority: 'Alta',
      category: 'Rede',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('converte erros HTTP em ApiError com a mensagem do corpo', async () => {
    fetchMock.mockResolvedValue(resposta(404, { error: 'Chamado não encontrado' }));

    const falha = await api.obterChamado(7).catch((e: unknown) => e);

    expect(falha).toBeInstanceOf(ApiError);
    expect(falha).toMatchObject({ status: 404, message: 'Chamado não encontrado' });
  });

  it('usa mensagem genérica quando o corpo de erro não é JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('html');
      },
    } as unknown as Response);

    await expect(api.listarUsuarios()).rejects.toMatchObject({
      status: 500,
      message: 'Erro 500',
    });
  });

  it('falha de rede vira ApiError com status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(api.listarUsuarios()).rejects.toMatchObject({
      status: 0,
      message: 'Falha de conexão com o servidor',
    });
  });

  it('401 com sessão ativa limpa o token e dispara o callback registrado', async () => {
    setToken('sessao-viva');
    const aoNaoAutorizado = vi.fn();
    definirAoNaoAutorizado(aoNaoAutorizado);
    fetchMock.mockResolvedValue(resposta(401, { error: 'Token revogado' }));

    await expect(api.listarChamados()).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(aoNaoAutorizado).toHaveBeenCalledOnce();
  });

  it('401 na rota de login NÃO desloga (credencial errada ≠ sessão expirada)', async () => {
    setToken('antigo');
    const aoNaoAutorizado = vi.fn();
    definirAoNaoAutorizado(aoNaoAutorizado);
    fetchMock.mockResolvedValue(resposta(401, { error: 'Credenciais inválidas' }));

    await expect(api.login('a@b.co', 'errada')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBe('antigo');
    expect(aoNaoAutorizado).not.toHaveBeenCalled();
  });

  it('logout chama a rota com o token atual', async () => {
    setToken('t-logout');
    fetchMock.mockResolvedValue(resposta(200, { message: 'ok' }));

    await api.logout();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t-logout');
  });
});
