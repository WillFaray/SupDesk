// RoleGuard: libera o conteúdo para o papel correto, mostra "Acesso negado"
// para papel insuficiente (sem sequer renderizar a view) e manda ao login
// quando não há sessão.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoleGuard } from './RoleGuard';
import { AuthProvider } from '../lib/auth';
import { ToastProvider } from './Toast';
import type { Role } from '../lib/types';

const sessaoDe = (role: Role) => ({
  id: 1,
  username: 'ana.admin',
  email: 'ana@empresa.com',
  role,
});

/** Monta /usuarios com a guarda e rotas de destino para observar redirects. */
function renderRota(papelExigido: Role) {
  render(
    <MemoryRouter initialEntries={['/usuarios']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/usuarios"
              element={
                <RoleGuard papel={papelExigido}>
                  <p>conteúdo administrativo</p>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<p>tela de login</p>} />
            <Route path="/chamados" element={<p>fila de chamados</p>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('RoleGuard', () => {
  it('libera o conteúdo quando o papel confere', () => {
    localStorage.setItem('supdesk_user', JSON.stringify(sessaoDe('admin')));

    renderRota('admin');

    expect(screen.getByText('conteúdo administrativo')).toBeInTheDocument();
    expect(screen.queryByText('Acesso negado')).not.toBeInTheDocument();
  });

  it('mostra acesso negado e NÃO renderiza a view para usuário comum', () => {
    localStorage.setItem('supdesk_user', JSON.stringify(sessaoDe('usuario')));

    renderRota('admin');

    expect(screen.getByRole('alert')).toHaveTextContent('Esta área é restrita ao papel admin.');
    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo administrativo')).not.toBeInTheDocument();
  });

  it('bloqueia também o papel analista na área de admin', () => {
    localStorage.setItem('supdesk_user', JSON.stringify(sessaoDe('analista')));

    renderRota('admin');

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo administrativo')).not.toBeInTheDocument();
  });

  it('redireciona para o login quando não há sessão', () => {
    renderRota('admin');

    expect(screen.getByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo administrativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesso negado')).not.toBeInTheDocument();
  });

  it('oferece caminho de volta para a fila na tela de acesso negado', () => {
    localStorage.setItem('supdesk_user', JSON.stringify(sessaoDe('usuario')));

    renderRota('admin');

    expect(screen.getByRole('link', { name: 'Voltar à fila' })).toHaveAttribute(
      'href',
      '/chamados',
    );
  });
});
