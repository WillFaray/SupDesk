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
      <button onClick={() => toast.alerta('Atenção: verifique os dados')} type="button">
        disparar-alerta
      </button>
      <button onClick={() => toast.info('Dica do dia')} type="button">
        disparar-info
      </button>
      <button
        onClick={() =>
          toast.sucesso({
            titulo: 'Chamado #42 criado',
            mensagem: 'Registro salvo com sucesso',
            detalhe: 'Encaminhado para a fila de triagem.',
            acao: { label: 'Desfazer', onClick: vi.fn() },
          })
        }
        type="button"
      >
        disparar-rico
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

  it('exibe toast de alerta com mensagem e ícone apropriado', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-alerta'));
    expect(screen.getByText('Atenção: verifique os dados')).toBeInTheDocument();
  });

  it('exibe toast com opções ricas: título, mensagem, detalhe e botão de ação', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-rico'));
    expect(screen.getByText('Chamado #42 criado')).toBeInTheDocument();
    expect(screen.getByText('Registro salvo com sucesso')).toBeInTheDocument();
    expect(screen.getByText('Encaminhado para a fila de triagem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
  });

  it('pausa o fechamento automático ao passar o mouse por cima', () => {
    renderToasts();
    fireEvent.click(screen.getByText('disparar-sucesso'));
    const toastCard = screen.getByRole('status');

    fireEvent.mouseEnter(toastCard);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // Não deve sumir enquanto o mouse estiver sobre o toast
    expect(screen.getByText('Chamado criado!')).toBeInTheDocument();

    fireEvent.mouseLeave(toastCard);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Chamado criado!')).not.toBeInTheDocument();
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
