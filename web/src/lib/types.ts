export type Role = 'usuario' | 'analista' | 'admin';
export type Status = 'Aberto' | 'Em andamento' | 'Resolvido';
export type Prioridade = 'Baixa' | 'Média' | 'Alta';
export type Categoria = 'Hardware' | 'Software' | 'Rede' | 'Outros';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Chamado {
  id: number;
  user_id?: number;
  title: string;
  description: string;
  status: Status;
  priority: Prioridade;
  category: Categoria;
  created_at: string;
  updated_at: string;
  autor_do_chamado: string;
  responsavel: string | null;
  autor_role?: Role;
}

export interface Comentario {
  id: number;
  message: string;
  created_at: string;
  autor_do_comentario: string;
  perfil_do_autor: Role;
}

export interface UsuarioLogado {
  id: number;
  username: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: UsuarioLogado;
}

export interface ListaChamados {
  paginaAtual: number;
  limite: number;
  total: number;
  tickets: Chamado[];
}

export interface FiltrosChamados {
  status?: Status;
  priority?: Prioridade;
  category?: Categoria;
  page?: number;
  limit?: number;
}

export function txDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function tempoDecorrido(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const dias = Math.floor(h / 24);
  return `${dias}d ${h % 24}h`;
}

export function txHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}