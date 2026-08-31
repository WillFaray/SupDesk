import type {
  Chamado, Comentario, FiltrosChamados, ListaChamados, LoginResponse, Usuario, UsuarioLogado,
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

const TOKEN_KEY = 'supdesk_token';
let token: string | null = localStorage.getItem(TOKEN_KEY);

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

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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