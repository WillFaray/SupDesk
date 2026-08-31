import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';

export function Rail() {
  const { user } = useAuth();
  const isAnalista = user && (user.role === 'admin' || user.role === 'analista');

  return (
    <nav className="rail" aria-label="Navegação">
      <NavLink
        to="/chamados"
        className={({ isActive }) => `rail__item${isActive ? ' is-active' : ''}`}
      >
        <Icon name="queue" size={16} />
        Fila de chamados
      </NavLink>
      {isAnalista && (
        <NavLink
          to="/chamados?status=Em%20andamento"
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
    </nav>
  );
}