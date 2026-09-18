import { Link, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import type { Role } from '../lib/types';

/**
 * Guarda de rota por papel.
 *
 * Espelha o `requireRole` do backend: as rotas administrativas (ex.:/usuarios)
 * só renderizam para o papel exigido — quem não tem o papel vê a tela de
 * acesso negado em vez de uma página meio renderizada que só falharia no fetch.
 *
 * Importante: isto é UX, NÃO é a fronteira de segurança. O papel vive no
 * localStorage e a ferramenta de "troca temporária de papel" pode alterá-lo;
 * a autorização real é sempre do backend, que responde 403 (e agora consulta o
 * papel atual no banco, não o congelado no token).
 */
export function RoleGuard({ papel, children }: { papel: Role; children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== papel) {
    return <AcessoNegado papel={papel} />;
  }

  return <>{children}</>;
}

function AcessoNegado({ papel }: { papel: Role }) {
  return (
    <div className="panel-empty" role="alert">
      <Icon name="alert" size={28} />
      <p>
        <strong>Acesso negado</strong>
      </p>
      <p>
        Esta área é restrita ao papel <strong>{papel}</strong>. Seu perfil atual não tem permissão
        para visualizá-la.
      </p>
      <p style={{ marginTop: 14 }}>
        <Link className="btn" to="/chamados">
          Voltar à fila
        </Link>
      </p>
    </div>
  );
}
