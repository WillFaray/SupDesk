import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título, descrição e ícone padrão', () => {
    render(
      <EmptyState titulo="Nenhum item encontrado" descricao="Tente ajustar os filtros da busca." />,
    );

    expect(screen.getByRole('region', { name: 'Nenhum item encontrado' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    expect(screen.getByText('Tente ajustar os filtros da busca.')).toBeInTheDocument();
  });

  it('exibe papel alert quando variante é erro', () => {
    render(
      <EmptyState
        variante="erro"
        titulo="Falha de conexão"
        descricao="Servidor indisponível no momento."
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Falha de conexão')).toBeInTheDocument();
  });

  it('renderiza dica de ajuda quando informada', () => {
    render(
      <EmptyState
        titulo="Fila vazia"
        dica="Chamados criados por outros usuários aparecerão aqui."
      />,
    );

    expect(
      screen.getByText('Chamados criados por outros usuários aparecerão aqui.'),
    ).toBeInTheDocument();
  });

  it('dispara ações primária e secundária ao clicar', () => {
    const fnPrimaria = vi.fn();
    const fnSecundaria = vi.fn();

    render(
      <EmptyState
        titulo="Sem resultados"
        acaoPrimaria={{ label: 'Criar chamado', onClick: fnPrimaria, variante: 'primaria' }}
        acaoSecundaria={{ label: 'Limpar filtros', onClick: fnSecundaria }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Criar chamado' }));
    expect(fnPrimaria).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(fnSecundaria).toHaveBeenCalledOnce();
  });
});
