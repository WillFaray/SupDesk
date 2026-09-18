// Utilidades de formatação de data/hora (lib/types.ts).
// As comparações de formatos usam a MESMA chamada Intl no teste → resultado
// determinístico em qualquer fuso horário/região da máquina.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempoDecorrido, txDate, txHora } from './types';

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
