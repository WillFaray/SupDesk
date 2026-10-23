import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkflowStepper } from './WorkflowStepper';
import type { Chamado } from '../lib/types';

const chamadoBase: Chamado = {
  id: 101,
  title: 'VPN não conecta',
  description: 'Falha intermitente',
  status: 'Aberto',
  priority: 'Alta',
  category: 'Rede',
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
  autor_do_chamado: 'julia.rocha',
  responsavel: null,
};

describe('WorkflowStepper', () => {
  it('renderiza o stepper com as 3 etapas para chamado aberto', () => {
    render(<WorkflowStepper chamado={chamadoBase} statusAtual="Aberto" />);

    expect(screen.getByRole('region', { name: 'Etapas do atendimento' })).toBeInTheDocument();
    expect(screen.getByText('1. Abertura')).toBeInTheDocument();
    expect(screen.getByText('2. Atendimento')).toBeInTheDocument();
    expect(screen.getByText('3. Resolução')).toBeInTheDocument();
    expect(screen.getByText(/julia\.rocha/)).toBeInTheDocument();
    expect(screen.getByText('Aguardando triagem')).toBeInTheDocument();
  });

  it('exibe dados do atendimento quando o chamado está em andamento', () => {
    const emAndamento: Chamado = {
      ...chamadoBase,
      status: 'Em andamento',
      responsavel: 'mariana.andrade',
      primeiro_atendimento_em: '2026-06-01T10:20:00Z',
    };

    render(<WorkflowStepper chamado={emAndamento} statusAtual="Em andamento" />);

    expect(screen.getByText('mariana.andrade')).toBeInTheDocument();
    expect(screen.getByText(/Espera: 20 min/)).toBeInTheDocument();
  });

  it('exibe justificativa da resolução e dados de conclusão quando resolvido', () => {
    const resolvido: Chamado = {
      ...chamadoBase,
      status: 'Resolvido',
      responsavel: 'mariana.andrade',
      primeiro_atendimento_em: '2026-06-01T10:20:00Z',
      resolvido_em: '2026-06-01T11:30:00Z',
      resolvido_por: 'mariana.andrade',
      resolucao: 'Certificado de segurança VPN renovado no cliente.',
    };

    render(<WorkflowStepper chamado={resolvido} statusAtual="Resolvido" />);

    expect(
      screen.getByText('Certificado de segurança VPN renovado no cliente.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Atendimento total: 1h 30m/)).toBeInTheDocument();
    expect(screen.getAllByText(/mariana\.andrade/)).toHaveLength(2);
  });
});
