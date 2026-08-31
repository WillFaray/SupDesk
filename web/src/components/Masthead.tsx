import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';

type Tema = 'light' | 'dark';

function temaAtual(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function Masthead() {
  const { user, sair } = useAuth();
  const navigate = useNavigate();
  const [tema, setTema] = useState<Tema>(temaAtual);

  function alternarTema() {
    const proximo: Tema = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = proximo;
    localStorage.setItem('supdesk-theme', proximo);
    setTema(proximo);
  }

  return (
    <header className="masthead">
      <div className="masthead__brand">
        <span className="masthead__mark">SupDesk</span>
      </div>

      <div className="masthead__search" role="search">
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
            onClick={() => { sair(); navigate('/login'); }}
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