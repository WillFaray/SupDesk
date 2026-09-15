import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Masthead } from './Masthead';
import { Rail } from './Rail';

export function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-chrome">
      <Masthead />
      <div className="stage">
        <Rail />
        <main className="stage__main" id="conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
