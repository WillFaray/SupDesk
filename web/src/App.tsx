import { Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RouteErrorBoundary } from './components/ErrorBoundary';
import { RoleGuard } from './components/RoleGuard';
import { LoginView } from './views/LoginView';
import { QueueView } from './views/QueueView';
import { BoardView } from './views/BoardView';
import { TicketDetailView } from './views/TicketDetailView';
import { NewTicketView } from './views/NewTicketView';
import { UsersView } from './views/UsersView';

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RouteErrorBoundary>
            <LoginView />
          </RouteErrorBoundary>
        }
      />
      <Route element={<AppShell />}>
        <Route
          path="/chamados"
          element={
            <RouteErrorBoundary>
              <QueueView />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/chamados/novo"
          element={
            <RouteErrorBoundary>
              <NewTicketView />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/chamados/:id"
          element={
            <RouteErrorBoundary>
              <TicketDetailView />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/andamento"
          element={
            <RouteErrorBoundary>
              <BoardView />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RouteErrorBoundary>
              <RoleGuard papel="admin">
                <UsersView />
              </RoleGuard>
            </RouteErrorBoundary>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/chamados" replace />} />
    </Routes>
  );
}
