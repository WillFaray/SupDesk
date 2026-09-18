// ErrorBoundary / RouteErrorBoundary: fallback padrão, reset manual, resetKey
// (usado na navegação) e fallback customizado.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary';

beforeEach(() => {
  // O boundary loga o erro capturado em componentDidCatch; silencia o console
  // (o React também avisa sobre o erro) para manter a saída do teste limpa.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Filho que explode no render enquanto `falhar` for true. Devolve também o
 * gatilho `liberar()` para simular a correção do problema antes do reset.
 */
function criarInstavel() {
  let falhar = true;
  const Componente = () => {
    if (falhar) throw new Error('Falha simulada de renderização');
    return <p>conteúdo recuperado</p>;
  };
  return { Componente, liberar: () => (falhar = false) };
}

describe('ErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>painel intacto</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('painel intacto')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('captura o erro do subtree e mostra o fallback com a mensagem', () => {
    const { Componente } = criarInstavel();

    render(
      <ErrorBoundary>
        <Componente />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Falha simulada de renderização')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recarregar aplicação/ })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('"Tentar de novo" limpa o erro e volta a renderizar os filhos', async () => {
    const usuario = userEvent.setup();
    const { Componente, liberar } = criarInstavel();
    render(
      <ErrorBoundary>
        <Componente />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    liberar();
    await usuario.click(screen.getByRole('button', { name: /Tentar de novo/ }));

    expect(screen.getByText('conteúdo recuperado')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('resetKey novo (navegação) descarta o erro capturado', () => {
    const { Componente, liberar } = criarInstavel();
    const { rerender } = render(
      <ErrorBoundary resetKey="/chamados">
        <Componente />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    liberar();
    rerender(
      <ErrorBoundary resetKey="/usuarios">
        <Componente />
      </ErrorBoundary>,
    );

    expect(screen.getByText('conteúdo recuperado')).toBeInTheDocument();
  });

  it('mantém o erro visível enquanto o resetKey não muda', () => {
    const { Componente } = criarInstavel();
    const { rerender } = render(
      <ErrorBoundary resetKey="/chamados">
        <Componente />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary resetKey="/chamados">
        <Componente />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('usa renderFallback customizado, entregando o erro e o reset', async () => {
    const usuario = userEvent.setup();
    const { Componente, liberar } = criarInstavel();
    render(
      <ErrorBoundary
        renderFallback={({ error, reset }) => (
          <div>
            <span>falhou: {error.message}</span>
            <button onClick={reset}>voltar</button>
          </div>
        )}
      >
        <Componente />
      </ErrorBoundary>,
    );

    expect(screen.getByText('falhou: Falha simulada de renderização')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();

    liberar();
    await usuario.click(screen.getByRole('button', { name: 'voltar' }));

    expect(screen.getByText('conteúdo recuperado')).toBeInTheDocument();
  });
});

describe('RouteErrorBoundary', () => {
  it('renderiza os filhos normalmente dentro do router', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <p>rota viva</p>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText('rota viva')).toBeInTheDocument();
  });

  it('isola a falha de uma rota sem derrubar o resto da árvore', () => {
    const { Componente } = criarInstavel();

    render(
      <MemoryRouter>
        <div>
          <span>fora do boundary</span>
          <RouteErrorBoundary>
            <Componente />
          </RouteErrorBoundary>
        </div>
      </MemoryRouter>,
    );

    expect(screen.getByText('fora do boundary')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });
});
