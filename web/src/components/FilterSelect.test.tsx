// FilterSelect: abertura do listbox, seleção, marcação do valor atual e
// fechamento por ESC / clique fora.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterSelect } from './FilterSelect';

const opcoes = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'alta', label: 'Alta' },
  { valor: 'baixa', label: 'Baixa' },
] as const;

type Valor = (typeof opcoes)[number]['valor'];

describe('FilterSelect', () => {
  it('começa fechado e abre ao clicar, listando as opções', async () => {
    const usuario = userEvent.setup();
    render(
      <FilterSelect<Valor>
        label="Prioridade"
        opcoes={[...opcoes]}
        valor="todas"
        onChange={() => {}}
      />,
    );

    const gatilho = screen.getByRole('button', { name: 'Prioridade' });
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');

    await usuario.click(gatilho);

    expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Prioridade' });
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('marca a opção atual com aria-selected e reflete no botão (is-set)', async () => {
    const usuario = userEvent.setup();
    render(
      <FilterSelect<Valor>
        label="Prioridade"
        opcoes={[...opcoes]}
        valor="alta"
        onChange={() => {}}
      />,
    );

    const gatilho = screen.getByRole('button', { name: 'Prioridade' });
    expect(gatilho).toHaveClass('is-set');

    await usuario.click(gatilho);

    expect(screen.getByRole('option', { name: 'Alta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Baixa' })).toHaveAttribute('aria-selected', 'false');
  });

  it('dispara onChange com o valor escolhido e fecha a lista', async () => {
    const onChange = vi.fn();
    const usuario = userEvent.setup();
    render(
      <FilterSelect<Valor>
        label="Prioridade"
        opcoes={[...opcoes]}
        valor="todas"
        onChange={onChange}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Prioridade' }));
    await usuario.click(screen.getByRole('option', { name: /Baixa/ }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('baixa');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fecha com Escape sem escolher nada', async () => {
    const onChange = vi.fn();
    const usuario = userEvent.setup();
    render(
      <FilterSelect<Valor>
        label="Prioridade"
        opcoes={[...opcoes]}
        valor="todas"
        onChange={onChange}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Prioridade' }));
    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clique fora fecha a lista', async () => {
    const usuario = userEvent.setup();
    render(
      <div>
        <FilterSelect<Valor>
          label="Prioridade"
          opcoes={[...opcoes]}
          valor="todas"
          onChange={() => {}}
        />
        <div>área de fora</div>
      </div>,
    );

    await usuario.click(screen.getByRole('button', { name: 'Prioridade' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await usuario.click(screen.getByText('área de fora'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
