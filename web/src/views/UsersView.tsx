import { useUsuarios } from '../lib/data';
import { Icon } from '../components/Icon';
import { Lamp } from '../components/Lamp';
import { txDate } from '../lib/types';
import type { Role } from '../lib/types';

const corPapel: Record<Role, string> = {
  admin: 'var(--lamp-vermelha)',
  analista: 'var(--lamp-amar)',
  usuario: 'var(--lamp-azul)',
};

export function UsersView() {
  const { data, error, loading } = useUsuarios();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">Usuários</h1>
          <p className="page-head__sub">
            {data ? `${data.length} credenciais no sistema` : 'lendo o registro…'}
          </p>
        </div>
      </div>

      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}

      {loading && !data && (
        <div className="panel-empty"><Icon name="user" size={28} /><p><strong>Lendo o registro…</strong></p></div>
      )}

      {data && (
        <div className="queue">
          <div className="queue__head">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Papel</span>
            <span>Desde</span>
          </div>
          {data.map((u) => (
            <div className="queue__row" key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 140px 120px' }}>
              <div className="queue__cell">
                <span className="queue__title" style={{ whiteSpace: 'normal' }}>{u.username}</span>
              </div>
              <div className="queue__cell">
                <span className="u-mono queue__wait">{u.email}</span>
              </div>
              <div className="queue__cell">
                <span className="queue__status">
                  <Lamp cor={corPapel[u.role]} acesa size={8} />
                  {u.role}
                </span>
              </div>
              <div className="queue__cell">
                <span className="u-mono queue__wait">{txDate(u.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}