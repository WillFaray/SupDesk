// Utilidades de formatação de data/hora (lib/types.ts).
// As comparações de formatos usam a MESMA chamada Intl no teste → resultado
// determinístico em qualquer fuso horário/região da máquina.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calcularResumoChamados,
  chamadoAtrasado,
  filtrarChamadosTexto,
  ordenarChamados,
  tempoDecorrido,
  txDate,
  txHora,
  type Chamado,
} from './types';

describe('txDate', () => {
  it('formata datas ISO no padrão pt-BR (dd/mm/aaaa)', () => {
    const iso = '2026-03-05T12:30:00Z';
    const esperado = new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    expect(txDate(iso)).toBe(esperado);
  });

  it('devolve a string original quando não é uma data', () => {
    expect(txDate('não-sou-uma-data')).toBe('não-sou-uma-data');
  });
});

describe('txHora', () => {
  it('formata data e hora no padrão pt-BR', () => {
    const iso = '2026-03-05T12:30:00Z';
    const esperado = new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(txHora(iso)).toBe(esperado);
  });

  it('devolve a string original quando não é uma data', () => {
    expect(txHora('jájá')).toBe('jájá');
  });
});

describe('tempoDecorrido', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra "agora" para menos de 1 minuto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(tempoDecorrido('2026-06-15T11:59:30Z')).toBe('agora');
  });

  it('mostra minutos até 1h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(tempoDecorrido('2026-06-15T11:30:00Z')).toBe('30 min');
  });

  it('mostra horas e minutos até 24h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(tempoDecorrido('2026-06-15T10:30:00Z')).toBe('1h 30m');
  });

  it('mostra dias a partir de 24h', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(tempoDecorrido('2026-06-13T12:00:00Z')).toBe('2d 0h');
  });

  it('mostra "—" para data inválida', () => {
    expect(tempoDecorrido('oi')).toBe('—');
  });
});

describe('filtros, ordenação e resumo de chamados', () => {
  const base: Chamado[] = [
    {
      id: 10,
      title: 'Falha na VPN corporativa',
      description: 'Desconecta a cada 5 minutos',
      status: 'Aberto',
      priority: 'Alta',
      category: 'Rede',
      created_at: '2026-06-10T10:00:00Z',
      updated_at: '2026-06-10T10:00:00Z',
      autor_do_chamado: 'julia.rocha',
      responsavel: null,
    },
    {
      id: 11,
      title: 'Instalar Office',
      description: 'Preciso do Excel e Word',
      status: 'Resolvido',
      priority: 'Baixa',
      category: 'Software',
      created_at: '2026-06-12T10:00:00Z',
      updated_at: '2026-06-12T12:00:00Z',
      autor_do_chamado: 'rafael.duarte',
      responsavel: 'mariana.andrade',
    },
    {
      id: 12,
      title: 'Impressora sem toner',
      description: 'Sala 214 comercial',
      status: 'Em andamento',
      priority: 'Média',
      category: 'Hardware',
      created_at: '2026-06-11T10:00:00Z',
      updated_at: '2026-06-11T11:00:00Z',
      autor_do_chamado: 'julia.rocha',
      responsavel: 'mariana.andrade',
    },
  ];

  it('filtra por título, descrição, autor, responsável, categoria ou #id', () => {
    expect(filtrarChamadosTexto(base, 'vpn').map((c) => c.id)).toEqual([10]);
    expect(filtrarChamadosTexto(base, 'excel').map((c) => c.id)).toEqual([11]);
    expect(filtrarChamadosTexto(base, 'mariana').map((c) => c.id)).toEqual([11, 12]);
    expect(filtrarChamadosTexto(base, '#12').map((c) => c.id)).toEqual([12]);
    expect(filtrarChamadosTexto(base, '   ').map((c) => c.id)).toEqual([10, 11, 12]);
  });

  it('ordena por prioridade, status e data', () => {
    expect(ordenarChamados(base, 'priority', 'desc').map((c) => c.priority)).toEqual([
      'Alta',
      'Média',
      'Baixa',
    ]);
    expect(ordenarChamados(base, 'priority', 'asc').map((c) => c.priority)).toEqual([
      'Baixa',
      'Média',
      'Alta',
    ]);
    expect(ordenarChamados(base, 'status', 'asc').map((c) => c.status)).toEqual([
      'Aberto',
      'Em andamento',
      'Resolvido',
    ]);
    expect(ordenarChamados(base, 'created_at', 'asc').map((c) => c.id)).toEqual([10, 12, 11]);
    expect(ordenarChamados(base, 'created_at', 'desc').map((c) => c.id)).toEqual([11, 12, 10]);
  });

  it('calcula o resumo operacional de chamados e atraso >24h', () => {
    expect(calcularResumoChamados(base)).toEqual({
      total: 3,
      abertos: 1,
      emAndamento: 1,
      resolvidos: 1,
      altaPrioridade: 1,
    });

    const antigo = new Date(Date.now() - 30 * 3600_000).toISOString();
    expect(chamadoAtrasado(antigo, 'Aberto')).toBe(true);
    expect(chamadoAtrasado(antigo, 'Resolvido')).toBe(false);
    expect(chamadoAtrasado('invalido', 'Aberto')).toBe(false);
  });
});
