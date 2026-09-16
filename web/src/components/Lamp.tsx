import type { ReactNode } from 'react';
import type { Prioridade, Status } from '../lib/types';
import type { Categoria } from '../lib/types';

export function Lamp({
  cor,
  acesa = true,
  size = 10,
}: {
  cor: string;
  acesa?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`lamp${acesa ? ' lamp--acesa' : ''}`}
      style={{ width: size, height: size, ['--lamp-color' as string]: cor }}
      aria-hidden="true"
    />
  );
}

export const corStatus: Record<Status, { cor: string; acesa: boolean }> = {
  Aberto: { cor: 'var(--lamp-aberto)', acesa: false },
  'Em andamento': { cor: 'var(--lamp-andamento)', acesa: true },
  Resolvido: { cor: 'var(--lamp-resolvido)', acesa: true },
};

export const corPrioridade: Record<Prioridade, string> = {
  Baixa: 'var(--prio-baixa)',
  Média: 'var(--prio-media)',
  Alta: 'var(--prio-alta)',
};

export const corCategoria: Record<Categoria, string> = {
  Hardware: 'var(--cat-hardware)',
  Software: 'var(--cat-software)',
  Rede: 'var(--cat-rede)',
  Outros: 'var(--cat-outros)',
};

export function LampStatus({ status }: { status: Status }) {
  const { cor, acesa } = corStatus[status];
  return <Lamp cor={cor} acesa={acesa} />;
}

export function Chip({ children, cor }: { children: ReactNode; cor?: string }) {
  return (
    <span className="chip">
      {cor && <Lamp cor={cor} acesa />}
      {children}
    </span>
  );
}
