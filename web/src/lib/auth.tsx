import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { definirAoNaoAutorizado, setToken } from './api';
import { useToast } from '../components/Toast';
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

const USER_KEY = 'supdesk_user';

function usuarioPersistido(): UsuarioLogado | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioLogado;
  } catch {
    return null;
  }
}

function tokenPersistidoExpirado(): boolean {
  const raw = localStorage.getItem('supdesk_token');
  if (!raw) return false;
  // O modo demo usa um token sintético (não-JWT): nada a validar.
  if (IS_DEMO) return false;
  try {
    const base64 = raw.split('.')[1];
    if (!base64) return true;
    const payload = JSON.parse(
      atob(base64.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')),
    ) as { exp?: number };
    return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioLogado | null>(() => {
    if (tokenPersistidoExpirado()) {
      localStorage.removeItem(USER_KEY);
      setToken(null);
      return null;
    }
    return usuarioPersistido();
  });

  const toast = useToast();
  const navigate = useNavigate();

  const expulsar = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    setToken(null);
  }, []);

  useEffect(() => {
    definirAoNaoAutorizado(() => {
      expulsar();
      toast.erro('Sessão expirada. Entre novamente para continuar.');
      navigate('/login', { replace: true });
    });
    return () => definirAoNaoAutorizado(null);
  }, [expulsar, toast, navigate]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      demo: IS_DEMO,
      entrar: (u) => {
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      },
      sair: expulsar,
      trocarPapel: (r) => {
        setUser((u) => (u ? { ...u, role: r } : u));
      },
    }),
    [user, expulsar],
  );

  // Persistência (cobre também a troca temporária de papel).
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
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
