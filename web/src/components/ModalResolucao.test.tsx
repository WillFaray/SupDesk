import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalResolucao } from './ModalResolucao';

describe('ModalResolucao', () => {
  const aoFechar = vi.fn();
  const aoConfirmar = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando aberto é falso', () => {
    render(
      <ModalResolucao
        aberto={false}
        chamadoId={10}
        aoFechar={aoFechar}
        aoConfirmar={aoConfirmar}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza o modal com título e campo de justificativa', () => {
    render(
      <ModalResolucao aberto={true} chamadoId={42} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Concluir chamado #42')).toBeInTheDocument();
    expect(screen.getByLabelText(/Justificativa da resolução/)).toBeInTheDocument();
  });

  it('valida que a justificativa não pode ser vazia ou menor que 10 caracteres', async () => {
    const usuario = userEvent.setup();
    render(
      <ModalResolucao aberto={true} chamadoId={42} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />,
    );

    await usuario.click(screen.getByRole('button', { name: /Confirmar resolução/ }));
    expect(screen.getByText('A justificativa da resolução é obrigatória.')).toBeInTheDocument();
    expect(aoConfirmar).not.toHaveBeenCalled();

    await usuario.type(screen.getByLabelText(/Justificativa da resolução/), 'curta');
    await usuario.click(screen.getByRole('button', { name: /Confirmar resolução/ }));
    expect(
      screen.getByText('Informe uma justificativa com no mínimo 10 caracteres.'),
    ).toBeInTheDocument();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('submete com sucesso quando o texto atinge 10 caracteres e fecha o modal', async () => {
    const usuario = userEvent.setup();
    render(
      <ModalResolucao aberto={true} chamadoId={42} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />,
    );

    await usuario.type(
      screen.getByLabelText(/Justificativa da resolução/),
      'Cabo de rede substituído com sucesso no setor.',
    );
    await usuario.click(screen.getByRole('button', { name: /Confirmar resolução/ }));

    await waitFor(() =>
      expect(aoConfirmar).toHaveBeenCalledWith('Cabo de rede substituído com sucesso no setor.'),
    );
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it('permite cancelar sem submeter', async () => {
    const usuario = userEvent.setup();
    render(
      <ModalResolucao aberto={true} chamadoId={42} aoFechar={aoFechar} aoConfirmar={aoConfirmar} />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoFechar).toHaveBeenCalledOnce();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });
});
