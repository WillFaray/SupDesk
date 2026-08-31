import { Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoginView } from './views/LoginView';
import { QueueView } from './views/QueueView';
import { TicketDetailView } from './views/TicketDetailView';
import { NewTicketView } from './views/NewTicketView';
import { UsersView } from './views/UsersView';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route element={<AppShell />}>
        <Route path="/chamados" element={<QueueView />} />
        <Route path="/chamados/novo" element={<NewTicketView />} />
        <Route path="/chamados/:id" element={<TicketDetailView />} />
        <Route path="/usuarios" element={<UsersView />} />
      </Route>
      <Route path="*" element={<Navigate to="/chamados" replace />} />
    </Routes>
  );
}