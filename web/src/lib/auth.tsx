import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, UsuarioLogado } from './types';

export const IS_DEMO = (import.meta.env.VITE_DEMO as string) === 'true';

interface AuthCtx {
  user: UsuarioLogado | null;
  demo: boolean;
  entrar: (u: UsuarioLogado) => void;
  sair: () => void;
  /** Troca temporária de papel (ferramenta de demonstração/dev). */
  trocarPapel: (r: Role) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(() => {
    const raw = localStorage.getItem('supdesk_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioLogado;
    } catch {
      return null;
    }
  });

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      demo: IS_DEMO,
      entrar: (u) => {
        setUser(u);
        localStorage.setItem('supdesk_user', JSON.stringify(u));
      },
      sair: () => {
        setUser(null);
        localStorage.removeItem('supdesk_user');
        localStorage.removeItem('supdesk_token');
      },
      trocarPapel: (r) => {
        setUser((u) => (u ? { ...u, role: r } : u));
      },
    }),
    [user],
  );

  // Persistência (cobre também a troca temporária de papel).
  useEffect(() => {
    if (user) localStorage.setItem('supdesk_user', JSON.stringify(user));
  }, [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function podeResolver(role?: string): boolean {
  return role === 'admin' || role === 'analista';
}