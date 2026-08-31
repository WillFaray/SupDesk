import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import type { Role } from '../lib/types';

const PAPEIS: { valor: Role; label: string }[] = [
  { valor: 'usuario', label: 'Usuário' },
  { valor: 'analista', label: 'Analista' },
  { valor: 'admin', label: 'Admin' },
];

export function Rail() {
  const { user, trocarPapel } = useAuth();
  const isAnalista = user && (user.role === 'admin' || user.role === 'analista');

  return (
    <nav className="rail" aria-label="Navegação">
      <div className="rail__group">
        <NavLink
          to="/chamados"
          className={({ isActive }) => `rail__item${isActive ? ' is-active' : ''}`}
        >
          <Icon name="queue" size={16} />
          Chamados
        </NavLink>
        {isAnalista && (
          <NavLink
            to="/andamento"
            className={({ isActive }) => `rail__item${isActive ? ' is-active' : ''}`}
          >
            <Icon name="bolt" size={16} />
            Em andamento
          </NavLink>
        )}
        {user && user.role === 'admin' && (
          <NavLink
            to="/usuarios"
            className={({ isActive }) => `rail__item${isActive ? ' is-active' : ''}`}
          >
            <Icon name="user" size={16} />
            Usuários
          </NavLink>
        )}
      </div>

      {user && (
        <div className="rail__foot">
          <span className="rail__label">Papel · troca temporária</span>
          <div className="rail__roles" role="group" aria-label="Trocar papel (temporário)">
            {PAPEIS.map((p) => (
              <button
                key={p.valor}
                type="button"
                className="rail__role"
                aria-pressed={user.role === p.valor}
                onClick={() => trocarPapel(p.valor)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}