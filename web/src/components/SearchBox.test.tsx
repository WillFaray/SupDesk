// Busca do cabeçalho: número navega para o detalhe, texto navega para a fila
// filtrada, e campo vazio não navega.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SearchBox } from './SearchBox';

const RotaAtual = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="rota">{`${pathname}${search}`}</div>;
};

describe('SearchBox', () => {
  it('números navegam para o detalhe do chamado', async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <SearchBox />
        <RotaAtual />
      </MemoryRouter>,
    );

    const campo = screen.getByRole('searchbox');
    await usuario.type(campo, '123{enter}');

    expect(screen.getByTestId('rota')).toHaveTextContent('/chamados/123');
    expect(campo).toHaveValue('');
  });

  it('texto navega para a fila com a query codificada', async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <SearchBox />
        <RotaAtual />
      </MemoryRouter>,
    );

    const campo = screen.getByRole('searchbox');
    await usuario.type(campo, 'impressora quebrada{enter}');

    expect(screen.getByTestId('rota')).toHaveTextContent('/chamados?q=impressora%20quebrada');
  });

  it('enter com campo vazio não navega', async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/chamados']}>
        <SearchBox />
        <RotaAtual />
      </MemoryRouter>,
    );

    const campo = screen.getByRole('searchbox');
    await usuario.type(campo, '{enter}');

    expect(screen.getByTestId('rota')).toHaveTextContent('/chamados');
    expect(screen.queryByTestId('rota')).not.toHaveTextContent('?');
  });
});
