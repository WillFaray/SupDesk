import type {
  Chamado, Comentario, FiltrosChamados, ListaChamados, LoginResponse, Usuario, UsuarioLogado,
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT) || 15_000;

const TOKEN_KEY = 'supdesk_token';
let token: string | null = localStorage.getItem(TOKEN_KEY);

/* --- Interceptor de sessão: centraliza o logout automático em 401 --- */
type AoNaoAutorizado = () => void;
let aoNaoAutorizado: AoNaoAutorizado | null = null;

/** Registra o callback disparado quando a API responde 401 com sessão ativa. */
export function definirAoNaoAutorizado(cb: AoNaoAutorizado | null) {
  aoNaoAutorizado = cb;
}

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Timeout central: aborta a requisição que exceder o limite configurado.
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controlador.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Sem resposta do servidor em ${Math.round(TIMEOUT_MS / 1000)}s`, 408);
    }
    throw new ApiError('Falha de conexão com o servidor', 0);
  } finally {
    clearTimeout(timer);
  }

  // 401 com sessão ativa significa token expirado/inválido → logout automático.
  // (A rota de login retorna 401 para credenciais erradas e não deve expulsar.)
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    setToken(null);
    aoNaoAutorizado?.();
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      message = (body as { error?: string; message?: string }).error
        || (body as { message?: string }).message
        || message;
    } catch { /* corpo não-JSON */ }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  login: (email: string, password: string) =>
    req<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  listarUsuarios: () => req<Usuario[]>('/usuarios'),

  listarChamados: (f: FiltrosChamados = {}) => {
    const params = new URLSearchParams();
    if (f.status) params.set('status', f.status);
    if (f.priority) params.set('priority', f.priority);
    if (f.category) params.set('category', f.category);
    params.set('page', String(f.page ?? 1));
    params.set('limit', String(f.limit ?? 10));
    return req<ListaChamados>(`/chamados?${params.toString()}`);
  },

  obterChamado: (id: number) => req<Chamado>(`/chamados/${id}`),

  criarChamado: (dados: { title: string; description: string; priority: string; category: string }) =>
    req<Chamado>('/chamados', { method: 'POST', body: JSON.stringify(dados) }),

  atualizarStatus: (id: number, status: string) =>
    req<Chamado>(`/chamados/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  excluirChamado: (id: number) => req<void>(`/chamados/${id}`, { method: 'DELETE' }),

  comentar: (id: number, message: string) =>
    req<{ comment: Comentario }>(`/chamados/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  listarComentarios: (id: number) => req<Comentario[]>(`/chamados/${id}/comentarios`),
};

export function usuarioDeLogin(u: UsuarioLogado) { return u; }

export { API_BASE };