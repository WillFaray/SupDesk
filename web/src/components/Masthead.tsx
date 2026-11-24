import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import { useToast } from './Toast';

type Tema = 'light' | 'dark';

function temaAtual(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function aplicarTema(proximo: Tema) {
  document.documentElement.dataset.theme = proximo;
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = proximo === 'dark' ? '#0f1115' : '#f6f7f9';
}

export function Masthead() {
  const { user, sair } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tema, setTema] = useState<Tema>(temaAtual);

  useEffect(() => {
    function aoMudarStorage(e: StorageEvent) {
      if (e.key === 'supdesk-theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        aplicarTema(e.newValue);
        setTema(e.newValue);
      }
    }
    window.addEventListener('storage', aoMudarStorage);
    return () => window.removeEventListener('storage', aoMudarStorage);
  }, []);

  function alternarTema() {
    const proximo: Tema = tema === 'dark' ? 'light' : 'dark';
    aplicarTema(proximo);
    try {
      localStorage.setItem('supdesk-theme', proximo);
    } catch {
      // ignora erro caso armazenamento esteja bloqueado
    }
    setTema(proximo);
  }

  return (
    <header className="masthead">
      <div className="masthead__brand">
        <span className="masthead__mark">SupDesk</span>
      </div>

      <div className="masthead__search">
        <SearchBox />
      </div>

      {user && (
        <div className="masthead__user">
          <span className="masthead__user-name">{user.username}</span>
          <span className="masthead__user-role">{user.role}</span>
          <button
            className="btn btn--fantasma masthead__theme"
            onClick={alternarTema}
            title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            aria-label={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <Icon name={tema === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button
            className="btn btn--fantasma"
            onClick={() => {
              // Revoga o JWT no servidor (best-effort) e limpa a sessão local.
              void api.logout().catch(() => undefined);
              sair();
              toast.info('Sessão encerrada.');
              navigate('/login');
            }}
            title="Sair"
            aria-label="Sair"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
