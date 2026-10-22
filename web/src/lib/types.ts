export type Role = 'usuario' | 'analista' | 'admin';
export type Status = 'Aberto' | 'Em andamento' | 'Resolvido';
export type Prioridade = 'Baixa' | 'Média' | 'Alta';
export type Categoria = 'Hardware' | 'Software' | 'Rede' | 'Outros';
export type OrdenacaoCampo = 'created_at' | 'priority' | 'status';
export type OrdenacaoDirecao = 'asc' | 'desc';

export interface ResumoChamados {
  total: number;
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  altaPrioridade: number;
}

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
  totalPaginas?: number;
  resumo?: ResumoChamados;
  tickets: Chamado[];
}

export interface FiltrosChamados {
  status?: Status;
  priority?: Prioridade;
  category?: Categoria;
  q?: string;
  sortBy?: OrdenacaoCampo;
  sortOrder?: OrdenacaoDirecao;
  page?: number;
  limit?: number;
}

const PESO_PRIORIDADE: Record<Prioridade, number> = {
  Alta: 3,
  Média: 2,
  Baixa: 1,
};

const PESO_STATUS: Record<Status, number> = {
  Aberto: 1,
  'Em andamento': 2,
  Resolvido: 3,
};

export function filtrarChamadosTexto(lista: Chamado[], q?: string): Chamado[] {
  const termo = q?.trim().toLowerCase();
  if (!termo) return lista;
  const termoId = termo.startsWith('#') ? termo.slice(1).trim() : termo;
  return lista.filter(
    (c) =>
      c.title.toLowerCase().includes(termo) ||
      c.description.toLowerCase().includes(termo) ||
      c.autor_do_chamado.toLowerCase().includes(termo) ||
      (c.responsavel && c.responsavel.toLowerCase().includes(termo)) ||
      c.category.toLowerCase().includes(termo) ||
      (termoId.length > 0 && String(c.id).includes(termoId)),
  );
}

export function ordenarChamados(
  lista: Chamado[],
  sortBy: OrdenacaoCampo = 'created_at',
  sortOrder?: OrdenacaoDirecao,
): Chamado[] {
  const dir: OrdenacaoDirecao = sortOrder ?? (sortBy === 'status' ? 'asc' : 'desc');
  const fator = dir === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    if (sortBy === 'priority') {
      const diff = (PESO_PRIORIDADE[a.priority] - PESO_PRIORIDADE[b.priority]) * fator;
      if (diff !== 0) return diff;
    } else if (sortBy === 'status') {
      const diff = (PESO_STATUS[a.status] - PESO_STATUS[b.status]) * fator;
      if (diff !== 0) return diff;
    } else {
      const diff = (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * fator;
      if (diff !== 0) return diff;
    }
    const dataDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (dataDiff !== 0) return dataDiff;
    return b.id - a.id;
  });
}

export function calcularResumoChamados(lista: Chamado[]): ResumoChamados {
  let abertos = 0;
  let emAndamento = 0;
  let resolvidos = 0;
  let altaPrioridade = 0;
  for (const c of lista) {
    if (c.status === 'Aberto') abertos++;
    else if (c.status === 'Em andamento') emAndamento++;
    else if (c.status === 'Resolvido') resolvidos++;
    if (c.priority === 'Alta' && c.status !== 'Resolvido') altaPrioridade++;
  }
  return {
    total: lista.length,
    abertos,
    emAndamento,
    resolvidos,
    altaPrioridade,
  };
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

export function chamadoAtrasado(iso: string, status: Status): boolean {
  if (status === 'Resolvido') return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() > 24 * 3600_000;
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
