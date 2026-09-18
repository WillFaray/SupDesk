// Contexto de autenticação: papel pode resolver, sessão expirada é descartada
// na inicialização e useAuth exige provider.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider, podeResolver, useAuth } from './auth';
import { ToastProvider } from '../components/Toast';
import type { ReactNode } from 'react';

describe('podeResolver', () => {
  it('admin e analista resolvem; usuário comum e anônimo não', () => {
    expect(podeResolver('admin')).toBe(true);
    expect(podeResolver('analista')).toBe(true);
    expect(podeResolver('usuario')).toBe(false);
    expect(podeResolver(undefined)).toBe(false);
  });
});

const Envolto = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  </MemoryRouter>
);

const Consumidor = () => {
  const { user } = useAuth();
  return <span>{user ? user.username : 'sem-sessao'}</span>;
};

beforeEach(() => {
  localStorage.clear();
});

describe('AuthProvider', () => {
  it('descarta sessão cujo token persistido já expirou', () => {
    // exp = 1000 s → janeiro de 1970 → sempre expirado.
    localStorage.setItem('supdesk_token', 'x.eyJleHAiOjEwMDB9');
    localStorage.setItem(
      'supdesk_user',
      JSON.stringify({ id: 1, username: 'ana', email: 'ana@empresa.com', role: 'admin' }),
    );

    render(
      <Envolto>
        <Consumidor />
      </Envolto>,
    );

    expect(screen.getByText('sem-sessao')).toBeInTheDocument();
    expect(localStorage.getItem('supdesk_token')).toBeNull();
    expect(localStorage.getItem('supdesk_user')).toBeNull();
  });

  it('mantém a sessão quando o token ainda é válido', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('supdesk_token', `x.${btoa(JSON.stringify({ exp }))}`);
    localStorage.setItem(
      'supdesk_user',
      JSON.stringify({ id: 1, username: 'ana', email: 'ana@empresa.com', role: 'admin' }),
    );

    render(
      <Envolto>
        <Consumidor />
      </Envolto>,
    );

    expect(screen.getByText('ana')).toBeInTheDocument();
  });

  it('useAuth fora do provider lança erro orientando o uso correto', () => {
    const Isolado = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Isolado />)).toThrow('useAuth deve ser usado dentro de <AuthProvider>');
  });
});
