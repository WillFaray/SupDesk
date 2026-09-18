// Componente Modal: abertura/fechamento, ESC, botões de ação e foco.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza nada quando fechado', () => {
    render(<Modal aberto={false} aoFechar={() => {}} titulo="Confirmação" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título, descrição e botões de ação quando aberto', () => {
    render(
      <Modal
        aberto
        aoFechar={() => {}}
        titulo="Excluir chamado"
        descricao="Esta ação não pode ser desfeita."
        acaoPrimaria={{ label: 'Excluir', onClick: () => {}, variante: 'perigosa' }}
        acaoSecundaria={{ label: 'Cancelar', onClick: () => {} }}
      />,
    );

    const dialogo = screen.getByRole('dialog', { name: 'Excluir chamado' });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('chama aoFechar com a tecla Escape', async () => {
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<Modal aberto aoFechar={aoFechar} titulo="Título" />);

    await usuario.keyboard('{Escape}');

    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it('fecha pelo botão de fechar (X)', async () => {
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<Modal aberto aoFechar={aoFechar} titulo="Título" />);

    await usuario.click(screen.getByRole('button', { name: 'Fechar modal' }));

    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it('clicar dentro do conteúdo NÃO fecha o modal', async () => {
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<Modal aberto aoFechar={aoFechar} titulo="Título" />);

    await usuario.click(screen.getByText('Título'));

    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('aciona a ação primária ao clicar', async () => {
    const aoConfirmar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <Modal
        aberto
        aoFechar={() => {}}
        titulo="Título"
        acaoPrimaria={{ label: 'Confirmar', onClick: aoConfirmar }}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(aoConfirmar).toHaveBeenCalledOnce();
  });

  it('desabilita a ação primária enquanto carrega', () => {
    render(
      <Modal
        aberto
        aoFechar={() => {}}
        titulo="Título"
        acaoPrimaria={{ label: 'Enviando', onClick: () => {}, carregando: true }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Enviando' })).toBeDisabled();
  });

  it('move o foco para o primeiro elemento focável ao abrir', () => {
    render(<Modal aberto aoFechar={() => {}} titulo="Título" />);
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveFocus();
  });
});
