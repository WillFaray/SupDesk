import { useUsuarios } from '../lib/data';
import { Icon } from '../components/Icon';
import { Lamp } from '../components/Lamp';
import { txDate } from '../lib/types';
import type { Role } from '../lib/types';

const corPapel: Record<Role, string> = {
  admin: 'var(--lamp-vermelha)',
  analista: 'var(--lamp-andamento)',
  usuario: 'var(--lamp-aberto)',
};

export function UsersView() {
  const { data, error, loading } = useUsuarios();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Usuários</h1>
          <p className="page-head__sub">
            {data ? `${data.length} credenciais no sistema` : 'carregando…'}
          </p>
        </div>
      </div>

      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      {loading && !data && (
        <div className="panel-empty"><Icon name="user" size={28} /><p><strong>Carregando…</strong></p></div>
      )}

      {data && (
        <div className="utable">
          <div className="utable__head">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Papel</span>
            <span>Desde</span>
          </div>
          {data.map((u) => (
            <div className="utable__row" key={u.id}>
              <div className="utable__cell">
                <span className="utable__name">{u.username}</span>
              </div>
              <div className="utable__cell">
                <span className="u-mono utable__mono">{u.email}</span>
              </div>
              <div className="utable__cell">
                <span className="queue__status">
                  <Lamp cor={corPapel[u.role]} acesa size={8} />
                  {u.role}
                </span>
              </div>
              <div className="utable__cell">
                <span className="u-mono utable__mono">{txDate(u.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}