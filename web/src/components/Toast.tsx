import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type TipoToast = 'sucesso' | 'erro' | 'info';

interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

interface ToastCtx {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  info: (mensagem: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const DURACAO: Record<TipoToast, number> = {
  sucesso: 3500,
  info: 3500,
  erro: 5500,
};

const ICONE: Record<TipoToast, string> = {
  sucesso: 'check',
  erro: 'alert',
  info: 'info',
};

let proximoId = 1;

/**
 * Sistema de avisos (toasts) — pilha fixa no canto inferior direito,
 * com fechamento manual e auto-dismiss por tipo.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((tipo: TipoToast, mensagem: string) => {
    const id = proximoId++;
    // Mantém no máximo 5 visíveis, descartando as mais antigas.
    setToasts((atuais) => [...atuais.slice(-4), { id, tipo, mensagem }]);
    timers.current.set(id, setTimeout(() => remover(id), DURACAO[tipo]));
  }, [remover]);

  const value = useMemo<ToastCtx>(
    () => ({
      sucesso: (m) => push('sucesso', m),
      erro: (m) => push('erro', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-label="Notificações">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} fechar={() => remover(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, fechar }: { toast: ToastItem; fechar: () => void }) {
  return (
    <div className={`toast toast--${toast.tipo}`} role={toast.tipo === 'erro' ? 'alert' : 'status'}>
      <span className="toast__ic" aria-hidden="true">
        <Icon name={ICONE[toast.tipo]} size={16} />
      </span>
      <p className="toast__msg">{toast.mensagem}</p>
      <button className="toast__close" onClick={fechar} aria-label="Fechar notificação">
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}