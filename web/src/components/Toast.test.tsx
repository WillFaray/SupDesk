// Sistema de toasts: tipos, papel de acessibilidade, fechamento manual,
// auto-dismiss por tipo e limite de 5 na pilha.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function Disparador() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.sucesso('Chamado criado!')} type="button">
        disparar-sucesso
      </button>
      <button onClick={() => toast.erro('Falha na operação')} type="button">
        disparar-erro
      </button>
      <button onClick={() => toast.info('Dica do dia')} type="button">
        disparar-info
      </button>
    </div>
  );
}

const renderToasts = () =>
  render(
    <ToastProvider>
      <Disparador />
    </ToastProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('exibe toast de sucesso com papel status', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-sucesso'));
    expect(screen.getByText('Chamado criado!')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('exibe toast de erro com papel alert', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-erro'));
    expect(screen.getByText('Falha na operação')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('exibe toast de informação', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-info'));
    expect(screen.getByText('Dica do dia')).toBeInTheDocument();
  });

  it('fecha manualmente pelo botão X', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-sucesso'));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByText('Chamado criado!')).not.toBeInTheDocument();
  });

  it('sucesso some automaticamente após 3,5s e erro depois de 5,5s', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-sucesso'));
    fireEvent.click(screen.getByText('disparar-erro'));

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByText('Chamado criado!')).not.toBeInTheDocument();
    expect(screen.getByText('Falha na operação')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Falha na operação')).not.toBeInTheDocument();
  });

  it('mantém no máximo 5 toasts visíveis (descarta os mais antigos)', () => {
    renderToasts();
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('disparar-sucesso'));
    }
    expect(screen.getAllByText('Chamado criado!')).toHaveLength(5);
  });
});
