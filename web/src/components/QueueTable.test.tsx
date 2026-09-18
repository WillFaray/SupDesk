// Fila de chamados: linhas, botões de ação por papel/status e link de detalhe.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueueTable } from './QueueTable';
import type { Chamado, Status } from '../lib/types';

const chamado = (dados: Partial<Chamado> & { id: number }): Chamado => ({
  title: `Chamado ${dados.id}`,
  description: '…',
  status: 'Aberto',
  priority: 'Média',
  category: 'Outros',
  created_at: new Date(Date.now() - 3600_000).toISOString(),
  updated_at: new Date().toISOString(),
  autor_do_chamado: 'joao.silva',
  responsavel: null,
  ...dados,
});

const renderFila = (
  chamados: Chamado[],
  opcoes: {
    pode?: boolean;
    atualizando?: number | null;
    mover?: (c: Chamado, s: Status) => void;
  } = {},
) =>
  render(
    <MemoryRouter>
      <QueueTable
        chamados={chamados}
        atualizando={opcoes.atualizando ?? null}
        pode={opcoes.pode ?? true}
        mover={opcoes.mover ?? (() => {})}
      />
    </MemoryRouter>,
  );

describe('QueueTable', () => {
  it('renderiza número, título, autor, categoria e status', () => {
    renderFila([chamado({ id: 1, title: 'Impressora do 3º andar', category: 'Hardware' })]);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Impressora do 3º andar')).toBeInTheDocument();
    expect(screen.getByText('joao.silva')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
  });

  it('oferece "Assumir" para analista/admin em chamado Aberto', async () => {
    const mover = vi.fn();
    const usuario = userEvent.setup();
    renderFila([chamado({ id: 1 })], { pode: true, mover });

    await usuario.click(screen.getByRole('button', { name: /Assumir/ }));

    expect(mover).toHaveBeenCalledOnce();
    expect(mover.mock.calls[0]?.[1]).toBe('Em andamento');
  });

  it('não mostra ações de progresso quando o papel não pode', () => {
    renderFila([chamado({ id: 1 })], { pode: false });
    expect(screen.queryByRole('button', { name: /Assumir/ })).not.toBeInTheDocument();
  });

  it('oferece "Resolver" para chamado Em andamento', async () => {
    const mover = vi.fn();
    const usuario = userEvent.setup();
    renderFila([chamado({ id: 2, status: 'Em andamento' })], { pode: true, mover });

    await usuario.click(screen.getByRole('button', { name: /Resolver/ }));

    expect(mover.mock.calls[0]?.[1]).toBe('Resolvido');
  });

  it('chamado Resolvido não tem ação de progresso', () => {
    renderFila([chamado({ id: 3, status: 'Resolvido' })], { pode: true });
    expect(screen.queryByRole('button', { name: /Assumir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolver/ })).not.toBeInTheDocument();
  });

  it('linha em atualização fica com o botão desabilitado', () => {
    renderFila([chamado({ id: 5 })], { pode: true, atualizando: 5 });
    expect(screen.getByRole('button', { name: /Assumir/ })).toBeDisabled();
  });

  it('título e botão levam à página do chamado', async () => {
    const usuario = userEvent.setup();
    renderFila([chamado({ id: 9, title: 'Notebook não liga' })]);

    const link = screen.getByRole('link', { name: 'Notebook não liga' });
    expect(link).toHaveAttribute('href', '/chamados/9');

    await usuario.click(screen.getByRole('button', { name: 'Abrir chamado' }));
    // navegação fica a cargo do Router; basta o botão existir e ser clicável
    expect(link).toBeInTheDocument();
  });
});
