// LoginView: validação de campos, sucesso (token + navegação) e erro da API.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginView } from './LoginView';
import { AuthProvider } from '../lib/auth';
import { ToastProvider } from '../components/Toast';

vi.mock('../lib/api', () => {
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
    definirAoNaoAutorizado: vi.fn(),
    api: { login: vi.fn() },
  };
});

import { api, ApiError, setToken } from '../lib/api';

const RotaAtual = () => {
  const { pathname } = useLocation();
  return <div data-testid="rota">{pathname}</div>;
};

const renderLogin = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <LoginView />
          <RotaAtual />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('LoginView', () => {
  it('exige e-mail e senha preenchidos antes de chamar a API', async () => {
    const usuario = userEvent.setup();
    renderLogin();

    await usuario.click(screen.getByRole('button', { name: /Entrar no painel/ }));

    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('faz login, guarda o token, cumprimenta e navega para /chamados', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.login).mockResolvedValue({
      token: 'jwt-de-mentira',
      user: { id: 1, username: 'joao.silva', email: 'joao@empresa.com', role: 'usuario' },
    });
    renderLogin();

    await usuario.type(screen.getByLabelText(/E-mail/), 'joao@empresa.com');
    await usuario.type(screen.getByLabelText(/Senha/), 'SenhaForte123');
    await usuario.click(screen.getByRole('button', { name: /Entrar no painel/ }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('joao@empresa.com', 'SenhaForte123');
    });
    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith('jwt-de-mentira');
    });
    expect(await screen.findByText('Bem-vindo, joao.silva.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('rota')).toHaveTextContent('/chamados');
    });
  });

  it('mostra a mensagem da API quando as credenciais são inválidas', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.login).mockRejectedValue(new ApiError('Email ou senha inválidos', 401));
    renderLogin();

    await usuario.type(screen.getByLabelText(/E-mail/), 'joao@empresa.com');
    await usuario.type(screen.getByLabelText(/Senha/), 'SenhaErrada');
    await usuario.click(screen.getByRole('button', { name: /Entrar no painel/ }));

    expect(await screen.findByText('Email ou senha inválidos')).toBeInTheDocument();
  });

  it('exibe estado de carregamento enquanto autentica', async () => {
    const usuario = userEvent.setup();
    vi.mocked(api.login).mockImplementation(
      () => new Promise(() => {}), // nunca resolve
    );
    renderLogin();

    await usuario.type(screen.getByLabelText(/E-mail/), 'joao@empresa.com');
    await usuario.type(screen.getByLabelText(/Senha/), 'SenhaForte123');
    await usuario.click(screen.getByRole('button', { name: /Entrar no painel/ }));

    expect(await screen.findByText('Autenticando…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Autenticando/ })).toBeDisabled();
  });
});
