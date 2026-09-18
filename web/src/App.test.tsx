// Integração do app: shell (Masthead/Rail), proteção de rotas e as views
// (fila, painel, usuários, abertura e detalhe de chamado) navegando de verdade
// com o router em memória. A camada de rede (lib/api) é mockada; a sessão
// persistida usa o localStorage real do jsdom.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/Toast';
import type { Chamado, Comentario, Usuario, UsuarioLogado } from './lib/types';

vi.mock('./lib/api', () => {
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
    setToken: vi.fn(),
    getToken: vi.fn(() => null),
    definirAoNaoAutorizado: vi.fn(),
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

import { api } from './lib/api';

const joao: UsuarioLogado = {
  id: 3,
  username: 'joao.silva',
  email: 'joao@empresa.com',
  role: 'usuario',
};
const mariana: UsuarioLogado = {
  id: 2,
  username: 'mariana.andrade',
  email: 'mariana@empresa.com',
  role: 'analista',
};
const ana: UsuarioLogado = {
  id: 1,
  username: 'ana.admin',
  email: 'ana@empresa.com',
  role: 'admin',
};

const chamado = (
  id: number,
  status: Chamado['status'] = 'Aberto',
  autor = 'joao.silva',
  priority: Chamado['priority'] = 'Média',
): Chamado => ({
  id,
  title: `Chamado ${id}`,
  description: 'Descrição detalhada do problema relatado pelo usuário.',
  status,
  priority,
  category: 'Outros',
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
  autor_do_chamado: autor,
  responsavel: null,
});

const comentario = (texto: string, autor = 'mariana.andrade'): Comentario => ({
  id: 1,
  message: texto,
  created_at: '2026-06-01T11:00:00Z',
  autor_do_comentario: autor,
  perfil_do_autor: 'analista',
});

function renderApp({
  rota = '/chamados',
  usuario,
}: { rota?: string; usuario?: UsuarioLogado } = {}) {
  if (usuario) localStorage.setItem('supdesk_user', JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Resposta neutra padrão: cada teste sobrescreve o que precisa ver.
  vi.mocked(api.listarChamados).mockResolvedValue({
    paginaAtual: 1,
    limite: 10,
    total: 0,
    tickets: [],
  });
  vi.mocked(api.listarUsuarios).mockResolvedValue([]);
  vi.mocked(api.listarComentarios).mockResolvedValue([]);
  vi.mocked(api.logout).mockResolvedValue(undefined);
});

describe('App — proteção de rotas', () => {
  it('sem sessão, rota protegida cai na tela de login', () => {
    renderApp({ rota: '/chamados' });

    expect(screen.getByRole('heading', { name: 'Acesso ao painel' })).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument();
    // Nada de chamados é buscado antes de autenticar.
    expect(api.listarChamados).not.toHaveBeenCalled();
  });

  it('usuário comum não recebe atalhos de triagem nem de administração na rail', async () => {
    renderApp({ rota: '/chamados', usuario: joao });

    expect(await screen.findByRole('heading', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chamados' })).toBeInTheDocument();
    // A rail só mostra o atalho para quem pode entrar na rota.
    expect(screen.queryByRole('link', { name: 'Em andamento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
  });

  it('usuário comum que digita /usuarios vê acesso negado e a lista nem é buscada', async () => {
    renderApp({ rota: '/usuarios', usuario: joao });

    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Esta área é restrita ao papel admin.');
    // O guard evita a chamada que o backend recusaria com 403.
    expect(api.listarUsuarios).not.toHaveBeenCalled();
  });

  it('analista também é barrado na área administrativa', async () => {
    renderApp({ rota: '/usuarios', usuario: mariana });

    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
    expect(api.listarUsuarios).not.toHaveBeenCalled();
  });
});

describe('App — fila de chamados', () => {
  it('mostra o shell completo e a fila do usuário autenticado', async () => {
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 50,
      total: 1,
      tickets: [chamado(101)],
    });

    renderApp({ usuario: joao });

    const cabecalho = screen.getByRole('banner');
    expect(within(cabecalho).getByText('joao.silva')).toBeInTheDocument();
    expect(within(cabecalho).getByText('usuario')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.getByText('1 chamado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chamado 101' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chamados' })).toBeInTheDocument();

    // Sem poder de resolução: nenhuma ação de triagem e sem atalhos de analista/admin.
    expect(screen.queryByRole('button', { name: /Assumir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Em andamento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
  });

  it('analista assume um chamado e a fila é recarregada com aviso de sucesso', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 50,
      total: 1,
      tickets: [chamado(101)],
    });
    vi.mocked(api.atualizarStatus).mockResolvedValue(chamado(101, 'Em andamento'));

    renderApp({ usuario: mariana });

    await usuario.click(await screen.findByRole('button', { name: /Assumir/ }));

    await waitFor(() => expect(api.atualizarStatus).toHaveBeenCalledWith(101, 'Em andamento'));
    await waitFor(() => expect(api.listarChamados).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Chamado #101 em "Em andamento".')).toBeInTheDocument();
  });

  it('mostra o estado vazio quando o filtro não devolve chamados', async () => {
    renderApp({ usuario: joao });

    expect(await screen.findByText('Nenhum chamado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir chamado/ })).toBeInTheDocument();
  });

  it('encerra a sessão pelo masthead e volta ao login', async () => {
    const usuario = userEvent.setup();
    renderApp({ usuario: joao });

    await usuario.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Acesso ao painel' })).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalled();
    expect(localStorage.getItem('supdesk_user')).toBeNull();
  });
});

describe('App — painel e administração', () => {
  it('analista abre o painel pela rail e vê a prévia do chat', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.listarChamados).mockResolvedValue({
      paginaAtual: 1,
      limite: 100,
      total: 2,
      tickets: [
        { ...chamado(201, 'Em andamento', 'mariana.andrade', 'Alta'), title: 'VPN cai toda hora' },
        { ...chamado(202, 'Em andamento', 'mariana.andrade', 'Baixa'), title: 'Troca de mouse' },
      ],
    });
    vi.mocked(api.listarComentarios).mockImplementation(async (id: number) =>
      id === 201 ? [comentario('Coletando logs do cliente.')] : [],
    );

    renderApp({ usuario: mariana });

    await usuario.click(await screen.findByRole('link', { name: 'Em andamento' }));

    expect(await screen.findByText('VPN cai toda hora')).toBeInTheDocument();
    expect(screen.getByText('Troca de mouse')).toBeInTheDocument();
    expect(screen.getByText('2 chamados em andamento com você')).toBeInTheDocument();
    expect(screen.getByLabelText('Prioridade Alta')).toBeInTheDocument();
    expect(screen.getByLabelText('Prioridade Média')).toBeInTheDocument();
    expect(await screen.findByText(/Coletando logs do cliente/)).toBeInTheDocument();
  });

  it('admin lista as credenciais do sistema pela rail', async () => {
    const usuario = userEvent.setup();
    const credenciais: Usuario[] = [
      {
        id: 1,
        username: 'ana.admin',
        email: 'ana@empresa.com',
        role: 'admin',
        created_at: '2026-05-01T09:00:00Z',
      },
    ];
    vi.mocked(api.listarUsuarios).mockResolvedValue(credenciais);

    renderApp({ usuario: ana });

    await usuario.click(await screen.findByRole('link', { name: 'Usuários' }));

    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
    expect(await screen.findByText('ana@empresa.com')).toBeInTheDocument();
    expect(screen.getByText('1 credenciais no sistema')).toBeInTheDocument();
    // `ana.admin` também aparece no masthead: valida a linha da tabela por escopo.
    const tabela = screen.getByText('ana@empresa.com').closest('.utable') as HTMLElement;
    expect(within(tabela).getByText('ana.admin')).toBeInTheDocument();
    expect(within(tabela).getByText('admin')).toBeInTheDocument();
  });
});

describe('App — abertura e detalhe do chamado', () => {
  it('valida o formulário e, com dados válidos, abre o chamado e vai ao detalhe', async () => {
    const usuario = userEvent.setup();
    const novo = { ...chamado(321), title: 'Notebook não liga' };
    vi.mocked(api.criarChamado).mockResolvedValue(novo);
    vi.mocked(api.obterChamado).mockResolvedValue(novo);

    renderApp({ rota: '/chamados/novo', usuario: joao });

    await usuario.click(screen.getByRole('button', { name: /Abrir chamado/ }));
    expect(screen.getByText('Título é obrigatório.')).toBeInTheDocument();
    expect(screen.getByText('Descrição deve ter ao menos 10 caracteres.')).toBeInTheDocument();
    expect(api.criarChamado).not.toHaveBeenCalled();

    await usuario.type(screen.getByLabelText(/Título/), 'Notebook não liga');
    await usuario.type(screen.getByLabelText(/Descrição/), 'Não liga desde a última atualização');
    await usuario.click(screen.getByRole('button', { name: /Abrir chamado/ }));

    await waitFor(() =>
      expect(api.criarChamado).toHaveBeenCalledWith({
        title: 'Notebook não liga',
        description: 'Não liga desde a última atualização',
        priority: 'Média',
        category: 'Outros',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Notebook não liga' })).toBeInTheDocument();
    expect(await screen.findByText('Chamado #321 aberto.')).toBeInTheDocument();
  });

  it('detalhe mostra a thread e permite ao analista iniciar o atendimento', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.obterChamado).mockResolvedValue({ ...chamado(55), title: 'VPN cai toda hora' });
    vi.mocked(api.listarComentarios).mockResolvedValue([comentario('Reiniciou o equipamento?')]);
    vi.mocked(api.atualizarStatus).mockResolvedValue({ ...chamado(55, 'Em andamento') });

    renderApp({ rota: '/chamados/55', usuario: mariana });

    expect(await screen.findByRole('heading', { name: 'VPN cai toda hora' })).toBeInTheDocument();
    expect(screen.getByText('Registro de interações · 1')).toBeInTheDocument();
    expect(screen.getByText('Reiniciou o equipamento?')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Assumir e iniciar/ }));

    await waitFor(() => expect(api.atualizarStatus).toHaveBeenCalledWith(55, 'Em andamento'));
    expect(screen.queryByRole('button', { name: /Excluir chamado/ })).not.toBeInTheDocument();
  });

  it('admin exclui o chamado pelo modal e volta para a fila', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.obterChamado).mockResolvedValue({ ...chamado(77), title: 'Mouse defeituoso' });
    vi.mocked(api.excluirChamado).mockResolvedValue(undefined);

    renderApp({ rota: '/chamados/77', usuario: ana });

    await usuario.click(await screen.findByRole('button', { name: /Excluir chamado/ }));
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.excluirChamado).toHaveBeenCalledWith(77));
    expect(await screen.findByRole('heading', { name: 'Chamados' })).toBeInTheDocument();
    expect(await screen.findByText('Chamado #77 excluído.')).toBeInTheDocument();
  });
});
