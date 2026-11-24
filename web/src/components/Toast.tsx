import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type TipoToast = 'sucesso' | 'erro' | 'alerta' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  titulo?: string;
  mensagem: string;
  detalhe?: string;
  acao?: ToastAction;
  duracao?: number;
}

export type ToastPayload = string | ToastOptions;

export interface ToastItem {
  id: number;
  tipo: TipoToast;
  titulo?: string;
  mensagem: string;
  detalhe?: string;
  acao?: ToastAction;
  duracao: number;
}

export interface ToastCtx {
  sucesso: (payload: ToastPayload) => void;
  erro: (payload: ToastPayload) => void;
  alerta: (payload: ToastPayload) => void;
  aviso: (payload: ToastPayload) => void;
  info: (payload: ToastPayload) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const DURACAO_PADRAO: Record<TipoToast, number> = {
  sucesso: 3500,
  info: 3500,
  alerta: 4500,
  erro: 5500,
};

const ICONE: Record<TipoToast, string> = {
  sucesso: 'check',
  erro: 'alert',
  alerta: 'alert',
  info: 'info',
};

let proximoId = 1;

/**
 * Sistema de avisos (toasts) aprimorado (P2.3):
 * - Suporte a mensagens simples e ricas (título, descrição, ação de clique e detalhe).
 * - Barra de progresso visual de duração.
 * - Pausa automática do temporizador no hover do mouse.
 * - Suporte a tipo 'alerta' / 'aviso' com cores semânticas.
 * - Totalmente compatível com as chamadas legadas (string).
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

  const iniciarTimer = useCallback(
    (id: number, duracao: number) => {
      const timerExistente = timers.current.get(id);
      if (timerExistente) clearTimeout(timerExistente);

      const novoTimer = setTimeout(() => remover(id), duracao);
      timers.current.set(id, novoTimer);
    },
    [remover],
  );

  const pausarTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tipo: TipoToast, payload: ToastPayload) => {
      const id = proximoId++;
      const opcoes: ToastOptions = typeof payload === 'string' ? { mensagem: payload } : payload;

      const duracao = opcoes.duracao ?? DURACAO_PADRAO[tipo];

      const item: ToastItem = {
        id,
        tipo,
        titulo: opcoes.titulo,
        mensagem: opcoes.mensagem,
        detalhe: opcoes.detalhe,
        acao: opcoes.acao,
        duracao,
      };

      // Mantém no máximo 5 visíveis, descartando as mais antigas.
      setToasts((atuais) => [...atuais.slice(-4), item]);
      iniciarTimer(id, duracao);
    },
    [iniciarTimer],
  );

  const value = useMemo<ToastCtx>(
    () => ({
      sucesso: (p) => push('sucesso', p),
      erro: (p) => push('erro', p),
      alerta: (p) => push('alerta', p),
      aviso: (p) => push('alerta', p),
      info: (p) => push('info', p),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-label="Notificações">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            fechar={() => remover(t.id)}
            aoPausar={() => pausarTimer(t.id)}
            aoRetomar={() => iniciarTimer(t.id, Math.max(1500, t.duracao))}
          />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastCard({
  toast,
  fechar,
  aoPausar,
  aoRetomar,
}: {
  toast: ToastItem;
  fechar: () => void;
  aoPausar: () => void;
  aoRetomar: () => void;
}) {
  const isAlert = toast.tipo === 'erro';

  return (
    <div
      className={`toast toast--${toast.tipo}`}
      role={isAlert ? 'alert' : 'status'}
      onMouseEnter={aoPausar}
      onMouseLeave={aoRetomar}
    >
      <span className="toast__ic" aria-hidden="true">
        <Icon name={ICONE[toast.tipo]} size={16} />
      </span>

      <div className="toast__body">
        {toast.titulo && <strong className="toast__titulo">{toast.titulo}</strong>}
        <p className="toast__msg">{toast.mensagem}</p>
        {toast.detalhe && <span className="toast__detalhe">{toast.detalhe}</span>}
        {toast.acao && (
          <button
            type="button"
            className="toast__acao-btn"
            onClick={() => {
              toast.acao?.onClick();
              fechar();
            }}
          >
            {toast.acao.label}
          </button>
        )}
      </div>

      <button className="toast__close" onClick={fechar} aria-label="Fechar notificação">
        <Icon name="x" size={13} />
      </button>

      <div
        className="toast__bar"
        style={{ animationDuration: `${toast.duracao}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
